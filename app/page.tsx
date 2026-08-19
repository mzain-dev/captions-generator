"use client";

import { useState } from "react";
import { VideoUploader } from "@/components/VideoUploader";
import { ProjectList } from "@/components/ProjectList";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="flex-1 flex flex-col items-center gap-10 px-6 py-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-neutral-100">Caption Editor</h1>
        <p className="text-neutral-400">
          Upload a video, get word-synced captions, and export in seconds.
        </p>
      </div>
      <VideoUploader onBatchComplete={() => setRefreshKey((k) => k + 1)} />
      <ProjectList refreshKey={refreshKey} />
    </main>
  );
}
