import { NextRequest, NextResponse } from "next/server";
import { renderCaptionVideo, RenderError } from "@/lib/renderer";
import { renderOutputPath, toPublicVideoUrl } from "@/lib/paths";
import { loadProject, saveProject } from "@/lib/project";
import type { Caption, CaptionStyle } from "@/types/caption";

interface RenderJob {
  progress: number;
  status: "rendering" | "done" | "error";
  error?: string;
  renderUrl?: string;
}

const jobs = new Map<string, RenderJob>();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, captions, style } = body as {
    projectId: string;
    captions: Caption[];
    style: CaptionStyle;
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

  const outputPath = renderOutputPath(projectId);
  jobs.set(projectId, { progress: 0, status: "rendering" });

  // The Remotion renderer's compositor needs an HTTP-reachable URL for the video asset
  // (a local filesystem path isn't fetchable), so we serve it from our own media route.
  const videoSrc = new URL(
    toPublicVideoUrl(projectId, project.video.fileName),
    request.nextUrl.origin
  ).toString();

  renderCaptionVideo(
    {
      videoSrc,
      captions: project.captions,
      style: project.style,
      width: project.video.width,
      height: project.video.height,
      fps: project.video.fps,
      durationInSeconds: project.video.durationInSeconds,
    },
    outputPath,
    (progress) => {
      const job = jobs.get(projectId);
      if (job) job.progress = progress;
    }
  )
    .then(() => {
      const renderUrl = `/api/media/renders/${projectId}/final.mp4`;
      jobs.set(projectId, { progress: 1, status: "done", renderUrl });
      const p = loadProject(projectId);
      if (p) {
        p.status = "rendered";
        p.renderPath = outputPath;
        p.updatedAt = new Date().toISOString();
        saveProject(p);
      }
    })
    .catch((err) => {
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
