import type { Caption, CaptionStyle } from "./caption";
import type { Transcript } from "./transcript";

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
  renderPath?: string;
  createdAt: string;
  updatedAt: string;
}
