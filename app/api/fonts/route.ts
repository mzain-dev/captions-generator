import { NextRequest, NextResponse } from "next/server";
import { listFonts, saveCustomFont, FontUploadError } from "@/lib/fonts";

export async function GET() {
  return NextResponse.json({ fonts: listFonts() });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("font");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No font file provided." }, { status: 400 });
  }

  try {
    const font = await saveCustomFont(file);
    return NextResponse.json({ font });
  } catch (err) {
    const message = err instanceof FontUploadError ? err.message : "Font upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const runtime = "nodejs";
