import type { Caption, CaptionGenerationOptions, CaptionWord } from "@/types/caption";
import type { ScriptMode, Transcript, TranscriptWord } from "@/types/transcript";
import { DEFAULT_CAPTION_GENERATION_OPTIONS } from "@/types/caption";

const SENTENCE_END_RE = /[.!?]["')\]]?$/;

/**
 * Groups word-level transcript timestamps into caption chunks using simple rules:
 * word count, character budget, and sentence-ending punctuation as a natural break point.
 * For romanizable languages, pass scriptMode "roman" to chunk the transliterated words
 * instead of the native-script ones (falls back to native if no romanization exists).
 */
export function generateCaptions(
  transcript: Transcript,
  options: CaptionGenerationOptions = DEFAULT_CAPTION_GENERATION_OPTIONS,
  scriptMode: ScriptMode = "native"
): Caption[] {
  const sourceWords =
    scriptMode === "roman" && transcript.romanizedWords ? transcript.romanizedWords : transcript.words;

  const captions: Caption[] = [];
  let current: TranscriptWord[] = [];
  let captionIndex = 1;

  const flush = () => {
    if (current.length === 0) return;
    captions.push(buildCaption(`caption_${captionIndex}`, current));
    captionIndex += 1;
    current = [];
  };

  const currentCharCount = () =>
    current.reduce((sum, w) => sum + w.text.length + 1, 0);

  for (const word of sourceWords) {
    const wouldExceedChars =
      current.length > 0 &&
      currentCharCount() + word.text.length + 1 > options.maxCharsPerCaption;

    if (wouldExceedChars) {
      flush();
    }

    current.push(word);

    const reachedMaxWords = current.length >= options.maxWordsPerCaption;
    const endsSentence =
      current.length >= options.minWordsPerCaption && SENTENCE_END_RE.test(word.text);

    if (reachedMaxWords || endsSentence) {
      flush();
    }
  }

  flush();

  return captions;
}

function buildCaption(id: string, words: TranscriptWord[]): Caption {
  return {
    id,
    text: words.map((w) => w.text).join(" "),
    start: words[0].start,
    end: words[words.length - 1].end,
    words: words.map((w) => ({ text: w.text, start: w.start, end: w.end })),
  };
}

function captionFromWords(id: string, words: CaptionWord[]): Caption {
  return {
    id,
    text: words.map((w) => w.text).join(" "),
    start: words[0].start,
    end: words[words.length - 1].end,
    words,
  };
}

/** Splits a caption into two at the given word index (index becomes the first word of the second half). */
export function splitCaptionAtWordIndex(caption: Caption, index: number): [Caption, Caption] {
  if (index <= 0 || index >= caption.words.length) {
    throw new Error("Split index must be within the caption's word range.");
  }
  const first = caption.words.slice(0, index);
  const second = caption.words.slice(index);
  return [
    { ...captionFromWords(`${caption.id}_a`, first), speaker: caption.speaker },
    { ...captionFromWords(`${caption.id}_b`, second), speaker: caption.speaker },
  ];
}

/** Merges two adjacent captions into one, concatenating their words in order. */
export function mergeCaptions(a: Caption, b: Caption): Caption {
  const words = [...a.words, ...b.words].sort((w1, w2) => w1.start - w2.start);
  return { ...captionFromWords(a.id, words), speaker: a.speaker ?? b.speaker };
}

/**
 * Rebuilds a caption's word list from freeform edited text, evenly distributing
 * the caption's existing time range across the new words since per-word timestamps
 * from the transcript no longer apply once the text has been hand-edited.
 */
export function retextCaption(caption: Caption, newText: string): Caption {
  const tokens = newText.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { ...caption, text: "", words: [] };
  }
  const duration = Math.max(caption.end - caption.start, 0.05);
  const step = duration / tokens.length;
  const words: CaptionWord[] = tokens.map((text, i) => ({
    text,
    start: caption.start + i * step,
    end: caption.start + (i + 1) * step,
  }));
  return { ...caption, text: newText, words };
}

/** Adjusts a caption's start/end and proportionally rescales its word timings to fit. */
export function rescaleCaptionTiming(caption: Caption, start: number, end: number): Caption {
  const safeEnd = Math.max(end, start + 0.05);
  const oldDuration = Math.max(caption.end - caption.start, 0.001);
  const newDuration = safeEnd - start;
  const scale = newDuration / oldDuration;

  const words = caption.words.map((w) => ({
    text: w.text,
    start: start + (w.start - caption.start) * scale,
    end: start + (w.end - caption.start) * scale,
  }));

  return { ...caption, start, end: safeEnd, words };
}
