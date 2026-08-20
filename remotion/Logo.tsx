import React from "react";
import { Img } from "remotion";

export interface LogoOverlayProps {
  logoSrc: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const Logo: React.FC<LogoOverlayProps> = ({
  logoSrc,
  x,
  y,
  scale,
  opacity,
  backgroundColor,
  backgroundOpacity,
  backgroundPadding,
}) => {
  const hasBackground = backgroundOpacity > 0;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        width: `${scale}%`,
        opacity,
        backgroundColor: hasBackground ? hexToRgba(backgroundColor, backgroundOpacity) : "transparent",
        padding: hasBackground ? backgroundPadding : 0,
        borderRadius: hasBackground ? 12 : 0,
        display: "flex",
      }}
    >
      <Img src={logoSrc} style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );
};
