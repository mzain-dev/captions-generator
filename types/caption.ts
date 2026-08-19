export interface CaptionWord {
  text: string;
  start: number;
  end: number;
}

export interface Caption {
  id: string;
  text: string;
  start: number;
  end: number;
  words: CaptionWord[];
  /**
   * Manually-assigned speaker label. Whisper doesn't do speaker diarization, so this is
   * set by hand in the editor rather than detected automatically — each distinct label
   * gets a consistent color derived from SPEAKER_PALETTE.
   */
  speaker?: string;
}

export const SPEAKER_PALETTE = [
  "#22D3EE", // cyan
  "#F472B6", // pink
  "#FBBF24", // amber
  "#A78BFA", // violet
  "#34D399", // emerald
  "#FB923C", // orange
];

export function colorForSpeaker(speaker: string): string {
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = (hash * 31 + speaker.charCodeAt(i)) >>> 0;
  }
  return SPEAKER_PALETTE[hash % SPEAKER_PALETTE.length];
}

export type CaptionAnimation =
  | "none"
  | "fade"
  | "pop"
  | "karaoke"
  | "word-by-word"
  | "scale"
  | "bounce";

export type CaptionPosition = "top" | "center" | "bottom" | "custom";

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  highlightColor: string;
  highlightBackgroundColor: string;
  highlightBackgroundOpacity: number;
  backgroundColor: string;
  backgroundOpacity: number;
  position: CaptionPosition;
  customY: number;
  lineHeight: number;
  letterSpacing: number;
  animation: CaptionAnimation;
  padding: number;
  uppercase: boolean;
  maxWidthPercent: number;
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 64,
  fontWeight: 800,
  color: "#FFFFFF",
  highlightColor: "#22D3EE",
  highlightBackgroundColor: "#22D3EE",
  highlightBackgroundOpacity: 0,
  backgroundColor: "#000000",
  backgroundOpacity: 0.6,
  position: "bottom",
  customY: 80,
  lineHeight: 1.2,
  letterSpacing: 0,
  animation: "word-by-word",
  padding: 16,
  uppercase: false,
  maxWidthPercent: 80,
};

export interface CaptionGenerationOptions {
  maxWordsPerCaption: number;
  maxCharsPerCaption: number;
  minWordsPerCaption: number;
}

export const DEFAULT_CAPTION_GENERATION_OPTIONS: CaptionGenerationOptions = {
  maxWordsPerCaption: 6,
  maxCharsPerCaption: 42,
  minWordsPerCaption: 1,
};
