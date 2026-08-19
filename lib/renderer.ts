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

// Bundling the Remotion project is expensive; the source doesn't change at
// runtime so we cache the bundle for the lifetime of the server process.
let bundlePromise: Promise<string> | null = null;

function getBundleLocation(): Promise<string> {
  if (!bundlePromise) {
    const entry = path.join(process.cwd(), "remotion", "index.ts");
    bundlePromise = bundle({ entryPoint: entry }).catch((err) => {
      bundlePromise = null;
      throw new RenderError("Failed to bundle the Remotion composition.", err);
    });
  }
  return bundlePromise;
}

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

  try {
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: props,
      onProgress: ({ progress }) => onProgress?.(progress),
    });
  } catch (err) {
    throw new RenderError(
      "Video rendering failed. This can happen due to missing fonts, an unsupported video codec, or insufficient system resources.",
      err
    );
  }
}
