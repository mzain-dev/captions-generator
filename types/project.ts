import type { Caption, CaptionStyle } from "./caption";
import type { ScriptMode, Transcript } from "./transcript";
import type { LogoSettings } from "./logo";
import type { TitleCardSettings } from "./titlecard";

export interface VideoMetadata {
  fileName: string;
  path: string;
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
}

export type ProjectStatus =
  | "uploaded"
  | "extracting_audio"
  | "transcribing"
  | "ready"
  | "rendering"
  | "rendered"
  | "error";

export interface RenderHistoryEntry {
  id: string;
  fileName: string;
  url: string;
  cropAspect: string;
  createdAt: string;
}

export interface ProjectData {
  projectId: string;
  name: string;
  status: ProjectStatus;
  error?: string;
  video?: VideoMetadata;
  audioPath?: string;
  transcript?: Transcript;
  captions: Caption[];
  style: CaptionStyle;
  scriptMode?: ScriptMode;
  musicTrackId?: string;
  musicVolume?: number;
  logo?: LogoSettings;
  intro?: TitleCardSettings;
  outro?: TitleCardSettings;
  renderPath?: string;
  renderHistory?: RenderHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}
