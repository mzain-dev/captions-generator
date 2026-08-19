import React, { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Caption } from "./Caption";
import { DEFAULT_CAPTION_STYLE } from "../types/caption";

const captionWordSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
});

const captionSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number(),
  end: z.number(),
  words: z.array(captionWordSchema),
});

const captionStyleSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.number(),
  color: z.string(),
  highlightColor: z.string(),
  backgroundColor: z.string(),
  backgroundOpacity: z.number(),
  position: z.enum(["top", "center", "bottom", "custom"]),
  customY: z.number(),
  lineHeight: z.number(),
  letterSpacing: z.number(),
  animation: z.enum(["none", "fade", "pop", "karaoke", "word-by-word", "scale", "bounce"]),
  padding: z.number(),
  uppercase: z.boolean(),
  maxWidthPercent: z.number(),
});

export const captionVideoSchema = z.object({
  videoSrc: z.string(),
  captions: z.array(captionSchema),
  style: captionStyleSchema,
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  durationInSeconds: z.number(),
});

export type CaptionVideoProps = z.infer<typeof captionVideoSchema>;

export const defaultCaptionVideoProps: CaptionVideoProps = {
  videoSrc: "",
  captions: [],
  style: DEFAULT_CAPTION_STYLE,
  width: 1080,
  height: 1920,
  fps: 30,
  durationInSeconds: 10,
};

export const CaptionVideo: React.FC<CaptionVideoProps> = ({ videoSrc, captions, style }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const currentTime = frame / fps;

  const activeCaption = useMemo(
    () => captions.find((c) => currentTime >= c.start && currentTime <= c.end),
    [captions, currentTime]
  );

  const justifyContent =
    style.position === "top" ? "flex-start" : style.position === "center" ? "center" : "flex-end";

  const customOffset =
    style.position === "custom" ? { top: `${style.customY}%`, transform: "translateY(-50%)" } : {};

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {videoSrc && <OffthreadVideo src={videoSrc} />}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: style.position === "custom" ? "flex-start" : justifyContent,
          padding: `${height * 0.06}px ${height * 0.03}px`,
          position: "absolute",
          ...customOffset,
        }}
      >
        {activeCaption && (
          <Caption caption={activeCaption} style={style} currentTime={currentTime} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
