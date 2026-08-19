import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { CaptionVideoProps } from "../remotion/CaptionVideo";

export class RenderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RenderError";
  }
}

// Bundling the Remotion project is expensive, so in production (where the source is
// fixed once deployed) we cache it for the process lifetime. In development the dev
// server runs for hours/days across many edits to remotion/*.tsx, so caching there would
// silently render against stale, possibly-mismatched code — always rebuild in dev.
let bundlePromise: Promise<string> | null = null;

function getBundleLocation(): Promise<string> {
  const entry = path.join(process.cwd(), "remotion", "index.ts");

  if (process.env.NODE_ENV !== "production") {
    return bundle({ entryPoint: entry }).catch((err) => {
      throw new RenderError("Failed to bundle the Remotion composition.", err);
    });
  }

  if (!bundlePromise) {
    bundlePromise = bundle({ entryPoint: entry }).catch((err) => {
      bundlePromise = null;
      throw new RenderError("Failed to bundle the Remotion composition.", err);
    });
  }
  return bundlePromise;
}

const MAX_RENDER_ATTEMPTS = 3;

export async function renderCaptionVideo(
  props: CaptionVideoProps,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const serveUrl = await getBundleLocation();

  let composition;
  try {
    composition = await selectComposition({
      serveUrl,
      id: "CaptionVideo",
      inputProps: props,
    });
  } catch (err) {
    throw new RenderError("Failed to prepare the video composition.", err);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RENDER_ATTEMPTS; attempt++) {
    try {
      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation: outputPath,
        inputProps: props,
        // Fetching video frames over HTTP from a dev server under high concurrency is
        // prone to intermittent "no frame found" failures — capping concurrency keeps
        // request load low enough to be reliable, at the cost of some render speed.
        concurrency: 2,
        onProgress: ({ progress }) => onProgress?.(progress),
      });
      return;
    } catch (err) {
      lastError = err;
      console.error(`Render attempt ${attempt}/${MAX_RENDER_ATTEMPTS} failed:`, err);
    }
  }

  throw new RenderError(
    "Video rendering failed. This can happen due to missing fonts, an unsupported video codec, or insufficient system resources.",
    lastError
  );
}
