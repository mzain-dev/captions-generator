import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { probeVideo, normalizeVideo, FFmpegError } from "@/lib/ffmpeg";
import { originalVideoPath, projectVideoDir, toPublicVideoUrl } from "@/lib/paths";
import { saveProject } from "@/lib/project";
import { DEFAULT_CAPTION_STYLE } from "@/types/caption";
import type { ProjectData } from "@/types/project";

const ALLOWED_EXTENSIONS = new Set([".mp4", ".mov"]);
const ALLOWED_MIME_TYPES = new Set(["video/mp4", "video/quicktime"]);
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("video");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No video file provided." }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const mimeOk = ALLOWED_MIME_TYPES.has(file.type) || ALLOWED_EXTENSIONS.has(ext);
    if (!mimeOk || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Unsupported format. Please upload an MP4 or MOV file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 500MB." },
        { status: 400 }
      );
    }

    const projectId = `project_${randomUUID().slice(0, 8)}`;
    fs.mkdirSync(projectVideoDir(projectId), { recursive: true });

    const rawPath = path.join(projectVideoDir(projectId), `raw${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(rawPath, buffer);

    let rawProbe;
    try {
      rawProbe = await probeVideo(rawPath);
    } catch (err) {
      fs.rmSync(projectVideoDir(projectId), { recursive: true, force: true });
      const message =
        err instanceof FFmpegError ? err.message : "The uploaded file appears to be corrupt.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Normalize to a constant-frame-rate H.264/AAC MP4. Arbitrary uploads can have GOP
    // structures that make Remotion's renderer fail to seek partway through the file;
    // re-encoding up front avoids that and also guarantees browser-playable output.
    const destPath = originalVideoPath(projectId, ".mp4");
    let probe;
    try {
      await normalizeVideo(rawPath, destPath, rawProbe.fps);
      probe = await probeVideo(destPath);
    } catch (err) {
      fs.rmSync(projectVideoDir(projectId), { recursive: true, force: true });
      const message =
        err instanceof FFmpegError ? err.message : "Failed to process the uploaded video.";
      return NextResponse.json({ error: message }, { status: 500 });
    } finally {
      fs.rmSync(rawPath, { force: true });
    }

    const fileName = path.basename(destPath);
    const project: ProjectData = {
      projectId,
      name: file.name.replace(ext, ""),
      status: "uploaded",
      video: {
        fileName,
        path: destPath,
        width: probe.width,
        height: probe.height,
        fps: probe.fps,
        durationInSeconds: probe.durationInSeconds,
      },
      captions: [],
      style: DEFAULT_CAPTION_STYLE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProject(project);

    return NextResponse.json({
      projectId,
      videoUrl: toPublicVideoUrl(projectId, fileName),
      video: project.video,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed unexpectedly. Please try again." },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
