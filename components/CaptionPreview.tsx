"use client";

import { Player, PlayerRef } from "@remotion/player";
import { RefObject } from "react";
import { CaptionVideo, type CaptionVideoProps } from "@/remotion/CaptionVideo";

interface CaptionPreviewProps {
  inputProps: CaptionVideoProps;
  durationInFrames: number;
  playerRef: RefObject<PlayerRef | null>;
}

export function CaptionPreview({ inputProps, durationInFrames, playerRef }: CaptionPreviewProps) {
  if (!inputProps.videoSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">
        No video loaded.
      </div>
    );
  }

  return (
    <Player
      ref={playerRef}
      component={CaptionVideo}
      inputProps={inputProps}
      durationInFrames={Math.max(1, durationInFrames)}
      fps={inputProps.fps}
      compositionWidth={inputProps.width}
      compositionHeight={inputProps.height}
      controls
      clickToPlay
      style={{ width: "100%", height: "100%" }}
      className="rounded-lg overflow-hidden bg-black"
    />
  );
}
