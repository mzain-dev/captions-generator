"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { useRouter } from "next/navigation";
import type { Caption, CaptionStyle } from "@/types/caption";
import { DEFAULT_CAPTION_STYLE } from "@/types/caption";
import type { ProjectData } from "@/types/project";
import type { CustomFont } from "@/types/font";
import type { MusicTrack } from "@/types/music";
import type { ScriptMode, Transcript } from "@/types/transcript";
import type { LogoAsset, LogoSettings } from "@/types/logo";
import type { TitleCardSettings } from "@/types/titlecard";
import { isRomanizableLanguage, romanizableLanguageName } from "@/lib/languages";
import { generateCaptions } from "@/lib/captions";
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

interface EditorState {
  captions: Caption[];
  style: CaptionStyle | null;
}

const MAX_HISTORY = 50;

export function VideoEditor({ projectId }: VideoEditorProps) {
  const router = useRouter();
  const playerRef = useRef<PlayerRef>(null);

  const [project, setProject] = useState<ProjectData | null>(null);
  // captions and style are undo/redo'd as one atomic unit — keeping them in a single
  // useState (rather than two separate ones) avoids relying on cross-state nested updater
  // calls, whose exact ordering React doesn't guarantee, to keep them in sync.
  const [editorState, setEditorState] = useState<EditorState>({ captions: [], style: null });
  const { captions, style } = editorState;
  const [musicTrackId, setMusicTrackId] = useState<string | undefined>(undefined);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [scriptMode, setScriptMode] = useState<ScriptMode | undefined>(undefined);
  const [scriptChoicePending, setScriptChoicePending] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [logos, setLogos] = useState<LogoAsset[]>([]);
  const [logo, setLogo] = useState<LogoSettings | undefined>(undefined);
  const [intro, setIntro] = useState<TitleCardSettings | undefined>(undefined);
  const [outro, setOutro] = useState<TitleCardSettings | undefined>(undefined);

  const undoStack = useRef<EditorState[]>([]);
  const redoStack = useRef<EditorState[]>([]);
  // The stacks live in refs (mutating them shouldn't itself trigger a render), but JSX must
  // not read ref.current during render — so track availability as real state instead,
  // updated wherever the stacks change.
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const syncHistoryState = () => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  };

  const runTranscription = useCallback(async () => {
    setLoadState({ phase: "processing", label: "Extracting audio..." });
    const statusPoll = setInterval(async () => {
      const pollRes = await fetch(`/api/projects/${projectId}`);
      const pollData = await pollRes.json();
      if (!pollRes.ok) return;
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

      if (!transcribeRes.ok) {
        setLoadState({ phase: "error", message: transcribeData.error ?? "Transcription failed." });
        return;
      }

      const newTranscript = transcribeData.transcript as Transcript;
      setTranscript(newTranscript);
      setEditorState((prev) => ({ ...prev, captions: transcribeData.captions }));
      undoStack.current = [];
      redoStack.current = [];
      syncHistoryState();
      setLoadState({ phase: "ready" });

      // Whisper transcribes non-Latin-script languages in their native script by default.
      // If we managed to also transliterate it, ask which the user wants rather than
      // silently picking one — captions are already generated in native script for now.
      // Deliberately NOT setting scriptMode here: that only happens when the user actually
      // clicks a choice, otherwise the debounced autosave would silently record "native"
      // as a real decision before they've even seen the prompt.
      if (
        isRomanizableLanguage(newTranscript.language) &&
        newTranscript.romanizedWords &&
        newTranscript.romanizedWords.length > 0
      ) {
        setScriptChoicePending(true);
      }
    } catch {
      setLoadState({ phase: "error", message: "Failed to reach the transcription server." });
    } finally {
      clearInterval(statusPoll);
    }
  }, [projectId]);

  // Load the project, and transcribe automatically if it hasn't been processed yet.
  useEffect(() => {
    let cancelled = false;

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
      // Merge with defaults so projects saved before a style field was added still work.
      const mergedStyle = { ...DEFAULT_CAPTION_STYLE, ...proj.style };
      setMusicTrackId(proj.musicTrackId);
      setMusicVolume(proj.musicVolume ?? 0.5);
      setScriptMode(proj.scriptMode);
      setLogo(proj.logo);
      setIntro(proj.intro);
      setOutro(proj.outro);

      if (proj.status === "ready" || proj.status === "rendered" || proj.captions.length > 0) {
        setEditorState({ captions: proj.captions, style: mergedStyle });
        setTranscript(proj.transcript ?? null);
        setLoadState({ phase: "ready" });

        // Only prompt if this project has never had a script choice made for it —
        // reopening a project shouldn't re-ask every time.
        if (
          !proj.scriptMode &&
          proj.transcript &&
          isRomanizableLanguage(proj.transcript.language) &&
          proj.transcript.romanizedWords &&
          proj.transcript.romanizedWords.length > 0
        ) {
          setScriptChoicePending(true);
        }
        return;
      }

      setEditorState({ captions: [], style: mergedStyle });
      await runTranscription();
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Load available custom fonts and music tracks once for the sidebar + preview.
  useEffect(() => {
    fetch("/api/fonts")
      .then((r) => r.json())
      .then((d) => setCustomFonts(d.fonts ?? []))
      .catch(() => {});
    fetch("/api/music")
      .then((r) => r.json())
      .then((d) => setMusicTracks(d.tracks ?? []))
      .catch(() => {});
    fetch("/api/logos")
      .then((r) => r.json())
      .then((d) => setLogos(d.logos ?? []))
      .catch(() => {});
  }, []);

  // Persist caption/style/music edits to the project file (debounced).
  useEffect(() => {
    if (!project || !style || loadState.phase !== "ready") return;
    const timeout = setTimeout(() => {
      fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captions,
          style,
          musicTrackId: musicTrackId ?? null,
          musicVolume,
          scriptMode,
          logo: logo ?? null,
          intro: intro ?? null,
          outro: outro ?? null,
        }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timeout);
  }, [
    captions,
    style,
    musicTrackId,
    musicVolume,
    scriptMode,
    logo,
    intro,
    outro,
    project,
    projectId,
    loadState.phase,
  ]);

  // The Timeline/caption editor work in "seconds since the main video started" — but once
  // an intro card is enabled, the Player's frame 0 is the start of the INTRO, not the video.
  // This offset converts between the two everywhere the Player's raw frame is read or set.
  const introOffsetFrames =
    intro?.enabled && project?.video
      ? Math.max(1, Math.round(intro.durationInSeconds * project.video.fps))
      : 0;

  // Track playhead position and play state from the Remotion Player.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrame = () => {
      const fps = project?.video?.fps ?? 30;
      setCurrentTime((player.getCurrentFrame() - introOffsetFrames) / fps);
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
  }, [project, loadState.phase, introOffsetFrames]);

  const handleSeek = useCallback(
    (time: number) => {
      const fps = project?.video?.fps ?? 30;
      playerRef.current?.seekTo(Math.round(time * fps) + introOffsetFrames);
      setCurrentTime(time);
    },
    [project, introOffsetFrames]
  );

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) player.pause();
    else player.play();
  }, [isPlaying]);

  // Every caption/style edit pushes the PREVIOUS state onto the undo stack and clears redo.
  const setCaptions = useCallback((updater: Caption[] | ((prev: Caption[]) => Caption[])) => {
    setEditorState((prev) => {
      const nextCaptions = typeof updater === "function" ? updater(prev.captions) : updater;
      undoStack.current.push(prev);
      if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
      redoStack.current = [];
      syncHistoryState();
      return { ...prev, captions: nextCaptions };
    });
  }, []);

  const handleStyleChange = useCallback((patch: Partial<CaptionStyle>) => {
    setEditorState((prev) => {
      if (!prev.style) return prev;
      undoStack.current.push(prev);
      if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
      redoStack.current = [];
      syncHistoryState();
      return { ...prev, style: { ...prev.style, ...patch } };
    });
  }, []);

  // Regenerates every caption from the transcript in the chosen script. This replaces
  // whatever captions are currently showing — including any manual text edits — since a
  // script switch re-chunks from the transcript's word list, not the existing captions.
  const applyScriptMode = useCallback(
    (mode: ScriptMode) => {
      if (!transcript) return;
      setScriptMode(mode);
      setScriptChoicePending(false);
      setCaptions(generateCaptions(transcript, undefined, mode));
    },
    [transcript, setCaptions]
  );

  const undo = useCallback(() => {
    const prevState = undoStack.current.pop();
    if (!prevState) return;
    setEditorState((current) => {
      redoStack.current.push(current);
      return prevState;
    });
    syncHistoryState();
  }, []);

  const redo = useCallback(() => {
    const nextState = redoStack.current.pop();
    if (!nextState) return;
    setEditorState((current) => {
      undoStack.current.push(current);
      return nextState;
    });
    syncHistoryState();
  }, []);

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) to redo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  if (loadState.phase === "loading") {
    return <CenteredMessage>Loading project...</CenteredMessage>;
  }

  if (loadState.phase === "error") {
    return (
      <CenteredMessage>
        <p className="text-red-400">{loadState.message}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={runTranscription}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400"
          >
            Retry
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
          >
            Back to upload
          </button>
        </div>
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

  const selectedMusicTrack = musicTracks.find((t) => t.id === musicTrackId);

  const inputProps: CaptionVideoProps = {
    videoSrc: `/media/videos/${projectId}/${project.video.fileName}`,
    captions,
    style,
    width: project.video.width,
    height: project.video.height,
    fps: project.video.fps,
    durationInSeconds: project.video.durationInSeconds,
    customFonts: customFonts.map((f) => ({
      family: f.family,
      url: `/media/fonts/${f.id}${f.fileName.slice(f.fileName.lastIndexOf("."))}`,
      format: f.format,
    })),
    musicSrc: selectedMusicTrack
      ? `/media/music/${selectedMusicTrack.id}${selectedMusicTrack.fileName.slice(selectedMusicTrack.fileName.lastIndexOf("."))}`
      : undefined,
    musicVolume,
    musicDurationInSeconds: selectedMusicTrack?.durationInSeconds,
    logo: (() => {
      const asset = logos.find((l) => l.id === logo?.logoId);
      if (!logo?.logoId || !asset) return undefined;
      return {
        logoSrc: `/media/logos/${asset.id}${asset.fileName.slice(asset.fileName.lastIndexOf("."))}`,
        x: logo.x,
        y: logo.y,
        scale: logo.scale,
        opacity: logo.opacity,
        backgroundColor: logo.backgroundColor,
        backgroundOpacity: logo.backgroundOpacity,
        backgroundPadding: logo.backgroundPadding,
      };
    })(),
    intro: intro?.enabled ? intro : undefined,
    outro: outro?.enabled ? outro : undefined,
  };
  const outroFrames =
    outro?.enabled ? Math.max(1, Math.round(outro.durationInSeconds * project.video.fps)) : 0;
  const durationInFrames = Math.max(
    1,
    introOffsetFrames + Math.round(project.video.durationInSeconds * project.video.fps) + outroFrames
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="h-14 shrink-0 border-b border-neutral-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-neutral-400 hover:text-neutral-200 text-sm">
            ← Projects
          </button>
          <span className="text-sm text-neutral-500">|</span>
          <span className="text-sm font-medium text-neutral-200">{project.name}</span>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="px-2 py-1 rounded text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="px-2 py-1 rounded text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↷ Redo
            </button>
          </div>
          {transcript?.romanizedWords && transcript.romanizedWords.length > 0 && transcript.language && (
            <div className="flex items-center rounded-lg overflow-hidden border border-neutral-700 ml-1">
              <button
                onClick={() => applyScriptMode("native")}
                className={`px-2 py-1 text-xs ${
                  scriptMode !== "roman"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-transparent text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                {romanizableLanguageName(transcript.language)}
              </button>
              <button
                onClick={() => applyScriptMode("roman")}
                className={`px-2 py-1 text-xs ${
                  scriptMode === "roman"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-transparent text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                Roman {romanizableLanguageName(transcript.language)}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/projects/${projectId}/archive`}
            download
            className="px-3 py-2 rounded-lg bg-neutral-800 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors"
            title="Download a full backup of this project (video, transcript, settings, exports)"
          >
            Backup .zip
          </a>
          <ExportButton projectId={projectId} captions={captions} style={style} renderHistory={project.renderHistory} />
        </div>
      </header>

      {scriptChoicePending && transcript?.language && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-sm rounded-xl border border-neutral-700 bg-neutral-900 p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-100">
              Detected {romanizableLanguageName(transcript.language)} speech
            </h2>
            <p className="text-sm text-neutral-400">
              How would you like the captions written? You can switch anytime from the toggle
              in the header.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => applyScriptMode("native")}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400"
              >
                {romanizableLanguageName(transcript.language)} script
              </button>
              <button
                onClick={() => applyScriptMode("roman")}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm font-semibold hover:bg-neutral-700"
              >
                Roman {romanizableLanguageName(transcript.language)} (Latin letters)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <EditorSidebar
          style={style}
          onChange={handleStyleChange}
          customFonts={customFonts}
          onFontsChange={setCustomFonts}
          musicTracks={musicTracks}
          onMusicTracksChange={setMusicTracks}
          musicTrackId={musicTrackId}
          onMusicTrackChange={setMusicTrackId}
          musicVolume={musicVolume}
          onMusicVolumeChange={setMusicVolume}
          logos={logos}
          onLogosChange={setLogos}
          logo={logo}
          onLogoChange={setLogo}
          intro={intro}
          onIntroChange={setIntro}
          outro={outro}
          onOutroChange={setOutro}
        />

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
