export interface TranscriptWord {
  id: number;
  text: string;
  start: number;
  end: number;
}

export interface Transcript {
  words: TranscriptWord[];
  duration: number;
  language?: string;
}

export interface OpenAIVerboseSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface OpenAIVerboseWord {
  word: string;
  start: number;
  end: number;
}

export interface OpenAIVerboseTranscription {
  task?: string;
  language?: string;
  duration?: number;
  text: string;
  segments?: OpenAIVerboseSegment[];
  words?: OpenAIVerboseWord[];
}
