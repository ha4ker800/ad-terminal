import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commandLogs, terminals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { enqueueCommand } from "@/lib/command_queue";
import { evaluateCommand } from "@/lib/guardrails";

/**
 * AD TERMINAL - BROADCAST API
 * Execute commands on ALL connected terminals simultaneously
 */

// POST /api/broadcast - Broadcast command to all online terminals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      command, 
      executionMode = "adgodmode",
      filter, // Optional filter: { osType: "linux" }, { status: "online" }, etc.
      excludeTerminalIds = [] 
    } = body;

    if (!command) {
      return NextResponse.json(
        { success: false, error: "Command is required" },
        { status: 400 }
      );
    }

    // Guardrail check
    const guardrailCheck = evaluateCommand(command, executionMode, false);
    if (!guardrailCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: guardrailCheck.reason,
        guardrailCheck,
      }, { status: 403 });
    }

    // Build query for target terminals
    let query = db.select().from(terminals).where(eq(terminals.status, "online"));
    
    // Apply filters if provided
    if (filter) {
      if (filter.osType) {
        query = db.select().from(terminals).where(
          and(eq(terminals.status, "online"), eq(terminals.osType, filter.osType))
        );
      }
    }

    const targetTerminals = await query;
    
    // Exclude specified terminals
    const filteredTerminals = targetTerminals.filter(
      t => !excludeTerminalIds.includes(t.id)
    );

    if (filteredTerminals.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No online terminals match the criteria",
      }, { status: 400 });
    }

    // Queue commands for all terminals
    const results = await Promise.all(
      filteredTerminals.map(async (terminal) => {
        try {
          // Create log entry
          const [logEntry] = await db
            .insert(commandLogs)
            .values({
              terminalId: terminal.id,
              command,
              executionMode,
              status: "pending",
            })
            .returning();

          // Queue the command
          const queuedCmd = await enqueueCommand(terminal.id, command, executionMode);

          return {
            terminalId: terminal.id,
            terminalName: terminal.deviceName,
            success: true,
            commandId: logEntry.id,
            queueId: queuedCmd.id,
          };
        } catch (error) {
          return {
            terminalId: terminal.id,
            terminalName: terminal.deviceName,
            success: false,
            error: error instanceof Error ? error.message : "Failed to queue",
          };
        }
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      success: true,
      message: `Broadcast to ${successful.length}/${filteredTerminals.length} terminals`,
      command,
      executionMode,
      targetCount: filteredTerminals.length,
      successful: successful.length,
      failed: failed.length,
      results,
    });

  } catch (error) {
    console.error("[AD TERMINAL :: BROADCAST ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Broadcast failed" },
      { status: 500 }
    );
  }
}

// GET /api/broadcast/status - Get broadcast status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const terminalIds = searchParams.get("terminals")?.split(",") || [];

  try {
    // Get pending command counts for terminals
    const statuses = await Promise.all(
      terminalIds.map(async (id) => {
        const pending = await db
          .select()
          .from(commandLogs)
          .where(and(
            eq(commandLogs.terminalId, id),
            eq(commandLogs.status, "pending")
          ));
        return { terminalId: id, pendingCommands: pending.length };
      })
    );

    return NextResponse.json({
      success: true,
      statuses,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get status" },
      { status: 500 }
    );
  }
}
