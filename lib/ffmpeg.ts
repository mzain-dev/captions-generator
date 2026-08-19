import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export class FFmpegError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "FFmpegError";
  }
}

export interface VideoProbeResult {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
}

export function probeVideo(videoPath: string): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) {
        reject(new FFmpegError("Failed to read video metadata. The file may be corrupt.", err));
        return;
      }

      const videoStream = data.streams.find((s) => s.codec_type === "video");
      if (!videoStream) {
        reject(new FFmpegError("No video stream found in the uploaded file."));
        return;
      }

      let fps = 30;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
        if (den) fps = num / den;
      }

      resolve({
        width: videoStream.width ?? 1080,
        height: videoStream.height ?? 1920,
        fps: Math.round(fps) || 30,
        durationInSeconds: data.format.duration ?? 0,
      });
    });
  });
}

/**
 * Re-encodes an uploaded video to a constant-frame-rate H.264/AAC MP4.
 *
 * Arbitrary user uploads (phone recordings, screen captures, editor exports) can have
 * GOP/keyframe structures that Remotion's frame-accurate compositor fails to seek into
 * partway through the file ("No frame found at position X"). Normalizing every upload
 * to a known-good encode up front avoids that class of render failure entirely.
 *
 * The keyframe interval is kept short (every ~0.5s) so that when the editor's Player
 * corrects for audio/video drift with a seek, the browser only has to decode a fraction
 * of a second from the nearest keyframe instead of stalling for up to a full GOP —
 * otherwise those routine corrective seeks show up as a visible stutter/rewind.
 */
export function normalizeVideo(
  inputPath: string,
  outputPath: string,
  fps: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const keyframeInterval = Math.max(1, Math.round(fps / 2));

    ffmpeg(inputPath)
      .videoCodec("libx264")
      .outputOptions([
        `-r ${fps}`,
        "-vsync cfr",
        "-profile:v high",
        "-pix_fmt yuv420p",
        `-g ${keyframeInterval}`,
        `-keyint_min ${keyframeInterval}`,
        "-sc_threshold 0",
        "-movflags +faststart",
      ])
      .audioCodec("aac")
      .audioBitrate("128k")
      .on("error", (err) => {
        reject(new FFmpegError("FFmpeg failed to normalize the uploaded video.", err));
      })
      .on("end", () => resolve(outputPath))
      .save(outputPath);
  });
}

export function extractAudio(videoPath: string, outputAudioPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(outputAudioPath), { recursive: true });

    if (!fs.existsSync(videoPath)) {
      reject(new FFmpegError("Source video file not found."));
      return;
    }

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioChannels(1)
      .audioFrequency(16000)
      .audioBitrate("64k")
      .on("error", (err) => {
        reject(new FFmpegError("FFmpeg failed to extract audio from the video.", err));
      })
      .on("end", () => resolve(outputAudioPath))
      .save(outputAudioPath);
  });
}
