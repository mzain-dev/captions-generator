import { VideoEditor } from "@/components/VideoEditor";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        No project selected.
      </div>
    );
  }

  return <VideoEditor projectId={projectId} />;
}
