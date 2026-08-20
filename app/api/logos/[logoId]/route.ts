import { NextRequest, NextResponse } from "next/server";
import { deleteLogo } from "@/lib/logos";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ logoId: string }> }
) {
  const { logoId } = await params;
  deleteLogo(logoId);
  return NextResponse.json({ deleted: true });
}

export const runtime = "nodejs";
