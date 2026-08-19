import { NextRequest, NextResponse } from "next/server";
import { loadProject } from "@/lib/project";
import { captionsToSrt, captionsToVtt } from "@/lib/subtitles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const format = request.nextUrl.searchParams.get("format") === "vtt" ? "vtt" : "srt";

  const project = loadProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = format === "vtt" ? captionsToVtt(project.captions) : captionsToSrt(project.captions);
  const contentType = format === "vtt" ? "text/vtt" : "application/x-subrip";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${project.name}.${format}"`,
    },
  });
}

export const runtime = "nodejs";
