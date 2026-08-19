import { NextRequest, NextResponse } from "next/server";
import { deletePreset } from "@/lib/presets";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const { presetId } = await params;
  deletePreset(presetId);
  return NextResponse.json({ deleted: true });
}

export const runtime = "nodejs";
