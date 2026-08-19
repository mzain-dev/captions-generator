import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { STORAGE_ROOT, PUBLIC_MEDIA_ROOT } from "@/lib/paths";
import type { MusicTrack } from "@/types/music";

const registryPath = () => path.join(STORAGE_ROOT, "music.json");
const musicDir = () => path.join(PUBLIC_MEDIA_ROOT, "music");

const ALLOWED_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac"]);

export class MusicUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MusicUploadError";
  }
}

export function listMusic(): MusicTrack[] {
  if (!fs.existsSync(registryPath())) return [];
  return JSON.parse(fs.readFileSync(registryPath(), "utf-8")) as MusicTrack[];
}

function saveRegistry(tracks: MusicTrack[]): void {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  fs.writeFileSync(registryPath(), JSON.stringify(tracks, null, 2));
}

export function toPublicMusicUrl(track: MusicTrack): string {
  return `/media/music/${track.id}${path.extname(track.fileName)}`;
}

export async function saveMusicTrack(file: File): Promise<MusicTrack> {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new MusicUploadError("Unsupported audio format. Use MP3, WAV, M4A, or AAC.");
  }

  const id = `music_${randomUUID().slice(0, 8)}`;
  fs.mkdirSync(musicDir(), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(musicDir(), `${id}${ext}`), buffer);

  const track: MusicTrack = {
    id,
    name: file.name.replace(ext, ""),
    fileName: file.name,
    createdAt: new Date().toISOString(),
  };

  saveRegistry([...listMusic(), track]);
  return track;
}

export function deleteMusicTrack(trackId: string): void {
  const tracks = listMusic();
  const track = tracks.find((t) => t.id === trackId);
  if (track) {
    fs.rmSync(path.join(musicDir(), `${track.id}${path.extname(track.fileName)}`), { force: true });
  }
  saveRegistry(tracks.filter((t) => t.id !== trackId));
}
