"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface VideoUploaderProps {
  onBatchComplete?: () => void;
}

interface FileProgress {
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function VideoUploader({ onBatchComplete }: VideoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<FileProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadOne = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("video", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed.");
    return data.projectId as string;
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setError(null);

      // A single file gets the familiar "upload then jump straight into the editor" flow.
      if (files.length === 1) {
        setQueue([{ name: files[0].name, status: "uploading" }]);
        try {
          const projectId = await uploadOne(files[0]);
          router.push(`/editor?projectId=${projectId}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload failed unexpectedly.");
          setQueue(null);
        }
        return;
      }

      // Multiple files: upload sequentially (keeps ffmpeg normalization from piling up)
      // and land on the project list when done instead of jumping into one editor.
      setQueue(files.map((f) => ({ name: f.name, status: "pending" })));
      for (let i = 0; i < files.length; i++) {
        setQueue((prev) =>
          prev?.map((p, idx) => (idx === i ? { ...p, status: "uploading" } : p)) ?? null
        );
        try {
          await uploadOne(files[i]);
          setQueue((prev) =>
            prev?.map((p, idx) => (idx === i ? { ...p, status: "done" } : p)) ?? null
          );
        } catch (err) {
          setQueue((prev) =>
            prev?.map((p, idx) =>
              idx === i
                ? { ...p, status: "error", error: err instanceof Error ? err.message : "Failed" }
                : p
            ) ?? null
          );
        }
      }
      onBatchComplete?.();
    },
    [router, uploadOne, onBatchComplete]
  );

  const onFileSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFiles(Array.from(files));
  };

  const isUploading = queue !== null && queue.some((f) => f.status === "pending" || f.status === "uploading");
  const isBatchDone = queue !== null && !isUploading;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl">
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
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
        {queue && queue.length > 1 ? (
          <div className="w-full px-8 space-y-1.5 max-h-full overflow-y-auto py-4">
            {queue.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <StatusDot status={f.status} />
                <span className="text-neutral-300 truncate flex-1">{f.name}</span>
                <span className="text-xs text-neutral-500">{f.status}</span>
              </div>
            ))}
          </div>
        ) : isUploading ? (
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
            <p className="text-sm text-neutral-500">or drag and drop — select multiple to batch upload</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,.mp4,.mov"
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files)}
      />

      {isBatchDone && queue.length > 1 && (
        <button
          onClick={() => setQueue(null)}
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          Upload more
        </button>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 w-full text-center">
          {error}
        </p>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: FileProgress["status"] }) {
  const color =
    status === "done"
      ? "bg-emerald-400"
      : status === "error"
      ? "bg-red-400"
      : status === "uploading"
      ? "bg-cyan-400 animate-pulse"
      : "bg-neutral-600";
  return <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />;
}
