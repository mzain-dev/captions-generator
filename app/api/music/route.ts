import { NextRequest, NextResponse } from "next/server";
import { listMusic, saveMusicTrack, MusicUploadError } from "@/lib/music";

export async function GET() {
  return NextResponse.json({ tracks: listMusic() });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("music");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }

  try {
    const track = await saveMusicTrack(file);
    return NextResponse.json({ track });
  } catch (err) {
    const message = err instanceof MusicUploadError ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const runtime = "nodejs";
