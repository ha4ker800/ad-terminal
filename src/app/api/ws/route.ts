import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { terminals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { 
  enqueueCommand, 
  dequeueCommand, 
  updateCommandResult,
  getCommand 
} from "@/lib/command_queue";

/**
 * AD TERMINAL - Serverless Polling API
 * HTTP-based command queue for Vercel serverless compatibility
 * Replaces WebSocket for cloud deployment
 */

// POST handler for HTTP polling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      nodeToken, 
      terminalId,
      telemetry, 
      action,
      commandId,
      stdout, 
      stderr, 
      exitCode,
      executionTimeMs 
    } = body;

    // Terminal polling for commands
    if (action === "poll" && (nodeToken || terminalId)) {
      const id = terminalId || await getTerminalIdFromToken(nodeToken);
      
      if (!id) {
        return NextResponse.json({
          success: false,
          error: "Terminal not found",
        }, { status: 404 });
      }

      // Update terminal status
      await db.update(terminals)
        .set({ 
          lastPingAt: new Date(),
          status: "online",
          ...(telemetry && {
            osType: telemetry.osType,
            osVersion: telemetry.osVersion,
            kernel: telemetry.kernel,
            cpuCores: telemetry.cpuCores,
            totalRamMb: telemetry.totalRamMb,
            freeRamMb: telemetry.freeRamMb,
            batteryLevel: telemetry.batteryLevel,
            installedTools: telemetry.installedTools,
            ipAddress: telemetry.ipAddress,
          })
        })
        .where(eq(terminals.id, id));

      // Check for pending commands
      const cmd = await dequeueCommand(id);
      
      if (cmd) {
        return NextResponse.json({
          success: true,
          hasCommand: true,
          command: {
            id: cmd.id,
            command: cmd.command,
            executionMode: cmd.executionMode,
          },
        });
      }

      return NextResponse.json({
        success: true,
        hasCommand: false,
      });
    }

    // Terminal submitting result
    if (action === "result" && commandId) {
      await updateCommandResult(commandId, {
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: exitCode ?? -1,
        executionTimeMs: executionTimeMs || 0,
      });

      // Also update in database
      const { commandLogs } = await import("@/db/schema");
      await db.update(commandLogs)
        .set({
          stdout,
          stderr,
          exitCode,
          executionTimeMs,
          status: exitCode === 0 ? "completed" : "failed",
        })
        .where(eq(commandLogs.id, commandId));

      return NextResponse.json({
        success: true,
        message: "Result stored",
      });
    }

    // Queue new command
    if (action === "enqueue" && terminalId && body.command) {
      const cmd = await enqueueCommand(
        terminalId, 
        body.command, 
        body.executionMode || "single"
      );

      return NextResponse.json({
        success: true,
        commandId: cmd.id,
        message: "Command queued",
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action or missing parameters",
    }, { status: 400 });

  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Queue failed:", error);
    return NextResponse.json(
      { success: false, error: "Request failed" },
      { status: 500 }
    );
  }
}

// GET handler for status
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "AD TERMINAL Serverless Polling API",
    protocol: "HTTP Polling (WebSocket fallback for local dev)",
    actions: ["poll", "result", "enqueue"],
  });
}

async function getTerminalIdFromToken(nodeToken: string): Promise<string | null> {
  const result = await db.select({ id: terminals.id })
    .from(terminals)
    .where(eq(terminals.nodeToken, nodeToken))
    .limit(1);
  
  return result[0]?.id || null;
}
