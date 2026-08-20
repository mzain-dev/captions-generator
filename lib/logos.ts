import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { STORAGE_ROOT, PUBLIC_MEDIA_ROOT } from "@/lib/paths";
import type { LogoAsset } from "@/types/logo";

const registryPath = () => path.join(STORAGE_ROOT, "logos.json");
const logosDir = () => path.join(PUBLIC_MEDIA_ROOT, "logos");

const FORMAT_BY_EXT: Record<string, LogoAsset["format"]> = {
  ".png": "png",
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".webp": "webp",
  ".svg": "svg",
};

export class LogoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogoUploadError";
  }
}

export function listLogos(): LogoAsset[] {
  if (!fs.existsSync(registryPath())) return [];
  return JSON.parse(fs.readFileSync(registryPath(), "utf-8")) as LogoAsset[];
}

function saveRegistry(logos: LogoAsset[]): void {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  fs.writeFileSync(registryPath(), JSON.stringify(logos, null, 2));
}

export function logoFilePath(logo: LogoAsset): string {
  return path.join(logosDir(), `${logo.id}${path.extname(logo.fileName)}`);
}

export function toPublicLogoUrl(logo: LogoAsset): string {
  return `/media/logos/${logo.id}${path.extname(logo.fileName)}`;
}

export async function saveLogo(file: File): Promise<LogoAsset> {
  const ext = path.extname(file.name).toLowerCase();
  const format = FORMAT_BY_EXT[ext];
  if (!format) {
    throw new LogoUploadError("Unsupported image format. Use PNG, JPEG, WEBP, or SVG.");
  }

  const id = `logo_${randomUUID().slice(0, 8)}`;
  fs.mkdirSync(logosDir(), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(logosDir(), `${id}${ext}`), buffer);

  const logo: LogoAsset = {
    id,
    name: file.name.replace(ext, ""),
    fileName: file.name,
    format,
    createdAt: new Date().toISOString(),
  };

  saveRegistry([...listLogos(), logo]);
  return logo;
}

export function deleteLogo(logoId: string): void {
  const logos = listLogos();
  const logo = logos.find((l) => l.id === logoId);
  if (logo) {
    fs.rmSync(logoFilePath(logo), { force: true });
  }
  saveRegistry(logos.filter((l) => l.id !== logoId));
}
