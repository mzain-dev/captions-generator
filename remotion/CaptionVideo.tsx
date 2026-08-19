import React, { useMemo } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Video,
  getRemotionEnvironment,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
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
  highlightBackgroundColor: z.string(),
  highlightBackgroundOpacity: z.number(),
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
  const { isRendering } = getRemotionEnvironment();

  const activeCaption = useMemo(
    () => captions.find((c) => currentTime >= c.start && currentTime <= c.end),
    [captions, currentTime]
  );

  const justifyContent =
    style.position === "top" ? "flex-start" : style.position === "center" ? "center" : "flex-end";

  // AbsoluteFill defaults to top:0/bottom:0 (stretched to fill the frame). Overriding only
  // `top` for custom placement left `bottom:0` in place too, which pins the container's
  // height to 0 and makes the translateY(-50%) centering trick a no-op — the caption never
  // actually moved. Clearing `bottom` lets the container size to its content so `top` +
  // translateY(-50%) can center it at the requested Y position.
  const customOffset =
    style.position === "custom"
      ? { top: `${style.customY}%`, bottom: "auto", height: "auto", transform: "translateY(-50%)" }
      : {};

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {videoSrc &&
        // OffthreadVideo gives frame-exact extraction needed for export, but stutters when
        // driven by the browser Player during live preview — use native <Video> there instead.
        (isRendering ? <OffthreadVideo src={videoSrc} /> : <Video src={videoSrc} />)}
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
