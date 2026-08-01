import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, terminals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/projects - List all projects
export async function GET() {
  try {
    const allProjects = await db
      .select({
        project: projects,
        terminal: terminals,
      })
      .from(projects)
      .leftJoin(terminals, eq(projects.terminalId, terminals.id))
      .orderBy(desc(projects.createdAt));

    return NextResponse.json({
      success: true,
      projects: allProjects.map(p => ({
        ...p.project,
        terminal: p.terminal,
      })),
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Failed to fetch projects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, terminalId, projectType, gitUrl } = body;

    if (!name || !terminalId) {
      return NextResponse.json(
        { success: false, error: "Name and terminalId are required" },
        { status: 400 }
      );
    }

    // Generate local path
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase();
    const localPath = `~/ad_terminal_workspace/projects/${sanitizedName}`;

    const [newProject] = await db
      .insert(projects)
      .values({
        name,
        description,
        localPath,
        terminalId,
        projectType: projectType || "generic",
        gitUrl,
      })
      .returning();

    return NextResponse.json({
      success: true,
      project: newProject,
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Failed to create project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project" },
      { status: 500 }
    );
  }
}
