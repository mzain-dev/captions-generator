import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { STORAGE_ROOT, PUBLIC_MEDIA_ROOT } from "@/lib/paths";
import type { CustomFont } from "@/types/font";

const registryPath = () => path.join(STORAGE_ROOT, "fonts.json");
const fontsDir = () => path.join(PUBLIC_MEDIA_ROOT, "fonts");

const FORMAT_BY_EXT: Record<string, CustomFont["format"]> = {
  ".ttf": "truetype",
  ".otf": "opentype",
  ".woff": "woff",
  ".woff2": "woff2",
};

export class FontUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FontUploadError";
  }
}

export function listFonts(): CustomFont[] {
  if (!fs.existsSync(registryPath())) return [];
  return JSON.parse(fs.readFileSync(registryPath(), "utf-8")) as CustomFont[];
}

function saveRegistry(fonts: CustomFont[]): void {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  fs.writeFileSync(registryPath(), JSON.stringify(fonts, null, 2));
}

export function toPublicFontUrl(font: CustomFont): string {
  return `/media/fonts/${font.id}${path.extname(font.fileName)}`;
}

export async function saveCustomFont(file: File): Promise<CustomFont> {
  const ext = path.extname(file.name).toLowerCase();
  const format = FORMAT_BY_EXT[ext];
  if (!format) {
    throw new FontUploadError("Unsupported font format. Use .ttf, .otf, .woff, or .woff2.");
  }

  const id = `font_${randomUUID().slice(0, 8)}`;
  fs.mkdirSync(fontsDir(), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(fontsDir(), `${id}${ext}`), buffer);

  const font: CustomFont = {
    id,
    name: file.name.replace(ext, ""),
    family: `CustomFont_${id}`,
    fileName: file.name,
    format,
    createdAt: new Date().toISOString(),
  };

  saveRegistry([...listFonts(), font]);
  return font;
}

export function deleteCustomFont(fontId: string): void {
  const fonts = listFonts();
  const font = fonts.find((f) => f.id === fontId);
  if (font) {
    const filePath = path.join(fontsDir(), `${font.id}${path.extname(font.fileName)}`);
    fs.rmSync(filePath, { force: true });
  }
  saveRegistry(fonts.filter((f) => f.id !== fontId));
}
