import { NextRequest, NextResponse } from "next/server";
import { generatePatch, validatePatch, type PatchRequest } from "@/lib/ast/patcher";

// POST /api/projects/patch - Apply code patches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, originalContent, operations, language } = body;

    if (!filePath || !originalContent || !operations) {
      return NextResponse.json(
        { success: false, error: "filePath, originalContent, and operations are required" },
        { status: 400 }
      );
    }

    const patchRequest: PatchRequest = {
      filePath,
      language: language || "javascript",
      operations,
    };

    // Generate the patch
    const patch = generatePatch(patchRequest, originalContent);

    // Validate the patch
    const validation = validatePatch(patch);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: "Patch validation failed",
        validationErrors: validation.errors,
        patch,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      patch,
      diff: generatePatch(patchRequest, originalContent),
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] Patch generation failed:", error);
    return NextResponse.json(
      { success: false, error: "Patch generation failed" },
      { status: 500 }
    );
  }
}

// Helper function to generate diff for display
function generatePatchDisplay(patchRequest: PatchRequest, original: string) {
  // This would generate a nice diff display
  return generatePatch(patchRequest, original);
}
