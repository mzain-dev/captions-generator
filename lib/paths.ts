import path from "path";

// Private storage: never fetched over HTTP, only read/written server-side.
export const STORAGE_ROOT = path.join(process.cwd(), "storage");

// Public media: needs to be HTTP-reachable for the browser <Player> and for Remotion's
// renderer (which fetches video frames over HTTP, not from the local filesystem). Placing
// these under public/ lets Next.js's own static file server handle them — it's the
// battle-tested option; a hand-rolled streaming route here previously proved fragile
// under Remotion's concurrent, multi-threaded frame-extraction requests during export.
export const PUBLIC_MEDIA_ROOT = path.join(process.cwd(), "public", "media");

export const projectVideoDir = (projectId: string) =>
  path.join(PUBLIC_MEDIA_ROOT, "videos", projectId);

export const projectAudioDir = (projectId: string) =>
  path.join(STORAGE_ROOT, "audio", projectId);

export const projectTranscriptDir = (projectId: string) =>
  path.join(STORAGE_ROOT, "transcripts", projectId);

export const projectRenderDir = (projectId: string) =>
  path.join(PUBLIC_MEDIA_ROOT, "renders", projectId);

export const projectsDir = () => path.join(STORAGE_ROOT, "projects");

export const projectJsonPath = (projectId: string) =>
  path.join(projectsDir(), `${projectId}.json`);

export const originalVideoPath = (projectId: string, ext: string) =>
  path.join(projectVideoDir(projectId), `original${ext}`);

export const audioPath = (projectId: string) =>
  path.join(projectAudioDir(projectId), "audio.mp3");

export const transcriptJsonPath = (projectId: string) =>
  path.join(projectTranscriptDir(projectId), "transcript.json");

// Each export gets its own file (renderId) rather than overwriting a single "final.mp4",
// so past exports remain downloadable as export history instead of being lost on re-export.
export const renderOutputPath = (projectId: string, renderId: string) =>
  path.join(projectRenderDir(projectId), `${renderId}.mp4`);

export const toPublicVideoUrl = (projectId: string, fileName: string) =>
  `/media/videos/${projectId}/${fileName}`;

export const toPublicRenderUrl = (projectId: string, renderId: string) =>
  `/media/renders/${projectId}/${renderId}.mp4`;
