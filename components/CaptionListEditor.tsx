"use client";

import { useState } from "react";
import type { Caption } from "@/types/caption";
import {
  mergeCaptions,
  rescaleCaptionTiming,
  retextCaption,
  splitCaptionAtWordIndex,
} from "@/lib/captions";

interface CaptionListEditorProps {
  captions: Caption[];
  selectedCaptionId: string | null;
  onChange: (captions: Caption[]) => void;
  onSelect: (id: string) => void;
}

export function CaptionListEditor({
  captions,
  selectedCaptionId,
  onChange,
  onSelect,
}: CaptionListEditorProps) {
  const [splittingId, setSplittingId] = useState<string | null>(null);

  const updateAt = (index: number, next: Caption) => {
    const copy = [...captions];
    copy[index] = next;
    onChange(copy);
  };

  const deleteAt = (index: number) => {
    onChange(captions.filter((_, i) => i !== index));
  };

  const mergeWithNext = (index: number) => {
    if (index >= captions.length - 1) return;
    const merged = mergeCaptions(captions[index], captions[index + 1]);
    const copy = [...captions];
    copy.splice(index, 2, merged);
    onChange(copy);
  };

  const splitAt = (index: number, wordIndex: number) => {
    const [a, b] = splitCaptionAtWordIndex(captions[index], wordIndex);
    const copy = [...captions];
    copy.splice(index, 1, a, b);
    onChange(copy);
    setSplittingId(null);
  };

  return (
    <div className="divide-y divide-neutral-800">
      {captions.map((caption, index) => {
        const isSelected = caption.id === selectedCaptionId;
        const isSplitting = splittingId === caption.id;

        return (
          <div
            key={caption.id}
            onClick={() => onSelect(caption.id)}
            className={`px-4 py-3 space-y-2 cursor-pointer ${
              isSelected ? "bg-cyan-500/10" : "hover:bg-neutral-900/60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-neutral-500">
                #{index + 1} · {caption.start.toFixed(2)}s – {caption.end.toFixed(2)}s
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSplittingId(isSplitting ? null : caption.id);
                  }}
                  className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Split
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    mergeWithNext(index);
                  }}
                  disabled={index >= captions.length - 1}
                  className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-30"
                >
                  Merge ↓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAt(index);
                  }}
                  className="text-[11px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30"
                >
                  Delete
                </button>
              </div>
            </div>

            {isSplitting ? (
              <div className="flex flex-wrap gap-1">
                {caption.words.map((w, wi) =>
                  wi === 0 ? (
                    <span key={wi} className="text-sm text-neutral-500 px-1">
                      {w.text}
                    </span>
                  ) : (
                    <button
                      key={wi}
                      onClick={(e) => {
                        e.stopPropagation();
                        splitAt(index, wi);
                      }}
                      className="text-sm px-1 text-neutral-200 hover:bg-cyan-500/30 rounded border-l border-neutral-700"
                      title="Split before this word"
                    >
                      {w.text}
                    </button>
                  )
                )}
              </div>
            ) : (
              <textarea
                value={caption.text}
                onChange={(e) => updateAt(index, retextCaption(caption, e.target.value))}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                className="w-full bg-neutral-800/70 rounded px-2 py-1.5 text-sm text-neutral-100 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            )}

            <div className="flex items-center gap-3 text-[11px] text-neutral-400">
              <label className="flex items-center gap-1">
                Start
                <input
                  type="number"
                  step={0.05}
                  value={caption.start.toFixed(2)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    updateAt(index, rescaleCaptionTiming(caption, Number(e.target.value), caption.end))
                  }
                  className="w-16 bg-neutral-800 rounded px-1 py-0.5"
                />
              </label>
              <label className="flex items-center gap-1">
                End
                <input
                  type="number"
                  step={0.05}
                  value={caption.end.toFixed(2)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    updateAt(index, rescaleCaptionTiming(caption, caption.start, Number(e.target.value)))
                  }
                  className="w-16 bg-neutral-800 rounded px-1 py-0.5"
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
