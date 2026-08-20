import React from "react";
import { Composition } from "remotion";
import { CaptionVideo, captionVideoSchema, defaultCaptionVideoProps } from "./CaptionVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CaptionVideo"
      component={CaptionVideo}
      schema={captionVideoSchema}
      durationInFrames={Math.max(
        1,
        Math.round(defaultCaptionVideoProps.durationInSeconds * defaultCaptionVideoProps.fps)
      )}
      fps={defaultCaptionVideoProps.fps}
      width={defaultCaptionVideoProps.width}
      height={defaultCaptionVideoProps.height}
      defaultProps={defaultCaptionVideoProps}
      calculateMetadata={async ({ props }) => {
        const introFrames = props.intro
          ? Math.max(1, Math.round(props.intro.durationInSeconds * props.fps))
          : 0;
        const mainFrames = Math.max(1, Math.round(props.durationInSeconds * props.fps));
        const outroFrames = props.outro
          ? Math.max(1, Math.round(props.outro.durationInSeconds * props.fps))
          : 0;
        return {
          durationInFrames: introFrames + mainFrames + outroFrames,
          fps: props.fps,
          width: props.width,
          height: props.height,
        };
      }}
    />
  );
};
