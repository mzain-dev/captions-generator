"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptionAnimation, CaptionPosition, CaptionStyle } from "@/types/caption";
import type { CustomFont } from "@/types/font";
import type { MusicTrack } from "@/types/music";
import type { StylePreset } from "@/types/preset";
import type { LogoAsset, LogoSettings } from "@/types/logo";
import { DEFAULT_LOGO_SETTINGS, LOGO_POSITION_PRESETS } from "@/types/logo";
import type { TitleCardSettings } from "@/types/titlecard";
import { DEFAULT_INTRO_SETTINGS, DEFAULT_OUTRO_SETTINGS } from "@/types/titlecard";

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
  logos: LogoAsset[];
  onLogosChange: (logos: LogoAsset[]) => void;
  logo: LogoSettings | undefined;
  onLogoChange: (logo: LogoSettings | undefined) => void;
  intro: TitleCardSettings | undefined;
  onIntroChange: (intro: TitleCardSettings | undefined) => void;
  outro: TitleCardSettings | undefined;
  onOutroChange: (outro: TitleCardSettings | undefined) => void;
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

function TitleCardEditor({
  label,
  value,
  defaults,
  onChange,
}: {
  label: string;
  value: TitleCardSettings | undefined;
  defaults: TitleCardSettings;
  onChange: (next: TitleCardSettings | undefined) => void;
}) {
  const enabled = value?.enabled ?? false;
  const current = value ?? defaults;

  return (
    <Section title={label}>
      <Field label="Enabled">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ ...current, enabled: e.target.checked })}
        />
      </Field>

      {enabled && (
        <>
          <label className="block text-sm text-neutral-300 space-y-1">
            <span>Title</span>
            <input
              type="text"
              value={current.text}
              onChange={(e) => onChange({ ...current, text: e.target.value })}
              className="w-full bg-neutral-800 rounded px-2 py-1.5 text-sm"
            />
          </label>

          <label className="block text-sm text-neutral-300 space-y-1">
            <span>Subtitle (optional)</span>
            <input
              type="text"
              value={current.subtitle}
              onChange={(e) => onChange({ ...current, subtitle: e.target.value })}
              className="w-full bg-neutral-800 rounded px-2 py-1.5 text-sm"
            />
          </label>

          <Field label={`Duration (${current.durationInSeconds.toFixed(1)}s)`}>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={current.durationInSeconds}
              onChange={(e) => onChange({ ...current, durationInSeconds: Number(e.target.value) })}
              className="w-40"
            />
          </Field>

          <Field label="Background">
            <input
              type="color"
              value={current.backgroundColor}
              onChange={(e) => onChange({ ...current, backgroundColor: e.target.value })}
              className="h-7 w-14 bg-transparent"
            />
          </Field>

          <Field label="Text color">
            <input
              type="color"
              value={current.textColor}
              onChange={(e) => onChange({ ...current, textColor: e.target.value })}
              className="h-7 w-14 bg-transparent"
            />
          </Field>
        </>
      )}
    </Section>
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
  logos,
  onLogosChange,
  logo,
  onLogoChange,
  intro,
  onIntroChange,
  outro,
  onOutroChange,
}: EditorSidebarProps) {
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [fontUploadError, setFontUploadError] = useState<string | null>(null);
  const [musicUploadError, setMusicUploadError] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

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

  const uploadLogo = async (file: File) => {
    setLogoUploadError(null);
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch("/api/logos", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setLogoUploadError(data.error ?? "Upload failed.");
      return;
    }
    onLogosChange([...logos, data.logo]);
    onLogoChange({ ...(logo ?? DEFAULT_LOGO_SETTINGS), logoId: data.logo.id });
  };

  const deleteLogo = async (id: string) => {
    onLogosChange(logos.filter((l) => l.id !== id));
    if (logo?.logoId === id) onLogoChange(undefined);
    await fetch(`/api/logos/${id}`, { method: "DELETE" }).catch(() => {});
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

      <Section title="Logo / Watermark">
        <select
          value={logo?.logoId ?? ""}
          onChange={(e) => {
            if (e.target.value === "__upload__") {
              logoInputRef.current?.click();
              return;
            }
            if (!e.target.value) {
              onLogoChange(undefined);
              return;
            }
            onLogoChange({ ...(logo ?? DEFAULT_LOGO_SETTINGS), logoId: e.target.value });
          }}
          className="bg-neutral-800 rounded px-2 py-1.5 text-sm w-full"
        >
          <option value="">None</option>
          {logos.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
          <option value="__upload__">+ Upload logo...</option>
        </select>
        <input
          ref={logoInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadLogo(file);
            e.target.value = "";
          }}
        />
        {logoUploadError && <p className="text-[11px] text-red-400">{logoUploadError}</p>}

        {logos.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {logos.map((l) => (
              <span
                key={l.id}
                className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 flex items-center gap-1"
              >
                {l.name}
                <button onClick={() => deleteLogo(l.id)} className="hover:text-red-400">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {logo?.logoId && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {LOGO_POSITION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => onLogoChange({ ...logo, x: p.x, y: p.y })}
                  className={`text-[11px] rounded px-2 py-1 border transition-colors ${
                    logo.x === p.x && logo.y === p.y
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <Field label={`X (${logo.x}%)`}>
              <input
                type="range"
                min={0}
                max={100}
                value={logo.x}
                onChange={(e) => onLogoChange({ ...logo, x: Number(e.target.value) })}
                className="w-40"
              />
            </Field>
            <Field label={`Y (${logo.y}%)`}>
              <input
                type="range"
                min={0}
                max={100}
                value={logo.y}
                onChange={(e) => onLogoChange({ ...logo, y: Number(e.target.value) })}
                className="w-40"
              />
            </Field>
            <Field label={`Size (${logo.scale}%)`}>
              <input
                type="range"
                min={4}
                max={50}
                value={logo.scale}
                onChange={(e) => onLogoChange({ ...logo, scale: Number(e.target.value) })}
                className="w-40"
              />
            </Field>
            <Field label={`Opacity (${logo.opacity.toFixed(2)})`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={logo.opacity}
                onChange={(e) => onLogoChange({ ...logo, opacity: Number(e.target.value) })}
                className="w-40"
              />
            </Field>
            <Field label="Background">
              <input
                type="color"
                value={logo.backgroundColor}
                onChange={(e) => onLogoChange({ ...logo, backgroundColor: e.target.value })}
                className="h-7 w-14 bg-transparent"
              />
            </Field>
            <Field label={`Bg opacity (${logo.backgroundOpacity.toFixed(2)})`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={logo.backgroundOpacity}
                onChange={(e) => onLogoChange({ ...logo, backgroundOpacity: Number(e.target.value) })}
                className="w-40"
              />
            </Field>
            {logo.backgroundOpacity > 0 && (
              <Field label={`Bg padding (${logo.backgroundPadding}px)`}>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={logo.backgroundPadding}
                  onChange={(e) => onLogoChange({ ...logo, backgroundPadding: Number(e.target.value) })}
                  className="w-40"
                />
              </Field>
            )}
          </>
        )}
      </Section>

      <TitleCardEditor label="Intro card" value={intro} defaults={DEFAULT_INTRO_SETTINGS} onChange={onIntroChange} />
      <TitleCardEditor label="Outro card" value={outro} defaults={DEFAULT_OUTRO_SETTINGS} onChange={onOutroChange} />
    </div>
  );
}
