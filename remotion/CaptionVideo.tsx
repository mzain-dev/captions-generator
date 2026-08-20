import React, { useEffect, useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Loop,
  OffthreadVideo,
  Sequence,
  Video,
  continueRender,
  delayRender,
  getRemotionEnvironment,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { Caption } from "./Caption";
import { Logo } from "./Logo";
import { TitleCard } from "./TitleCard";
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

const customFontSchema = z.object({
  family: z.string(),
  url: z.string(),
  format: z.string(),
});

const logoOverlaySchema = z.object({
  logoSrc: z.string(),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  opacity: z.number(),
  backgroundColor: z.string(),
  backgroundOpacity: z.number(),
  backgroundPadding: z.number(),
});

const titleCardPropsSchema = z.object({
  text: z.string(),
  subtitle: z.string(),
  durationInSeconds: z.number(),
  backgroundColor: z.string(),
  textColor: z.string(),
});

export const captionVideoSchema = z.object({
  videoSrc: z.string(),
  captions: z.array(captionSchema),
  style: captionStyleSchema,
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  durationInSeconds: z.number(),
  customFonts: z.array(customFontSchema).optional(),
  musicSrc: z.string().optional(),
  musicVolume: z.number().optional(),
  musicDurationInSeconds: z.number().optional(),
  logo: logoOverlaySchema.optional(),
  intro: titleCardPropsSchema.optional(),
  outro: titleCardPropsSchema.optional(),
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
  customFonts: [],
  musicVolume: 0.5,
};

/** Loads any custom uploaded fonts and blocks Remotion from capturing frames until they're ready. */
function useCustomFonts(fonts: CaptionVideoProps["customFonts"]) {
  useEffect(() => {
    if (!fonts || fonts.length === 0) return;
    const handle = delayRender("Loading custom fonts");

    Promise.all(
      fonts.map(async (f) => {
        const fontFace = new FontFace(f.family, `url(${f.url}) format('${f.format}')`);
        const loaded = await fontFace.load();
        document.fonts.add(loaded);
      })
    )
      .then(() => continueRender(handle))
      .catch((err) => {
        console.error("Failed to load a custom font:", err);
        continueRender(handle);
      });
  }, [fonts]);
}

/** Ducks background music under any active caption (i.e. while someone is speaking). */
function useDuckedMusicVolume(
  captions: CaptionVideoProps["captions"],
  baseVolume: number,
  fps: number
) {
  return useMemo(() => {
    return (frame: number) => {
      const t = frame / fps;
      const isSpeaking = captions.some((c) => t >= c.start - 0.15 && t <= c.end + 0.15);
      return isSpeaking ? baseVolume * 0.25 : baseVolume;
    };
  }, [captions, baseVolume, fps]);
}

/** The video + captions + background music. Timed relative to its own Sequence (0 = video start). */
const MainContent: React.FC<
  Pick<
    CaptionVideoProps,
    "videoSrc" | "captions" | "style" | "musicSrc" | "musicVolume" | "musicDurationInSeconds"
  >
> = ({ videoSrc, captions, style, musicSrc, musicVolume, musicDurationInSeconds }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const currentTime = frame / fps;
  const { isRendering } = getRemotionEnvironment();

  const duckedVolume = useDuckedMusicVolume(captions, musicVolume ?? 0.5, fps);

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
        // objectFit:"cover" crops the source to fill the composition frame when a platform
        // export preset (9:16/1:1/16:9) doesn't match the source video's own aspect ratio.
        (isRendering ? (
          <OffthreadVideo src={videoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Video src={videoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ))}
      {musicSrc &&
        // Built-in and uploaded tracks are almost always shorter than the video, so loop
        // them to fill the full duration. Without a known track length we can't safely
        // compute a loop boundary, so it just plays once (better than crashing).
        (musicDurationInSeconds && musicDurationInSeconds > 0 ? (
          <Loop durationInFrames={Math.max(1, Math.round(musicDurationInSeconds * fps))}>
            <Audio src={musicSrc} volume={duckedVolume} loopVolumeCurveBehavior="extend" />
          </Loop>
        ) : (
          <Audio src={musicSrc} volume={duckedVolume} />
        ))}
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

export const CaptionVideo: React.FC<CaptionVideoProps> = (props) => {
  const { videoSrc, captions, style, customFonts, musicSrc, musicVolume, musicDurationInSeconds, logo, intro, outro } =
    props;
  const { fps } = useVideoConfig();

  useCustomFonts(customFonts);

  const introFrames = intro ? Math.max(1, Math.round(intro.durationInSeconds * fps)) : 0;
  const mainFrames = Math.max(1, Math.round(props.durationInSeconds * fps));
  const outroFrames = outro ? Math.max(1, Math.round(outro.durationInSeconds * fps)) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {intro && (
        <Sequence from={0} durationInFrames={introFrames} name="Intro">
          <TitleCard
            text={intro.text}
            subtitle={intro.subtitle}
            backgroundColor={intro.backgroundColor}
            textColor={intro.textColor}
          />
        </Sequence>
      )}

      <Sequence from={introFrames} durationInFrames={mainFrames} name="Main">
        <MainContent
          videoSrc={videoSrc}
          captions={captions}
          style={style}
          musicSrc={musicSrc}
          musicVolume={musicVolume}
          musicDurationInSeconds={musicDurationInSeconds}
        />
      </Sequence>

      {outro && (
        <Sequence from={introFrames + mainFrames} durationInFrames={outroFrames} name="Outro">
          <TitleCard
            text={outro.text}
            subtitle={outro.subtitle}
            backgroundColor={outro.backgroundColor}
            textColor={outro.textColor}
          />
        </Sequence>
      )}

      {/* Persistent across intro/main/outro since a watermark should stay visible throughout. */}
      {logo && <Logo {...logo} />}
    </AbsoluteFill>
  );
};
