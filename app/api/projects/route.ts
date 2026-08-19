import { NextResponse } from "next/server";
import { listProjects } from "@/lib/project";

export async function GET() {
  const projects = listProjects();
  return NextResponse.json({ projects });
}

export const runtime = "nodejs";
