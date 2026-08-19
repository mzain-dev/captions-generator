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
      calculateMetadata={async ({ props }) => ({
        durationInFrames: Math.max(1, Math.round(props.durationInSeconds * props.fps)),
        fps: props.fps,
        width: props.width,
        height: props.height,
      })}
    />
  );
};
