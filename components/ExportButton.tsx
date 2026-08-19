"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Caption, CaptionStyle } from "@/types/caption";

interface ExportButtonProps {
  projectId: string;
  captions: Caption[];
  style: CaptionStyle;
}

type ExportState =
  | { phase: "idle" }
  | { phase: "rendering"; progress: number }
  | { phase: "done"; renderUrl: string }
  | { phase: "error"; message: string };

export function ExportButton({ projectId, captions, style }: ExportButtonProps) {
  const [state, setState] = useState<ExportState>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startExport = useCallback(async () => {
    setState({ phase: "rendering", progress: 0 });

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, captions, style }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState({ phase: "error", message: data.error ?? "Failed to start export." });
        return;
      }

      pollRef.current = setInterval(async () => {
        const pollRes = await fetch(`/api/render?projectId=${projectId}`);
        const job = await pollRes.json();

        if (job.status === "rendering") {
          setState({ phase: "rendering", progress: job.progress ?? 0 });
        } else if (job.status === "done") {
          stopPolling();
          setState({ phase: "done", renderUrl: job.renderUrl });
        } else if (job.status === "error") {
          stopPolling();
          setState({ phase: "error", message: job.error ?? "Rendering failed." });
        }
      }, 1000);
    } catch {
      setState({ phase: "error", message: "Failed to reach the render server." });
    }
  }, [projectId, captions, style, stopPolling]);

  if (state.phase === "rendering") {
    const pct = Math.round(state.progress * 100);
    return (
      <div className="flex items-center gap-3 w-64">
        <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-neutral-400 w-10 text-right">{pct}%</span>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="flex items-center gap-2">
        <a
          href={state.renderUrl}
          download
          className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
        >
          Download final.mp4
        </a>
        <button
          onClick={startExport}
          className="px-3 py-2 rounded-lg bg-neutral-800 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          Re-export
        </button>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400 max-w-48">{state.message}</span>
        <button
          onClick={startExport}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400 transition-colors"
        >
          Retry export
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startExport}
      className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400 transition-colors"
    >
      Export video
    </button>
  );
}
