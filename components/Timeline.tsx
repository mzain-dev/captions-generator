"use client";

import { useCallback, useRef } from "react";
import type { Caption } from "@/types/caption";

interface TimelineProps {
  durationInSeconds: number;
  captions: Caption[];
  currentTime: number;
  isPlaying: boolean;
  selectedCaptionId: string | null;
  onSeek: (time: number) => void;
  onSelectCaption: (id: string) => void;
  onPlayPause: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export function Timeline({
  durationInSeconds,
  captions,
  currentTime,
  isPlaying,
  selectedCaptionId,
  onSeek,
  onSelectCaption,
  onPlayPause,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const duration = Math.max(durationInSeconds, 0.001);

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  return (
    <div className="border-t border-neutral-800 bg-neutral-900/60 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={onPlayPause}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-500 text-black hover:bg-cyan-400 transition-colors shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <span className="text-xs font-mono text-neutral-400 w-24 shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div
          ref={trackRef}
          className="relative flex-1 h-10 rounded-md bg-neutral-800 cursor-pointer overflow-hidden"
          onClick={(e) => onSeek(timeFromClientX(e.clientX))}
        >
          {captions.map((caption) => {
            const left = (caption.start / duration) * 100;
            const width = Math.max(0.3, ((caption.end - caption.start) / duration) * 100);
            const isSelected = caption.id === selectedCaptionId;
            return (
              <div
                key={caption.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCaption(caption.id);
                  onSeek(caption.start);
                }}
                title={caption.text}
                className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center text-[10px] leading-tight overflow-hidden whitespace-nowrap border transition-colors ${
                  isSelected
                    ? "bg-cyan-500/40 border-cyan-400 text-white"
                    : "bg-neutral-700/70 border-neutral-600 text-neutral-300 hover:bg-neutral-600/80"
                }`}
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                {caption.text}
              </div>
            );
          })}

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
