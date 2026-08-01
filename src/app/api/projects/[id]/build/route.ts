import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, terminals, commandLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/projects/[id]/build - Build/deploy a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { buildType, environment } = body;

    // Get project
    const projectResult = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (projectResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectResult[0];

    // Get terminal
    const terminalResult = await db
      .select()
      .from(terminals)
      .where(eq(terminals.id, project.terminalId || ""))
      .limit(1);

    if (terminalResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Terminal not found" },
        { status: 404 }
      );
    }

    const terminal = terminalResult[0];

    if (terminal.status !== "online") {
      return NextResponse.json(
        { success: false, error: "Terminal is offline" },
        { status: 400 }
      );
    }

    // Generate build commands based on project type
    let buildCommands: string[] = [];
    let previewUrl: string | null = null;

    switch (project.projectType) {
      case "react":
      case "nextjs":
        buildCommands = [
          `cd ${project.localPath}`,
          "npm install",
          environment === "production" ? "npm run build" : "npm run dev &",
        ];
        previewUrl = environment === "development" ? "http://localhost:3000" : null;
        break;

      case "vue":
        buildCommands = [
          `cd ${project.localPath}`,
          "npm install",
          environment === "production" ? "npm run build" : "npm run dev &",
        ];
        previewUrl = environment === "development" ? "http://localhost:5173" : null;
        break;

      case "python":
      case "flask":
      case "django":
        buildCommands = [
          `cd ${project.localPath}`,
          "pip install -r requirements.txt",
          environment === "production" 
            ? "gunicorn -b 0.0.0.0:8000 app:app"
            : "python app.py &",
        ];
        previewUrl = "http://localhost:5000";
        break;

      case "nodejs":
        buildCommands = [
          `cd ${project.localPath}`,
          "npm install",
          environment === "production" ? "npm start" : "npm run dev &",
        ];
        previewUrl = "http://localhost:3000";
        break;

      case "static":
        buildCommands = [
          `cd ${project.localPath}`,
          "python3 -m http.server 8080 &",
        ];
        previewUrl = "http://localhost:8080";
        break;

      case "android":
        buildCommands = [
          `cd ${project.localPath}`,
          "./gradlew assembleDebug",
        ];
        break;

      default:
        buildCommands = [
          `cd ${project.localPath}`,
          "ls -la",
        ];
    }

    // Log the build command
    const buildCommand = buildCommands.join(" && ");
    
    const [logEntry] = await db
      .insert(commandLogs)
      .values({
        terminalId: terminal.id,
        command: buildCommand,
        executionMode: "single",
        status: "pending",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Build initiated",
      commandId: logEntry.id,
      buildCommands,
      previewUrl,
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Build failed:", error);
    return NextResponse.json(
      { success: false, error: "Build failed" },
      { status: 500 }
    );
  }
}
