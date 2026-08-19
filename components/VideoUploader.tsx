"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function VideoUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("video", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed.");
        }

        router.push(`/editor?projectId=${data.projectId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed unexpectedly.");
        setIsUploading(false);
      }
    },
    [router]
  );

  const onFileSelected = (files: FileList | null) => {
    const file = files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          onFileSelected(e.dataTransfer.files);
        }}
        className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
          isDragging ? "border-cyan-400 bg-cyan-400/5" : "border-neutral-700 hover:border-neutral-500"
        }`}
      >
        {isUploading ? (
          <>
            <div className="h-10 w-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <p className="text-neutral-300">Uploading video...</p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium text-neutral-200">Upload your video</p>
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors"
            >
              Choose MP4 or MOV
            </button>
            <p className="text-sm text-neutral-500">or drag and drop</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files)}
      />

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 w-full text-center">
          {error}
        </p>
      )}
    </div>
  );
}
