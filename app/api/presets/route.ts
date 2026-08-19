import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listPresets, savePreset } from "@/lib/presets";
import type { CaptionStyle } from "@/types/caption";

export async function GET() {
  return NextResponse.json({ presets: listPresets() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name?: string; style?: CaptionStyle };

  if (!body.name || !body.style) {
    return NextResponse.json({ error: "name and style are required." }, { status: 400 });
  }

  const preset = {
    id: `preset_${randomUUID().slice(0, 8)}`,
    name: body.name,
    style: body.style,
    createdAt: new Date().toISOString(),
  };
  savePreset(preset);

  return NextResponse.json({ preset });
}

export const runtime = "nodejs";
