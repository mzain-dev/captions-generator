import type { Caption } from "@/types/caption";

function toSrtTimestamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function toVttTimestamp(seconds: number): string {
  return toSrtTimestamp(seconds).replace(",", ".");
}

export function captionsToSrt(captions: Caption[]): string {
  return captions
    .map(
      (c, i) =>
        `${i + 1}\n${toSrtTimestamp(c.start)} --> ${toSrtTimestamp(c.end)}\n${c.text}\n`
    )
    .join("\n");
}

export function captionsToVtt(captions: Caption[]): string {
  const body = captions
    .map(
      (c, i) =>
        `${i + 1}\n${toVttTimestamp(c.start)} --> ${toVttTimestamp(c.end)}\n${c.text}\n`
    )
    .join("\n");
  return `WEBVTT\n\n${body}`;
}
