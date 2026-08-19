"use client";

import type { CaptionAnimation, CaptionPosition, CaptionStyle } from "@/types/caption";

interface EditorSidebarProps {
  style: CaptionStyle;
  onChange: (patch: Partial<CaptionStyle>) => void;
}

const FONT_OPTIONS = [
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

export function EditorSidebar({ style, onChange }: EditorSidebarProps) {
  return (
    <div className="w-72 shrink-0 border-r border-neutral-800 bg-neutral-900/40 overflow-y-auto px-4 py-5 space-y-6">
      <Section title="Caption">
        <Field label="Font">
          <select
            value={style.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="bg-neutral-800 rounded px-2 py-1 text-sm w-40"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f.split(",")[0].replace(/'/g, "")}
              </option>
            ))}
          </select>
        </Field>

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
    </div>
  );
}
