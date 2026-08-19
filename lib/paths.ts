import path from "path";

export const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const projectVideoDir = (projectId: string) =>
  path.join(STORAGE_ROOT, "videos", projectId);

export const projectAudioDir = (projectId: string) =>
  path.join(STORAGE_ROOT, "audio", projectId);

export const projectTranscriptDir = (projectId: string) =>
  path.join(STORAGE_ROOT, "transcripts", projectId);

export const projectRenderDir = (projectId: string) =>
  path.join(STORAGE_ROOT, "renders", projectId);

export const projectsDir = () => path.join(STORAGE_ROOT, "projects");

export const projectJsonPath = (projectId: string) =>
  path.join(projectsDir(), `${projectId}.json`);

export const originalVideoPath = (projectId: string, ext: string) =>
  path.join(projectVideoDir(projectId), `original${ext}`);

export const audioPath = (projectId: string) =>
  path.join(projectAudioDir(projectId), "audio.mp3");

export const transcriptJsonPath = (projectId: string) =>
  path.join(projectTranscriptDir(projectId), "transcript.json");

export const renderOutputPath = (projectId: string) =>
  path.join(projectRenderDir(projectId), "final.mp4");

export const toPublicVideoUrl = (projectId: string, fileName: string) =>
  `/api/media/videos/${projectId}/${fileName}`;
