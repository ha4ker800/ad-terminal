import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { terminals, commandLogs, wsSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/terminals/[id] - Delete a terminal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related records first
    await db.delete(commandLogs).where(eq(commandLogs.terminalId, id));
    await db.delete(wsSessions).where(eq(wsSessions.terminalId, id));

    // Delete terminal
    await db.delete(terminals).where(eq(terminals.id, id));

    return NextResponse.json({
      success: true,
      message: "Terminal deleted",
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Failed to delete terminal:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete terminal" },
      { status: 500 }
    );
  }
}

// PATCH /api/terminals/[id] - Update terminal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    await db
      .update(terminals)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(terminals.id, id));

    return NextResponse.json({
      success: true,
      message: "Terminal updated",
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Failed to update terminal:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update terminal" },
      { status: 500 }
    );
  }
}
