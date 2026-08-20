"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Caption, CaptionStyle } from "@/types/caption";
import type { RenderHistoryEntry } from "@/types/project";

interface ExportButtonProps {
  projectId: string;
  captions: Caption[];
  style: CaptionStyle;
  renderHistory?: RenderHistoryEntry[];
}

export type CropAspect = "original" | "9:16" | "1:1" | "16:9";

const CROP_OPTIONS: { value: CropAspect; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "9:16", label: "9:16 Reels/TikTok" },
  { value: "1:1", label: "1:1 Square" },
  { value: "16:9", label: "16:9 Landscape" },
];

type ExportState =
  | { phase: "idle" }
  | { phase: "rendering"; progress: number }
  | { phase: "done"; renderUrl: string }
  | { phase: "error"; message: string };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ExportButton({ projectId, captions, style, renderHistory }: ExportButtonProps) {
  const [state, setState] = useState<ExportState>({ phase: "idle" });
  const [cropAspect, setCropAspect] = useState<CropAspect>("original");
  // Seeded once from the project's saved history; renders completed during this session are
  // appended locally below rather than re-synced from the prop (the parent doesn't refetch
  // the project after each render, so the prop is effectively static after mount anyway).
  const [history, setHistory] = useState<RenderHistoryEntry[]>(renderHistory ?? []);
  const [historyOpen, setHistoryOpen] = useState(false);
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
        body: JSON.stringify({ projectId, captions, style, cropAspect }),
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
          setHistory((prev) => [
            ...prev,
            {
              id: `local_${Date.now()}`,
              fileName: job.renderUrl.split("/").pop() ?? "",
              url: job.renderUrl,
              cropAspect,
              createdAt: new Date().toISOString(),
            },
          ]);
        } else if (job.status === "error") {
          stopPolling();
          setState({ phase: "error", message: job.error ?? "Rendering failed." });
        }
      }, 1000);
    } catch {
      setState({ phase: "error", message: "Failed to reach the render server." });
    }
  }, [projectId, captions, style, cropAspect, stopPolling]);

  const cropPicker = state.phase === "idle" || state.phase === "error" ? (
    <select
      value={cropAspect}
      onChange={(e) => setCropAspect(e.target.value as CropAspect)}
      className="bg-neutral-800 rounded px-2 py-2 text-sm text-neutral-300"
    >
      {CROP_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ) : null;

  const subtitleLinks = (
    <div className="flex items-center gap-1 text-xs">
      <a
        href={`/api/subtitles/${projectId}?format=srt`}
        download
        className="px-2 py-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
      >
        .SRT
      </a>
      <a
        href={`/api/subtitles/${projectId}?format=vtt`}
        download
        className="px-2 py-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
      >
        .VTT
      </a>
    </div>
  );

  const historyButton = history.length > 0 && (
    <div className="relative">
      <button
        onClick={() => setHistoryOpen((v) => !v)}
        className="px-2 py-2 rounded-lg bg-neutral-800 text-xs text-neutral-300 hover:bg-neutral-700 transition-colors"
      >
        History ({history.length}) ▾
      </button>
      {historyOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl z-50 py-1">
          {[...history].reverse().map((entry) => (
            <a
              key={entry.id}
              href={entry.url}
              download
              className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              <span>{formatTime(entry.createdAt)}</span>
              <span className="text-neutral-500">{entry.cropAspect}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );

  if (state.phase === "rendering") {
    const pct = Math.round(state.progress * 100);
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 w-56">
          <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-neutral-400 w-10 text-right">{pct}%</span>
        </div>
        {subtitleLinks}
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="flex items-center gap-2">
        {cropPicker}
        <a
          href={state.renderUrl}
          download
          className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
        >
          Download video
        </a>
        <button
          onClick={startExport}
          className="px-3 py-2 rounded-lg bg-neutral-800 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          Re-export
        </button>
        {historyButton}
        {subtitleLinks}
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="flex items-center gap-2">
        {cropPicker}
        <span className="text-xs text-red-400 max-w-48">{state.message}</span>
        <button
          onClick={startExport}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400 transition-colors"
        >
          Retry export
        </button>
        {historyButton}
        {subtitleLinks}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {cropPicker}
      <button
        onClick={startExport}
        className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400 transition-colors"
      >
        Export video
      </button>
      {historyButton}
      {subtitleLinks}
    </div>
  );
}
