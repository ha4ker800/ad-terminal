import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { terminals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/terminals - List all terminals
export async function GET() {
  try {
    const allTerminals = await db
      .select()
      .from(terminals)
      .orderBy(desc(terminals.connectedAt));

    return NextResponse.json({
      success: true,
      terminals: allTerminals,
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Failed to fetch terminals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch terminals" },
      { status: 500 }
    );
  }
}

// POST /api/terminals - Create a new terminal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeToken, deviceName } = body;

    if (!nodeToken) {
      return NextResponse.json(
        { success: false, error: "nodeToken is required" },
        { status: 400 }
      );
    }

    // Check if terminal already exists
    const existing = await db
      .select()
      .from(terminals)
      .where(eq(terminals.nodeToken, nodeToken))
      .limit(1);

    if (existing.length > 0) {
      // Update existing terminal
      await db
        .update(terminals)
        .set({
          deviceName: deviceName || existing[0].deviceName,
          status: "offline",
          updatedAt: new Date(),
        })
        .where(eq(terminals.id, existing[0].id));

      return NextResponse.json({
        success: true,
        message: "Terminal updated",
        terminal: existing[0],
      });
    }

    // Create new terminal
    const [newTerminal] = await db
      .insert(terminals)
      .values({
        nodeToken,
        deviceName: deviceName || `TERMINAL-${nodeToken.slice(-4)}`,
        status: "offline",
        osType: "unknown",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Terminal created",
      terminal: newTerminal,
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Failed to create terminal:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create terminal" },
      { status: 500 }
    );
  }
}
