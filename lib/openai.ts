import fs from "fs";
import OpenAI from "openai";
import type { OpenAIVerboseTranscription } from "@/types/transcript";

export class TranscriptionError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "TranscriptionError";
  }
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TranscriptionError(
      "OPENAI_API_KEY is not configured on the server. Add it to .env.local.",
      500
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function transcribeAudio(audioPath: string): Promise<OpenAIVerboseTranscription> {
  if (!fs.existsSync(audioPath)) {
    throw new TranscriptionError("Audio file not found for transcription.", 400);
  }

  const openai = getClient();

  try {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    });

    return response as unknown as OpenAIVerboseTranscription;
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 401) {
      throw new TranscriptionError("Invalid OpenAI API key.", 401);
    }
    if (error.status === 429) {
      throw new TranscriptionError("OpenAI rate limit reached. Please try again shortly.", 429);
    }
    throw new TranscriptionError(
      error.message ?? "Transcription failed unexpectedly.",
      error.status ?? 500
    );
  }
}
