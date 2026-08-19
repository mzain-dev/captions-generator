import { VideoUploader } from "@/components/VideoUploader";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-neutral-100">Caption Editor</h1>
        <p className="text-neutral-400">
          Upload a video, get word-synced captions, and export in seconds.
        </p>
      </div>
      <VideoUploader />
    </main>
  );
}
