import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface TitleCardProps {
  text: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
}

export const TitleCard: React.FC<TitleCardProps> = ({ text, subtitle, backgroundColor, textColor }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const rise = interpolate(frame, [0, fps * 0.4], [16, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: width * 0.02,
        padding: width * 0.08,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${rise}px)`,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: width * 0.09,
          fontWeight: 800,
          color: textColor,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {text}
      </div>
      {subtitle && (
        <div
          style={{
            opacity: opacity * 0.8,
            transform: `translateY(${rise}px)`,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: width * 0.04,
            fontWeight: 500,
            color: textColor,
            textAlign: "center",
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};
