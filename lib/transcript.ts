import fs from "fs";
import path from "path";
import type { OpenAIVerboseTranscription, Transcript, TranscriptWord } from "@/types/transcript";

/**
 * Converts OpenAI's verbose_json response into our own stable Transcript format.
 * Keeping this boundary means changes to the OpenAI response shape only touch this file.
 */
export function normalizeTranscript(raw: OpenAIVerboseTranscription): Transcript {
  const words: TranscriptWord[] = (raw.words ?? []).map((w, index) => ({
    id: index + 1,
    text: w.word.trim(),
    start: w.start,
    end: w.end,
  }));

  return {
    words,
    duration: raw.duration ?? words[words.length - 1]?.end ?? 0,
    language: raw.language,
  };
}

export function saveTranscript(transcriptPath: string, transcript: Transcript): void {
  fs.mkdirSync(path.dirname(transcriptPath), { recursive: true });
  fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2), "utf-8");
}

export function loadTranscript(transcriptPath: string): Transcript | null {
  if (!fs.existsSync(transcriptPath)) return null;
  const raw = fs.readFileSync(transcriptPath, "utf-8");
  return JSON.parse(raw) as Transcript;
}
