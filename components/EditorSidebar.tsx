"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptionAnimation, CaptionPosition, CaptionStyle } from "@/types/caption";
import type { CustomFont } from "@/types/font";
import type { MusicTrack } from "@/types/music";
import type { StylePreset } from "@/types/preset";

interface EditorSidebarProps {
  style: CaptionStyle;
  onChange: (patch: Partial<CaptionStyle>) => void;
  customFonts: CustomFont[];
  onFontsChange: (fonts: CustomFont[]) => void;
  musicTracks: MusicTrack[];
  onMusicTracksChange: (tracks: MusicTrack[]) => void;
  musicTrackId: string | undefined;
  onMusicTrackChange: (trackId: string | undefined) => void;
  musicVolume: number;
  onMusicVolumeChange: (volume: number) => void;
}

const BUILT_IN_FONTS = [
  "Inter, system-ui, sans-serif",
  "Arial, Helvetica, sans-serif",
  "Georgia, serif",
  "'Courier New', monospace",
  "Impact, sans-serif",
];

const ANIMATION_OPTIONS: { value: CaptionAnimation; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "pop", label: "Pop" },
  { value: "karaoke", label: "Karaoke" },
  { value: "word-by-word", label: "Word-by-word" },
  { value: "scale", label: "Scale" },
  { value: "bounce", label: "Bounce" },
];

const POSITION_OPTIONS: { value: CaptionPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
  { value: "custom", label: "Custom" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-neutral-300">
      <span className="shrink-0">{label}</span>
      {children}
    </label>
  );
}

export function EditorSidebar({
  style,
  onChange,
  customFonts,
  onFontsChange,
  musicTracks,
  onMusicTracksChange,
  musicTrackId,
  onMusicTrackChange,
  musicVolume,
  onMusicVolumeChange,
}: EditorSidebarProps) {
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [fontUploadError, setFontUploadError] = useState<string | null>(null);
  const [musicUploadError, setMusicUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => setPresets(d.presets ?? []))
      .catch(() => {});
  }, []);

  const savePreset = async () => {
    const name = prompt("Name this style preset:");
    if (!name) return;
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, style }),
    });
    const data = await res.json();
    if (res.ok) setPresets((prev) => [...prev, data.preset]);
  };

  const deletePreset = async (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/presets/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const uploadFont = async (file: File) => {
    setFontUploadError(null);
    const formData = new FormData();
    formData.append("font", file);
    const res = await fetch("/api/fonts", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setFontUploadError(data.error ?? "Font upload failed.");
      return;
    }
    onFontsChange([...customFonts, data.font]);
    onChange({ fontFamily: data.font.family });
  };

  const deleteFont = async (id: string) => {
    onFontsChange(customFonts.filter((f) => f.id !== id));
    await fetch(`/api/fonts/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const uploadMusic = async (file: File) => {
    setMusicUploadError(null);
    const formData = new FormData();
    formData.append("music", file);
    const res = await fetch("/api/music", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setMusicUploadError(data.error ?? "Upload failed.");
      return;
    }
    onMusicTracksChange([...musicTracks, data.track]);
    onMusicTrackChange(data.track.id);
  };

  const deleteMusic = async (id: string) => {
    onMusicTracksChange(musicTracks.filter((t) => t.id !== id));
    if (musicTrackId === id) onMusicTrackChange(undefined);
    await fetch(`/api/music/${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="w-72 shrink-0 border-r border-neutral-800 bg-neutral-900/40 overflow-y-auto px-4 py-5 space-y-6">
      <Section title="Presets">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-0.5">
              <button
                onClick={() => onChange(p.style)}
                className="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              >
                {p.name}
              </button>
              <button
                onClick={() => deletePreset(p.id)}
                className="text-xs px-1 text-neutral-600 hover:text-red-400"
                title="Delete preset"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={savePreset}
          className="text-xs px-2 py-1.5 rounded bg-neutral-800 text-cyan-300 hover:bg-neutral-700 w-full"
        >
          + Save current style as preset
        </button>
      </Section>

      <Section title="Caption">
        <Field label="Font">
          <select
            value={style.fontFamily}
            onChange={(e) => {
              if (e.target.value === "__upload__") {
                fontInputRef.current?.click();
                return;
              }
              onChange({ fontFamily: e.target.value });
            }}
            className="bg-neutral-800 rounded px-2 py-1 text-sm w-40"
          >
            {BUILT_IN_FONTS.map((f) => (
              <option key={f} value={f}>
                {f.split(",")[0].replace(/'/g, "")}
              </option>
            ))}
            {customFonts.map((f) => (
              <option key={f.id} value={f.family}>
                {f.name}
              </option>
            ))}
            <option value="__upload__">+ Upload font...</option>
          </select>
        </Field>

        {customFonts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {customFonts.map((f) => (
              <span
                key={f.id}
                className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 flex items-center gap-1"
              >
                {f.name}
                <button onClick={() => deleteFont(f.id)} className="hover:text-red-400">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          ref={fontInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFont(file);
            e.target.value = "";
          }}
        />
        {fontUploadError && <p className="text-[11px] text-red-400">{fontUploadError}</p>}

        <Field label={`Size (${style.fontSize})`}>
          <input
            type="range"
            min={24}
            max={140}
            value={style.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="w-40"
          />
        </Field>

        <Field label={`Weight (${style.fontWeight})`}>
          <input
            type="range"
            min={400}
            max={900}
            step={100}
            value={style.fontWeight}
            onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
            className="w-40"
          />
        </Field>

        <Field label="Text color">
          <input
            type="color"
            value={style.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-7 w-14 bg-transparent"
          />
        </Field>

        <Field label="Highlight color">
          <input
            type="color"
            value={style.highlightColor}
            onChange={(e) => onChange({ highlightColor: e.target.value })}
            className="h-7 w-14 bg-transparent"
          />
        </Field>

        <Field label="Highlight bg color">
          <input
            type="color"
            value={style.highlightBackgroundColor}
            onChange={(e) => onChange({ highlightBackgroundColor: e.target.value })}
            className="h-7 w-14 bg-transparent"
          />
        </Field>

        <Field label={`Highlight bg opacity (${style.highlightBackgroundOpacity.toFixed(2)})`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={style.highlightBackgroundOpacity}
            onChange={(e) => onChange({ highlightBackgroundOpacity: Number(e.target.value) })}
            className="w-40"
          />
        </Field>

        <Field label="Background">
          <input
            type="color"
            value={style.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="h-7 w-14 bg-transparent"
          />
        </Field>

        <Field label={`Bg opacity (${style.backgroundOpacity.toFixed(2)})`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={style.backgroundOpacity}
            onChange={(e) => onChange({ backgroundOpacity: Number(e.target.value) })}
            className="w-40"
          />
        </Field>

        <Field label={`Line height (${style.lineHeight.toFixed(2)})`}>
          <input
            type="range"
            min={0.8}
            max={2}
            step={0.05}
            value={style.lineHeight}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            className="w-40"
          />
        </Field>

        <Field label={`Letter spacing (${style.letterSpacing})`}>
          <input
            type="range"
            min={-2}
            max={10}
            step={0.5}
            value={style.letterSpacing}
            onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
            className="w-40"
          />
        </Field>

        <Field label="Uppercase">
          <input
            type="checkbox"
            checked={style.uppercase}
            onChange={(e) => onChange({ uppercase: e.target.checked })}
          />
        </Field>
      </Section>

      <Section title="Animation">
        <select
          value={style.animation}
          onChange={(e) => onChange({ animation: e.target.value as CaptionAnimation })}
          className="bg-neutral-800 rounded px-2 py-1.5 text-sm w-full"
        >
          {ANIMATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Layout">
        <div className="grid grid-cols-2 gap-2">
          {POSITION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ position: opt.value })}
              className={`text-sm rounded px-2 py-1.5 border transition-colors ${
                style.position === opt.value
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                  : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {style.position === "custom" && (
          <Field label={`Y position (${style.customY}%)`}>
            <input
              type="range"
              min={0}
              max={100}
              value={style.customY}
              onChange={(e) => onChange({ customY: Number(e.target.value) })}
              className="w-40"
            />
          </Field>
        )}
      </Section>

      <Section title="Background music">
        <select
          value={musicTrackId ?? ""}
          onChange={(e) => {
            if (e.target.value === "__upload__") {
              musicInputRef.current?.click();
              return;
            }
            onMusicTrackChange(e.target.value || undefined);
          }}
          className="bg-neutral-800 rounded px-2 py-1.5 text-sm w-full"
        >
          <option value="">None</option>
          {musicTracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value="__upload__">+ Upload track...</option>
        </select>
        <input
          ref={musicInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.aac"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadMusic(file);
            e.target.value = "";
          }}
        />
        {musicUploadError && <p className="text-[11px] text-red-400">{musicUploadError}</p>}

        {musicTracks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {musicTracks.map((t) => (
              <span
                key={t.id}
                className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 flex items-center gap-1"
              >
                {t.name}
                <button onClick={() => deleteMusic(t.id)} className="hover:text-red-400">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {musicTrackId && (
          <Field label={`Volume (${musicVolume.toFixed(2)})`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              onChange={(e) => onMusicVolumeChange(Number(e.target.value))}
              className="w-40"
            />
          </Field>
        )}
        {musicTrackId && (
          <p className="text-[11px] text-neutral-500">
            Music automatically ducks under speech and returns to full volume in gaps.
          </p>
        )}
      </Section>
    </div>
  );
}
