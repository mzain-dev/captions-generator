import { NextRequest, NextResponse } from "next/server";
import { listLogos, saveLogo, LogoUploadError } from "@/lib/logos";

export async function GET() {
  return NextResponse.json({ logos: listLogos() });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("logo");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }

  try {
    const logo = await saveLogo(file);
    return NextResponse.json({ logo });
  } catch (err) {
    const message = err instanceof LogoUploadError ? err.message : "Logo upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const runtime = "nodejs";
