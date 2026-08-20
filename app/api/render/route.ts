import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { renderCaptionVideo, RenderError } from "@/lib/renderer";
import { renderOutputPath, toPublicVideoUrl, toPublicRenderUrl, projectRenderDir } from "@/lib/paths";
import { loadProject, saveProject } from "@/lib/project";
import { listFonts, toPublicFontUrl } from "@/lib/fonts";
import { listMusic, toPublicMusicUrl } from "@/lib/music";
import { listLogos, toPublicLogoUrl } from "@/lib/logos";
import type { Caption, CaptionStyle } from "@/types/caption";
import type { RenderHistoryEntry } from "@/types/project";

interface RenderJob {
  progress: number;
  status: "rendering" | "done" | "error";
  error?: string;
  renderUrl?: string;
}

const jobs = new Map<string, RenderJob>();

// Keep disk usage bounded for a feature whose whole point is accumulating files over time.
const MAX_RENDER_HISTORY = 15;

type CropAspect = "original" | "9:16" | "1:1" | "16:9";

/** Target composition dimensions for each platform preset; the video crops-to-fill via CSS. */
function resolveCropDimensions(
  aspect: CropAspect | undefined,
  original: { width: number; height: number }
): { width: number; height: number } {
  switch (aspect) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "16:9":
      return { width: 1920, height: 1080 };
    default:
      return original;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, captions, style, cropAspect } = body as {
    projectId: string;
    captions: Caption[];
    style: CaptionStyle;
    cropAspect?: CropAspect;
  };

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const project = loadProject(projectId);
  if (!project || !project.video) {
    return NextResponse.json({ error: "Project or video not found." }, { status: 404 });
  }

  if (jobs.get(projectId)?.status === "rendering") {
    return NextResponse.json({ error: "A render is already in progress for this project." }, { status: 409 });
  }

  project.captions = captions ?? project.captions;
  project.style = style ?? project.style;
  project.status = "rendering";
  saveProject(project);

  const renderId = randomUUID().slice(0, 8);
  const outputPath = renderOutputPath(projectId, renderId);
  jobs.set(projectId, { progress: 0, status: "rendering" });

  // The Remotion renderer's compositor needs an HTTP-reachable URL for the video asset
  // (a local filesystem path isn't fetchable), so we serve it via Next's static file
  // handler from public/media rather than a custom route.
  const videoSrc = new URL(
    toPublicVideoUrl(projectId, project.video.fileName),
    request.nextUrl.origin
  ).toString();

  const targetDimensions = resolveCropDimensions(cropAspect, {
    width: project.video.width,
    height: project.video.height,
  });

  const customFonts = listFonts().map((font) => ({
    family: font.family,
    url: new URL(toPublicFontUrl(font), request.nextUrl.origin).toString(),
    format: font.format,
  }));

  const musicTrack = project.musicTrackId
    ? listMusic().find((t) => t.id === project.musicTrackId)
    : undefined;
  const musicSrc = musicTrack
    ? new URL(toPublicMusicUrl(musicTrack), request.nextUrl.origin).toString()
    : undefined;

  const logoAsset = project.logo?.logoId
    ? listLogos().find((l) => l.id === project.logo?.logoId)
    : undefined;
  const logoProp =
    logoAsset && project.logo
      ? {
          logoSrc: new URL(toPublicLogoUrl(logoAsset), request.nextUrl.origin).toString(),
          x: project.logo.x,
          y: project.logo.y,
          scale: project.logo.scale,
          opacity: project.logo.opacity,
          backgroundColor: project.logo.backgroundColor,
          backgroundOpacity: project.logo.backgroundOpacity,
          backgroundPadding: project.logo.backgroundPadding,
        }
      : undefined;

  const introProp = project.intro?.enabled ? project.intro : undefined;
  const outroProp = project.outro?.enabled ? project.outro : undefined;

  renderCaptionVideo(
    {
      videoSrc,
      captions: project.captions,
      style: project.style,
      width: targetDimensions.width,
      height: targetDimensions.height,
      fps: project.video.fps,
      durationInSeconds: project.video.durationInSeconds,
      customFonts,
      musicSrc,
      musicVolume: project.musicVolume,
      musicDurationInSeconds: musicTrack?.durationInSeconds,
      logo: logoProp,
      intro: introProp,
      outro: outroProp,
    },
    outputPath,
    (progress) => {
      const job = jobs.get(projectId);
      if (job) job.progress = progress;
    }
  )
    .then(() => {
      const renderUrl = toPublicRenderUrl(projectId, renderId);
      jobs.set(projectId, { progress: 1, status: "done", renderUrl });
      const p = loadProject(projectId);
      if (p) {
        p.status = "rendered";
        p.renderPath = outputPath;
        p.error = undefined;
        p.updatedAt = new Date().toISOString();

        const entry: RenderHistoryEntry = {
          id: renderId,
          fileName: path.basename(outputPath),
          url: renderUrl,
          cropAspect: cropAspect ?? "original",
          createdAt: new Date().toISOString(),
        };
        const history = [...(p.renderHistory ?? []), entry];
        while (history.length > MAX_RENDER_HISTORY) {
          const removed = history.shift();
          if (removed) {
            fs.rmSync(path.join(projectRenderDir(projectId), removed.fileName), { force: true });
          }
        }
        p.renderHistory = history;

        saveProject(p);
      }
    })
    .catch((err) => {
      console.error("Render failed for", projectId, ":", err);
      if (err instanceof RenderError && err.cause) {
        console.error("Underlying cause:", err.cause);
      }
      const message = err instanceof RenderError ? err.message : "Rendering failed unexpectedly.";
      jobs.set(projectId, { progress: 0, status: "error", error: message });
      const p = loadProject(projectId);
      if (p) {
        p.status = "error";
        p.error = message;
        saveProject(p);
      }
    });

  return NextResponse.json({ started: true });
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const job = jobs.get(projectId);
  if (!job) {
    return NextResponse.json({ status: "idle", progress: 0 });
  }

  return NextResponse.json(job);
}

export const runtime = "nodejs";
export const maxDuration = 800;
