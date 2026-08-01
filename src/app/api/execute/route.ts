import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commandLogs, terminals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { evaluateCommand } from "@/lib/guardrails";
import { generateCommand, generateCommandParallel, type DeviceTelemetry } from "@/lib/token_manager";

// POST /api/execute - Execute a command on a terminal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { terminalId, command, executionMode = "single", useAI = false, prompt } = body;

    if (!terminalId) {
      return NextResponse.json(
        { success: false, error: "Terminal ID is required" },
        { status: 400 }
      );
    }

    // Get terminal info
    const terminalResult = await db
      .select()
      .from(terminals)
      .where(eq(terminals.id, terminalId))
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

    // Determine actual command to execute
    let commandToExecute = command;
    let aiModelUsed: string | undefined;
    let aiPrompt: string | undefined;
    let aiResponse: string | undefined;
    let tokensUsed = 0;

    // If useAI is enabled, generate command from prompt
    if (useAI && prompt) {
      const telemetry: DeviceTelemetry = {
        osType: terminal.osType || "unknown",
        osVersion: terminal.osVersion || undefined,
        kernel: terminal.kernel || undefined,
        cpuCores: terminal.cpuCores || undefined,
        totalRamMb: terminal.totalRamMb || undefined,
        freeRamMb: terminal.freeRamMb || undefined,
        batteryLevel: terminal.batteryLevel || undefined,
        installedTools: terminal.installedTools || undefined,
      };

      try {
        let result;
        
        if (executionMode === "parallel") {
          result = await generateCommandParallel(prompt, telemetry);
          aiResponse = result.comparison;
        } else {
          result = await generateCommand(prompt, undefined, telemetry);
        }

        commandToExecute = result.command;
        aiModelUsed = result.model;
        aiPrompt = prompt;
        aiResponse = result.command;
        tokensUsed = result.tokens;
      } catch (error) {
        console.error("[AD TERMINAL :: AI ERROR] Command generation failed:", error);
        return NextResponse.json(
          { success: false, error: "AI command generation failed" },
          { status: 500 }
        );
      }
    }

    // Guardrail check
    const guardrailCheck = evaluateCommand(commandToExecute, executionMode, false);
    
    if (!guardrailCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: guardrailCheck.reason,
        guardrailCheck,
      }, { status: 403 });
    }

    // Create command log entry
    const [logEntry] = await db
      .insert(commandLogs)
      .values({
        terminalId,
        command: commandToExecute,
        executionMode,
        aiModelUsed,
        aiPrompt,
        aiResponse,
        status: "pending",
      })
      .returning();

    // Queue the command for the terminal to pick up via polling
    const { enqueueCommand } = await import("@/lib/command_queue");
    const queuedCmd = await enqueueCommand(terminalId, commandToExecute, executionMode);

    return NextResponse.json({
      success: true,
      message: "Command queued for terminal",
      commandId: logEntry.id,
      queueId: queuedCmd.id,
      command: commandToExecute,
      tokensUsed,
    });

  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Execute failed:", error);
    return NextResponse.json(
      { success: false, error: "Execution failed" },
      { status: 500 }
    );
  }
}
