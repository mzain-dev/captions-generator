import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import { loadProject } from "@/lib/project";
import { projectRenderDir, transcriptJsonPath } from "@/lib/paths";
import { listFonts } from "@/lib/fonts";
import { listMusic } from "@/lib/music";
import { listLogos, logoFilePath } from "@/lib/logos";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = loadProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (err: Error) => {
    console.error("Archive error for", projectId, ":", err);
  });

  archive.append(JSON.stringify(project, null, 2), { name: "project.json" });

  if (project.video && fs.existsSync(project.video.path)) {
    archive.file(project.video.path, { name: `video/${project.video.fileName}` });
  }
  if (project.audioPath && fs.existsSync(project.audioPath)) {
    archive.file(project.audioPath, { name: `audio/${path.basename(project.audioPath)}` });
  }
  const transcriptPath = transcriptJsonPath(projectId);
  if (fs.existsSync(transcriptPath)) {
    archive.file(transcriptPath, { name: "transcript.json" });
  }
  for (const entry of project.renderHistory ?? []) {
    const filePath = path.join(projectRenderDir(projectId), entry.fileName);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: `renders/${entry.fileName}` });
    }
  }

  // Bundle the specific custom assets this project actually uses, so restoring the zip
  // elsewhere is self-contained rather than depending on the app's shared asset library.
  if (project.style.fontFamily.startsWith("CustomFont_")) {
    const fontId = project.style.fontFamily.replace("CustomFont_", "");
    const font = listFonts().find((f) => f.id === fontId);
    if (font) {
      const filePath = path.join(
        process.cwd(),
        "public",
        "media",
        "fonts",
        `${font.id}${path.extname(font.fileName)}`
      );
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `assets/fonts/${font.fileName}` });
      }
    }
  }
  if (project.musicTrackId) {
    const track = listMusic().find((t) => t.id === project.musicTrackId);
    if (track) {
      const filePath = path.join(
        process.cwd(),
        "public",
        "media",
        "music",
        `${track.id}${path.extname(track.fileName)}`
      );
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `assets/music/${track.fileName}` });
      }
    }
  }
  if (project.logo?.logoId) {
    const logo = listLogos().find((l) => l.id === project.logo?.logoId);
    if (logo) {
      const filePath = logoFilePath(logo);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `assets/logo/${logo.fileName}` });
      }
    }
  }

  archive.finalize();

  const safeName = project.name.replace(/[^a-z0-9_\- ]/gi, "_") || projectId;

  return new NextResponse(Readable.toWeb(archive) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 300;
