import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { extractAudio, FFmpegError } from "@/lib/ffmpeg";
import { transcribeAudio, TranscriptionError } from "@/lib/openai";
import { transliterateToRoman, isRomanizableLanguage } from "@/lib/transliterate";
import { normalizeTranscript, saveTranscript, loadTranscript } from "@/lib/transcript";
import { generateCaptions } from "@/lib/captions";
import { audioPath, transcriptJsonPath } from "@/lib/paths";
import { loadProject, saveProject } from "@/lib/project";

export async function POST(request: NextRequest) {
  let projectId: string | undefined;

  try {
    const body = await request.json();
    projectId = body.projectId;
    const force = Boolean(body.force);

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const project = loadProject(projectId);
    if (!project || !project.video) {
      return NextResponse.json({ error: "Project or video not found." }, { status: 404 });
    }

    // Step 1: extract audio, reusing the cached file when available (Phase 16 optimization).
    const audioOut = audioPath(projectId);
    if (force || !fs.existsSync(audioOut)) {
      project.status = "extracting_audio";
      saveProject(project);
      try {
        await extractAudio(project.video.path, audioOut);
      } catch (err) {
        project.status = "error";
        project.error = err instanceof FFmpegError ? err.message : "Audio extraction failed.";
        saveProject(project);
        return NextResponse.json({ error: project.error }, { status: 500 });
      }
    }
    project.audioPath = audioOut;

    // Step 2: transcribe, reusing a cached transcript unless force is set.
    let transcript = force ? null : loadTranscript(transcriptJsonPath(projectId));
    if (!transcript) {
      project.status = "transcribing";
      saveProject(project);
      try {
        const raw = await transcribeAudio(audioOut);
        transcript = normalizeTranscript(raw);

        // Whisper transcribes in the spoken language's native script. For languages that
        // are far more commonly read/typed in a casual Latin-letter spelling (Roman Urdu,
        // Hinglish, Arabizi, etc.), transliterate word-by-word — preserving the per-word
        // timestamps exactly — before caching/chunking.
        if (isRomanizableLanguage(transcript.language)) {
          try {
            const romanized = await transliterateToRoman(
              transcript.words.map((w) => w.text),
              transcript.language!
            );
            transcript = {
              ...transcript,
              words: transcript.words.map((w, i) => ({ ...w, text: romanized[i] })),
            };
          } catch (err) {
            console.error(
              `Roman transliteration failed for language "${transcript.language}", keeping native script:`,
              err
            );
          }
        }

        saveTranscript(transcriptJsonPath(projectId), transcript);
      } catch (err) {
        project.status = "error";
        project.error =
          err instanceof TranscriptionError ? err.message : "Transcription failed.";
        saveProject(project);
        const status = err instanceof TranscriptionError ? err.statusCode ?? 500 : 500;
        return NextResponse.json({ error: project.error }, { status });
      }
    }

    project.transcript = transcript;
    project.captions = generateCaptions(transcript);
    project.status = "ready";
    project.error = undefined;
    project.updatedAt = new Date().toISOString();
    saveProject(project);

    return NextResponse.json({
      transcript,
      captions: project.captions,
    });
  } catch (err) {
    console.error("Transcription route failed:", err);
    if (projectId) {
      const project = loadProject(projectId);
      if (project) {
        project.status = "error";
        project.error = "Unexpected server error during transcription.";
        saveProject(project);
      }
    }
    return NextResponse.json(
      { error: "Unexpected server error during transcription." },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;
