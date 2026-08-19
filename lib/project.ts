import fs from "fs";
import path from "path";
import type { ProjectData } from "@/types/project";
import { projectJsonPath, projectsDir } from "@/lib/paths";

export function saveProject(project: ProjectData): void {
  fs.mkdirSync(projectsDir(), { recursive: true });
  fs.writeFileSync(projectJsonPath(project.projectId), JSON.stringify(project, null, 2), "utf-8");
}

export function loadProject(projectId: string): ProjectData | null {
  const file = projectJsonPath(projectId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as ProjectData;
}

export function listProjects(): ProjectData[] {
  const dir = projectsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as ProjectData)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function deleteProject(projectId: string): void {
  const file = projectJsonPath(projectId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
