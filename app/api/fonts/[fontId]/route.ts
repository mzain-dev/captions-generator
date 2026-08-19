import { NextRequest, NextResponse } from "next/server";
import { deleteCustomFont } from "@/lib/fonts";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fontId: string }> }
) {
  const { fontId } = await params;
  deleteCustomFont(fontId);
  return NextResponse.json({ deleted: true });
}

export const runtime = "nodejs";
