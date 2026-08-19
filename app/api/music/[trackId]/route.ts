import { NextRequest, NextResponse } from "next/server";
import { deleteMusicTrack } from "@/lib/music";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params;
  deleteMusicTrack(trackId);
  return NextResponse.json({ deleted: true });
}

export const runtime = "nodejs";
