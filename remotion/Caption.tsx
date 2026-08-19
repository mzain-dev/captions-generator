import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption as CaptionType, CaptionStyle } from "../types/caption";

interface CaptionProps {
  caption: CaptionType;
  style: CaptionStyle;
  currentTime: number;
}

export const Caption: React.FC<CaptionProps> = ({ caption, style, currentTime }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const captionStartFrame = Math.round(caption.start * fps);
  const framesSinceStart = frame - captionStartFrame;

  const containerOpacity =
    style.animation === "fade"
      ? interpolate(framesSinceStart, [0, 6], [0, 1], { extrapolateRight: "clamp" })
      : 1;

  const containerScale =
    style.animation === "scale"
      ? spring({ frame: framesSinceStart, fps, config: { damping: 12, stiffness: 180 } })
      : 1;

  return (
    <div
      style={{
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${style.fontSize * 0.18}px`,
        maxWidth: `${style.maxWidthPercent}%`,
        backgroundColor:
          style.backgroundOpacity > 0
            ? hexToRgba(style.backgroundColor, style.backgroundOpacity)
            : "transparent",
        padding: style.backgroundOpacity > 0 ? `${style.padding}px ${style.padding * 1.5}px` : 0,
        borderRadius: 12,
      }}
    >
      {caption.words.map((word, index) => (
        <Word
          key={`${caption.id}_${index}`}
          text={word.text}
          isActive={currentTime >= word.start && currentTime <= word.end}
          hasStarted={currentTime >= word.start}
          style={style}
          frame={frame}
          wordStartFrame={Math.round(word.start * fps)}
          fps={fps}
        />
      ))}
    </div>
  );
};

interface WordProps {
  text: string;
  isActive: boolean;
  hasStarted: boolean;
  style: CaptionStyle;
  frame: number;
  wordStartFrame: number;
  fps: number;
}

const Word: React.FC<WordProps> = ({
  text,
  isActive,
  hasStarted,
  style,
  frame,
  wordStartFrame,
  fps,
}) => {
  const framesSinceWordStart = frame - wordStartFrame;

  if (style.animation === "word-by-word" && !hasStarted) {
    return null;
  }

  const isHighlighted = style.animation === "karaoke" ? hasStarted : isActive;
  const color = isHighlighted ? style.highlightColor : style.color;
  const hasHighlightBackground = isHighlighted && style.highlightBackgroundOpacity > 0;

  let transform = "none";
  if (style.animation === "pop" && isActive) {
    const scale = spring({
      frame: framesSinceWordStart,
      fps,
      config: { damping: 10, stiffness: 200 },
    });
    transform = `scale(${1 + scale * 0.25})`;
  } else if (style.animation === "bounce" && isActive) {
    const bounce = spring({
      frame: framesSinceWordStart,
      fps,
      config: { damping: 6, stiffness: 150 },
    });
    transform = `translateY(${-bounce * 14}px)`;
  }

  const wordOpacity =
    style.animation === "fade" && !hasStarted
      ? 0
      : style.animation === "fade"
      ? interpolate(framesSinceWordStart, [0, 5], [0.4, 1], { extrapolateRight: "clamp" })
      : 1;

  return (
    <span
      style={{
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.uppercase ? "uppercase" : "none",
        transform,
        opacity: wordOpacity,
        display: "inline-block",
        textShadow: "0 2px 8px rgba(0,0,0,0.45)",
        transition: style.animation === "none" ? undefined : "none",
        backgroundColor: hasHighlightBackground
          ? hexToRgba(style.highlightBackgroundColor, style.highlightBackgroundOpacity)
          : "transparent",
        padding: hasHighlightBackground ? `${style.fontSize * 0.06}px ${style.fontSize * 0.16}px` : 0,
        margin: hasHighlightBackground ? `-${style.fontSize * 0.06}px -${style.fontSize * 0.16}px` : 0,
        borderRadius: style.fontSize * 0.15,
      }}
    >
      {text}
    </span>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
