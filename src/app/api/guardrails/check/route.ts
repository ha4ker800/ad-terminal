import { NextRequest, NextResponse } from "next/server";
import { evaluateCommand } from "@/lib/guardrails";

// POST /api/guardrails/check - Check a command against guardrails
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, executionMode } = body;

    if (!command) {
      return NextResponse.json(
        { success: false, error: "Command is required" },
        { status: 400 }
      );
    }

    const check = evaluateCommand(
      command,
      executionMode || "single",
      false
    );

    return NextResponse.json(check);
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Guardrail check failed:", error);
    return NextResponse.json(
      { 
        allowed: false, 
        riskLevel: "critical",
        reason: "[AD TERMINAL :: ERROR] Guardrail evaluation failed",
        requiresApproval: false,
        command: ""
      },
      { status: 500 }
    );
  }
}
