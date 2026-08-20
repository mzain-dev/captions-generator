import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "fluent-ffmpeg",
    "@ffmpeg-installer/ffmpeg",
    "@ffprobe-installer/ffprobe",
  ],
  async headers() {
    return [
      {
        // Remotion's renderer runs the composition from its own internal server (a
        // different origin than this app), and loads fonts via the browser's real
        // FontFace API — which is subject to CORS, unlike video/audio which it fetches
        // natively. Without this header, custom font uploads silently fail during export.
        source: "/media/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
