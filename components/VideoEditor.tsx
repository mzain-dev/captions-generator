"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { useRouter } from "next/navigation";
import type { Caption, CaptionStyle } from "@/types/caption";
import type { ProjectData } from "@/types/project";
import { CaptionPreview } from "@/components/CaptionPreview";
import { Timeline } from "@/components/Timeline";
import { EditorSidebar } from "@/components/EditorSidebar";
import { CaptionListEditor } from "@/components/CaptionListEditor";
import { ExportButton } from "@/components/ExportButton";
import type { CaptionVideoProps } from "@/remotion/CaptionVideo";

interface VideoEditorProps {
  projectId: string;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "processing"; label: string }
  | { phase: "ready" }
  | { phase: "error"; message: string };

export function VideoEditor({ projectId }: VideoEditorProps) {
  const router = useRouter();
  const playerRef = useRef<PlayerRef>(null);

  const [project, setProject] = useState<ProjectData | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [style, setStyle] = useState<CaptionStyle | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load the project, and transcribe automatically if it hasn't been processed yet.
  useEffect(() => {
    let cancelled = false;
    let statusPoll: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setLoadState({ phase: "error", message: data.error ?? "Project not found." });
        return;
      }

      const proj = data.project as ProjectData;
      setProject(proj);
      setStyle(proj.style);

      if (proj.status === "ready" || proj.status === "rendered" || proj.captions.length > 0) {
        setCaptions(proj.captions);
        setLoadState({ phase: "ready" });
        return;
      }

      setLoadState({ phase: "processing", label: "Extracting audio..." });
      statusPoll = setInterval(async () => {
        const pollRes = await fetch(`/api/projects/${projectId}`);
        const pollData = await pollRes.json();
        if (cancelled || !pollRes.ok) return;
        const label =
          pollData.project.status === "transcribing"
            ? "Transcribing with OpenAI..."
            : "Extracting audio...";
        setLoadState((prev) => (prev.phase === "processing" ? { phase: "processing", label } : prev));
      }, 1200);

      try {
        const transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const transcribeData = await transcribeRes.json();
        if (cancelled) return;

        if (!transcribeRes.ok) {
          setLoadState({ phase: "error", message: transcribeData.error ?? "Transcription failed." });
          return;
        }

        setCaptions(transcribeData.captions);
        setLoadState({ phase: "ready" });
      } catch {
        if (!cancelled) {
          setLoadState({ phase: "error", message: "Failed to reach the transcription server." });
        }
      } finally {
        if (statusPoll) clearInterval(statusPoll);
      }
    };

    run();
    return () => {
      cancelled = true;
      if (statusPoll) clearInterval(statusPoll);
    };
  }, [projectId]);

  // Persist caption/style edits to the project file (debounced).
  useEffect(() => {
    if (!project || !style || loadState.phase !== "ready") return;
    const timeout = setTimeout(() => {
      fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions, style }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timeout);
  }, [captions, style, project, projectId, loadState.phase]);

  // Track playhead position and play state from the Remotion Player.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrame = () => {
      const fps = project?.video?.fps ?? 30;
      setCurrentTime(player.getCurrentFrame() / fps);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);

    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [project, loadState.phase]);

  const handleSeek = useCallback(
    (time: number) => {
      const fps = project?.video?.fps ?? 30;
      playerRef.current?.seekTo(Math.round(time * fps));
      setCurrentTime(time);
    },
    [project]
  );

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) player.pause();
    else player.play();
  }, [isPlaying]);

  const handleStyleChange = useCallback((patch: Partial<CaptionStyle>) => {
    setStyle((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  if (loadState.phase === "loading") {
    return <CenteredMessage>Loading project...</CenteredMessage>;
  }

  if (loadState.phase === "error") {
    return (
      <CenteredMessage>
        <p className="text-red-400">{loadState.message}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
        >
          Back to upload
        </button>
      </CenteredMessage>
    );
  }

  if (loadState.phase === "processing") {
    return (
      <CenteredMessage>
        <div className="h-10 w-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto mb-4" />
        {loadState.label}
      </CenteredMessage>
    );
  }

  if (!project || !project.video || !style) {
    return <CenteredMessage>Something went wrong loading this project.</CenteredMessage>;
  }

  const inputProps: CaptionVideoProps = {
    videoSrc: `/media/videos/${projectId}/${project.video.fileName}`,
    captions,
    style,
    width: project.video.width,
    height: project.video.height,
    fps: project.video.fps,
    durationInSeconds: project.video.durationInSeconds,
  };
  const durationInFrames = Math.max(1, Math.round(project.video.durationInSeconds * project.video.fps));

  return (
    <div className="flex flex-col h-screen">
      <header className="h-14 shrink-0 border-b border-neutral-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-neutral-400 hover:text-neutral-200 text-sm">
            ← Projects
          </button>
          <span className="text-sm text-neutral-500">|</span>
          <span className="text-sm font-medium text-neutral-200">{project.name}</span>
        </div>
        <ExportButton projectId={projectId} captions={captions} style={style} />
      </header>

      <div className="flex flex-1 min-h-0">
        <EditorSidebar style={style} onChange={handleStyleChange} />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex items-center justify-center p-6 min-w-0">
              <div
                className="h-full max-h-full"
                style={{ aspectRatio: `${project.video.width} / ${project.video.height}` }}
              >
                <CaptionPreview inputProps={inputProps} durationInFrames={durationInFrames} playerRef={playerRef} />
              </div>
            </div>

            <div className="w-80 shrink-0 border-l border-neutral-800 overflow-y-auto">
              <CaptionListEditor
                captions={captions}
                selectedCaptionId={selectedCaptionId}
                onChange={setCaptions}
                onSelect={setSelectedCaptionId}
              />
            </div>
          </div>

          <Timeline
            durationInSeconds={project.video.durationInSeconds}
            captions={captions}
            currentTime={currentTime}
            isPlaying={isPlaying}
            selectedCaptionId={selectedCaptionId}
            onSeek={handleSeek}
            onSelectCaption={setSelectedCaptionId}
            onPlayPause={handlePlayPause}
          />
        </div>
      </div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center text-center text-neutral-400 px-6">
      <div>{children}</div>
    </div>
  );
}
