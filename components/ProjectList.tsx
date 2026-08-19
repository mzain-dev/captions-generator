"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProjectData } from "@/types/project";

const STATUS_LABEL: Record<ProjectData["status"], string> = {
  uploaded: "Uploaded",
  extracting_audio: "Extracting audio",
  transcribing: "Transcribing",
  ready: "Ready to edit",
  rendering: "Rendering",
  rendered: "Exported",
  error: "Error",
};

const STATUS_COLOR: Record<ProjectData["status"], string> = {
  uploaded: "bg-neutral-700 text-neutral-300",
  extracting_audio: "bg-amber-500/20 text-amber-300",
  transcribing: "bg-amber-500/20 text-amber-300",
  ready: "bg-cyan-500/20 text-cyan-300",
  rendering: "bg-amber-500/20 text-amber-300",
  rendered: "bg-emerald-500/20 text-emerald-300",
  error: "bg-red-500/20 text-red-300",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ProjectList({ refreshKey }: { refreshKey?: number }) {
  const [projects, setProjects] = useState<ProjectData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load projects.");
        if (!cancelled) setProjects(data.projects);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load projects.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleDelete = async (projectId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This removes its video, transcript, and export.`)) return;
    setProjects((prev) => prev?.filter((p) => p.projectId !== projectId) ?? null);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" }).catch(() => {});
  };

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!projects) {
    return <p className="text-sm text-neutral-500">Loading projects...</p>;
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Your projects
      </h2>
      <div className="grid gap-2">
        {projects.map((project) => (
          <div
            key={project.projectId}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3 hover:border-neutral-700 transition-colors"
          >
            <Link href={`/editor?projectId=${project.projectId}`} className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-100 truncate">{project.name}</p>
              <p className="text-xs text-neutral-500">
                {formatDate(project.createdAt)}
                {project.video && ` · ${formatDuration(project.video.durationInSeconds)}`}
              </p>
            </Link>
            <span
              className={`text-xs px-2 py-1 rounded-full shrink-0 ${STATUS_COLOR[project.status]}`}
            >
              {STATUS_LABEL[project.status]}
            </span>
            <button
              onClick={() => handleDelete(project.projectId, project.name)}
              className="text-xs px-2 py-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
