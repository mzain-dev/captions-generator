import fs from "fs";
import path from "path";
import { STORAGE_ROOT } from "@/lib/paths";
import type { StylePreset } from "@/types/preset";

const presetsPath = () => path.join(STORAGE_ROOT, "presets.json");

export function listPresets(): StylePreset[] {
  const file = presetsPath();
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as StylePreset[];
}

export function savePreset(preset: StylePreset): void {
  const presets = listPresets();
  presets.push(preset);
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  fs.writeFileSync(presetsPath(), JSON.stringify(presets, null, 2));
}

export function deletePreset(presetId: string): void {
  const presets = listPresets().filter((p) => p.id !== presetId);
  fs.writeFileSync(presetsPath(), JSON.stringify(presets, null, 2));
}
