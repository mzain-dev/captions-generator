import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { loadProject, saveProject, deleteProject } from "@/lib/project";
import { projectVideoDir, projectAudioDir, projectTranscriptDir, projectRenderDir } from "@/lib/paths";
import type { Caption, CaptionStyle } from "@/types/caption";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = loadProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = loadProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    captions?: Caption[];
    style?: CaptionStyle;
    musicTrackId?: string | null;
    musicVolume?: number;
  };

  if (body.name !== undefined) project.name = body.name;
  if (body.captions !== undefined) project.captions = body.captions;
  if (body.style !== undefined) project.style = body.style;
  if (body.musicTrackId !== undefined) project.musicTrackId = body.musicTrackId ?? undefined;
  if (body.musicVolume !== undefined) project.musicVolume = body.musicVolume;
  project.updatedAt = new Date().toISOString();

  saveProject(project);
  return NextResponse.json({ project });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = loadProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  for (const dir of [
    projectVideoDir(projectId),
    projectAudioDir(projectId),
    projectTranscriptDir(projectId),
    projectRenderDir(projectId),
  ]) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  deleteProject(projectId);

  return NextResponse.json({ deleted: true });
}

export const runtime = "nodejs";
