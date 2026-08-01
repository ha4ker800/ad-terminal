/**
 * AD TERMINAL - Auto-Self-Healing System
 * Automatic error recovery for ADGODMODE protocol
 */

import { generateCommand } from "./token_manager";
import { evaluateCommand } from "./guardrails";

export interface HealingAttempt {
  attempt: number;
  originalCommand: string;
  errorOutput: string;
  healedCommand: string;
  success: boolean;
  executionTimeMs: number;
}

export interface HealingResult {
  success: boolean;
  finalCommand: string;
  attempts: HealingAttempt[];
  totalAttempts: number;
  resolved: boolean;
}

const MAX_HEALING_ATTEMPTS = 3;

/**
 * Analyze error output to determine the type of failure
 */
export function analyzeError(stderr: string, exitCode: number): {
  type: "syntax" | "missing_dependency" | "permission" | "path" | "network" | "unknown";
  details: string;
} {
  const errorLower = stderr.toLowerCase();

  // Syntax errors
  if (
    errorLower.includes("syntax error") ||
    errorLower.includes("unexpected token") ||
    errorLower.includes("parse error") ||
    errorLower.includes("invalid syntax")
  ) {
    return {
      type: "syntax",
      details: "Command syntax error detected",
    };
  }

  // Missing dependencies
  if (
    errorLower.includes("command not found") ||
    errorLower.includes("is not recognized") ||
    errorLower.includes("module not found") ||
    errorLower.includes("cannot find module") ||
    errorLower.includes("package not found")
  ) {
    return {
      type: "missing_dependency",
      details: "Missing command or dependency",
    };
  }

  // Permission errors
  if (
    errorLower.includes("permission denied") ||
    errorLower.includes("access denied") ||
    errorLower.includes("requires elevation") ||
    errorLower.includes("eacces") ||
    exitCode === 126 ||
    exitCode === 127
  ) {
    return {
      type: "permission",
      details: "Permission or access denied",
    };
  }

  // Path/file errors
  if (
    errorLower.includes("no such file") ||
    errorLower.includes("cannot find") ||
    errorLower.includes("file not found") ||
    errorLower.includes("path not found") ||
    errorLower.includes("does not exist") ||
    errorLower.includes("ENOENT")
  ) {
    return {
      type: "path",
      details: "File or path not found",
    };
  }

  // Network errors
  if (
    errorLower.includes("network") ||
    errorLower.includes("timeout") ||
    errorLower.includes("connection refused") ||
    errorLower.includes("econnrefused") ||
    errorLower.includes("ENOTFOUND") ||
    errorLower.includes("ETIMEDOUT")
  ) {
    return {
      type: "network",
      details: "Network connectivity issue",
    };
  }

  return {
    type: "unknown",
    details: "Unknown error type",
  };
}

/**
 * Generate healing prompt based on error analysis
 */
export function generateHealingPrompt(
  originalCommand: string,
  errorOutput: string,
  errorAnalysis: { type: string; details: string },
  attemptNumber: number
): string {
  const baseContext = `[AD TERMINAL :: AUTO-HEALING CYCLE ${attemptNumber}/${MAX_HEALING_ATTEMPTS}]

Original command that failed:
\`\`\`
${originalCommand}
\`\`\`

Error output:
\`\`\`
${errorOutput.substring(0, 1000)}
\`\`\`

Error analysis: ${errorAnalysis.type} - ${errorAnalysis.details}`;

  switch (errorAnalysis.type) {
    case "syntax":
      return `${baseContext}

The command has a syntax error. Please:
1. Fix any quoting issues (single vs double quotes)
2. Fix any escape character issues
3. Ensure proper command structure for the OS
4. Generate a corrected version of the command`;

    case "missing_dependency":
      return `${baseContext}

The command requires a tool that is not installed. Please:
1. First check if the tool exists with 'which <tool>' or 'where <tool>'
2. If missing, install it first (apt-get, npm install, pip install, etc.)
3. Then run the original command
4. Generate a compound command that handles both installation and execution`;

    case "permission":
      return `${baseContext}

The command failed due to permissions. Please:
1. Add 'sudo' prefix for Linux/Mac if appropriate
2. Or runas administrator for Windows if needed
3. Or check file permissions with ls -la first
4. Generate a command that handles permissions gracefully`;

    case "path":
      return `${baseContext}

The command references a file or path that doesn't exist. Please:
1. Create the directory structure if needed (mkdir -p)
2. Or check current working directory (pwd)
3. Or use absolute paths
4. Generate a command that ensures paths exist before use`;

    case "network":
      return `${baseContext}

The command failed due to network issues. Please:
1. Add retry logic with curl/wget --retry flags
2. Or add timeout handling
3. Or check connectivity first (ping/curl -I)
4. Generate a more resilient command with error handling`;

    default:
      return `${baseContext}

The command failed with an unknown error. Please:
1. Analyze the error output carefully
2. Generate an alternative approach
3. Add error handling where appropriate
4. Make the command more robust`;
  }
}

/**
 * Attempt to heal a failed command
 */
export async function attemptHealing(
  originalCommand: string,
  errorOutput: string,
  exitCode: number,
  attemptNumber: number,
  telemetry?: import("./token_manager").DeviceTelemetry
): Promise<{ healedCommand: string; tokens: number; model: string }> {
  const errorAnalysis = analyzeError(errorOutput, exitCode);
  const healingPrompt = generateHealingPrompt(originalCommand, errorOutput, errorAnalysis, attemptNumber);

  console.log(`[AD TERMINAL :: HEALING] Attempt ${attemptNumber}: ${errorAnalysis.type} error detected`);

  const result = await generateCommand(healingPrompt, undefined, telemetry);

  // Clean up the response - remove markdown code blocks if present
  let cleanedCommand = result.command
    .replace(/```[\w]*\n?/g, "")
    .replace(/```/g, "")
    .trim();

  return {
    healedCommand: cleanedCommand,
    tokens: result.tokens,
    model: result.model,
  };
}

/**
 * Execute healing cycle for a failed command
 * This is the main ADGODMODE healing loop
 */
export async function executeHealingCycle(
  originalCommand: string,
  executeFn: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number; executionTimeMs: number }>,
  telemetry?: import("./token_manager").DeviceTelemetry
): Promise<HealingResult> {
  const attempts: HealingAttempt[] = [];
  let currentCommand = originalCommand;
  let resolved = false;

  for (let i = 1; i <= MAX_HEALING_ATTEMPTS; i++) {
    const startTime = Date.now();

    // Execute the current command
    const result = await executeFn(currentCommand);
    const executionTimeMs = Date.now() - startTime;

    // Check if successful
    if (result.exitCode === 0) {
      attempts.push({
        attempt: i,
        originalCommand: i === 1 ? originalCommand : attempts[i - 2].healedCommand,
        errorOutput: "",
        healedCommand: currentCommand,
        success: true,
        executionTimeMs,
      });
      resolved = true;
      break;
    }

    // Command failed - attempt healing
    console.log(`[AD TERMINAL :: HEALING] Command failed with exit code ${result.exitCode}`);

    try {
      const healing = await attemptHealing(
        currentCommand,
        result.stderr,
        result.exitCode,
        i,
        telemetry
      );

      // Guardrail check on healed command
      const guardrailCheck = evaluateCommand(healing.healedCommand, "adgodmode");
      if (!guardrailCheck.allowed) {
        console.log(`[AD TERMINAL :: HEALING] Healed command blocked by guardrails: ${guardrailCheck.reason}`);
        attempts.push({
          attempt: i,
          originalCommand: currentCommand,
          errorOutput: result.stderr,
          healedCommand: healing.healedCommand,
          success: false,
          executionTimeMs,
        });
        break; // Stop healing cycle if guardrails block
      }

      attempts.push({
        attempt: i,
        originalCommand: currentCommand,
        errorOutput: result.stderr,
        healedCommand: healing.healedCommand,
        success: false,
        executionTimeMs,
      });

      // Update command for next iteration
      currentCommand = healing.healedCommand;

    } catch (error) {
      console.error(`[AD TERMINAL :: HEALING] Healing attempt ${i} failed:`, error);
      attempts.push({
        attempt: i,
        originalCommand: currentCommand,
        errorOutput: result.stderr,
        healedCommand: "",
        success: false,
        executionTimeMs,
      });
      break;
    }
  }

  return {
    success: resolved,
    finalCommand: resolved ? currentCommand : originalCommand,
    attempts,
    totalAttempts: attempts.length,
    resolved,
  };
}

/**
 * Generate healing report for logging
 */
export function generateHealingReport(result: HealingResult): string {
  const lines = [
    "[AD TERMINAL :: HEALING REPORT]",
    `Status: ${result.resolved ? "RESOLVED" : "UNRESOLVED"}`,
    `Attempts: ${result.totalAttempts}/${MAX_HEALING_ATTEMPTS}`,
    "",
    "Attempt Details:",
  ];

  for (const attempt of result.attempts) {
    lines.push(`  Attempt ${attempt.attempt}:`);
    lines.push(`    Command: ${attempt.originalCommand.substring(0, 80)}...`);
    if (attempt.errorOutput) {
      lines.push(`    Error: ${attempt.errorOutput.substring(0, 100)}...`);
    }
    if (attempt.healedCommand) {
      lines.push(`    Healed: ${attempt.healedCommand.substring(0, 80)}...`);
    }
    lines.push(`    Success: ${attempt.success ? "YES" : "NO"}`);
    lines.push("");
  }

  lines.push(`Final Command: ${result.finalCommand}`);

  return lines.join("\n");
}

export default {
  executeHealingCycle,
  attemptHealing,
  analyzeError,
  generateHealingReport,
  MAX_HEALING_ATTEMPTS,
};
