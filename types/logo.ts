export interface LogoAsset {
  id: string;
  name: string;
  fileName: string;
  format: "png" | "jpeg" | "webp" | "svg";
  createdAt: string;
}

export interface LogoSettings {
  logoId?: string;
  /** Center position as percent of frame width/height (0-100). */
  x: number;
  y: number;
  /** Logo width as a percent of frame width; height scales to preserve aspect ratio. */
  scale: number;
  opacity: number;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
}

export const DEFAULT_LOGO_SETTINGS: LogoSettings = {
  x: 88,
  y: 10,
  scale: 14,
  opacity: 1,
  backgroundColor: "#000000",
  backgroundOpacity: 0,
  backgroundPadding: 12,
};

export const LOGO_POSITION_PRESETS: { label: string; x: number; y: number }[] = [
  { label: "Top-left", x: 12, y: 10 },
  { label: "Top-right", x: 88, y: 10 },
  { label: "Center", x: 50, y: 50 },
  { label: "Bottom-left", x: 12, y: 90 },
  { label: "Bottom-right", x: 88, y: 90 },
];
