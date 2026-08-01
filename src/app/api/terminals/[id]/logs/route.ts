import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commandLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/terminals/[id]/logs - Get logs for a terminal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const logs = await db
      .select()
      .from(commandLogs)
      .where(eq(commandLogs.terminalId, id))
      .orderBy(desc(commandLogs.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Failed to fetch logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
