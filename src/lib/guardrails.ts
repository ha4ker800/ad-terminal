/**
 * AD TERMINAL - UNCENSORED Guardrail System
 * Security with USER CONTROL - No forced refusals
 * Users can disable all restrictions
 */

import { getSecuritySettings } from "./settings";

export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

export interface GuardrailCheck {
  allowed: boolean;
  riskLevel: RiskLevel;
  reason?: string;
  requiresApproval: boolean;
  command: string;
  warning?: string;
  canOverride: boolean;
}

export interface GuardrailRule {
  name: string;
  pattern: RegExp;
  riskLevel: RiskLevel;
  reason: string;
  canOverride: boolean;
}

// Pattern definitions - informational only in uncensored mode
const DESTRUCTIVE_PATTERNS: GuardrailRule[] = [
  {
    name: "disk_wipe",
    pattern: /dd\s+if=.*of=\s*\/dev\/[sh]d[a-z]|mkfs\.\w+\s+\/dev\/|format\s+[C-Z]:\s*\/fs:/i,
    riskLevel: "critical",
    reason: "Disk wiping/formatting - DESTRUCTIVE OPERATION",
    canOverride: true,
  },
  {
    name: "recursive_rm_root",
    pattern: /rm\s+(-[rf]+\s+)?\/+|rm\s+(-[rf]+\s+)?~\/\.\./i,
    riskLevel: "critical",
    reason: "Recursive deletion of system directories",
    canOverride: true,
  },
  {
    name: "system_shutdown",
    pattern: /shutdown\s+-[hfr]|init\s+0|poweroff|halt\s+-p|:\(\)\{\s*:\|:&\s*};:/i,
    riskLevel: "high",
    reason: "System shutdown/reboot",
    canOverride: true,
  },
  {
    name: "ssh_key_deletion",
    pattern: /rm\s+.*~\/\.ssh\/|rm\s+.*\/etc\/ssh\/ssh_host/i,
    riskLevel: "high",
    reason: "SSH key deletion",
    canOverride: true,
  },
];

const HIGH_RISK_PATTERNS: GuardrailRule[] = [
  {
    name: "sudo_elevation",
    pattern: /sudo\s+|runas\s+|powershell\s+.*-verb\s+runas/i,
    riskLevel: "medium",
    reason: "Command requires elevated privileges",
    canOverride: true,
  },
  {
    name: "network_kill",
    pattern: /iptables\s+.*-F|ip6tables\s+.*-F|netsh\s+.*reset|ifconfig\s+.*down/i,
    riskLevel: "medium",
    reason: "Network configuration modification",
    canOverride: true,
  },
  {
    name: "package_removal",
    pattern: /apt\s+remove|apt-get\s+remove|yum\s+remove|pacman\s+-R/i,
    riskLevel: "medium",
    reason: "Package removal",
    canOverride: true,
  },
  {
    name: "process_kill_all",
    pattern: /killall\s+|pkill\s+|taskkill\s+.*\/f/i,
    riskLevel: "medium",
    reason: "Mass process termination",
    canOverride: true,
  },
];

const ALL_PATTERNS = [...DESTRUCTIVE_PATTERNS, ...HIGH_RISK_PATTERNS];

/**
 * Evaluate command - UNCENSORED MODE
 * Always allows execution, just provides warnings
 */
export function evaluateCommand(
  command: string,
  executionMode: "single" | "parallel" | "adgodmode" = "single",
  isManual: boolean = false
): GuardrailCheck {
  const settings = getSecuritySettings();
  const normalizedCommand = command.trim();

  // Check patterns for informational purposes
  for (const rule of ALL_PATTERNS) {
    if (rule.pattern.test(normalizedCommand)) {
      // UNCENSORED: Just warn, never block unless user wants guardrails
      if (settings.guardrailsEnabled && settings.requireApprovalForHighRisk && rule.riskLevel !== "none") {
        return {
          allowed: true, // STILL ALLOWED
          riskLevel: rule.riskLevel,
          reason: `[⚠️ WARNING] ${rule.reason}`,
          requiresApproval: true,
          command: normalizedCommand,
          warning: `This command has been flagged: ${rule.reason}`,
          canOverride: true,
        };
      }

      // ADGODMODE or uncensored - allow with warning only
      return {
        allowed: true,
        riskLevel: rule.riskLevel,
        reason: `[AD TERMINAL :: LOGGED] ${rule.reason}`,
        requiresApproval: false,
        command: normalizedCommand,
        warning: settings.guardrailsEnabled ? `Note: ${rule.reason}` : undefined,
        canOverride: true,
      };
    }
  }

  // No patterns matched - completely safe
  return {
    allowed: true,
    riskLevel: "none",
    reason: "[AD TERMINAL :: OK] Command approved",
    requiresApproval: false,
    command: normalizedCommand,
    canOverride: true,
  };
}

/**
 * Sanitize command
 */
export function sanitizeCommand(command: string): string {
  let sanitized = command.replace(/\x00/g, "");
  sanitized = sanitized.replace(/\$\(/g, "\\$\\(");
  return sanitized;
}

/**
 * Check if info command
 */
export function isInfoCommand(command: string): boolean {
  const infoPatterns = [
    /^\s*(uname|whoami|pwd|ls|dir|ps|top|htop|df|free|cat\s+\/proc|systeminfo|ver|echo)\s*/i,
    /^\s*(python|--version|node\s+-v|npm\s+-v|git\s+--version|gcc\s+--version)\s*$/i,
  ];
  return infoPatterns.some((pattern) => pattern.test(command));
}

/**
 * Generate audit entry
 */
export function generateAuditEntry(
  check: GuardrailCheck,
  terminalId: string,
  approved: boolean = true,
  approvedBy?: string
) {
  return {
    terminalId,
    action: check.riskLevel === "critical" || check.riskLevel === "high" 
      ? "HIGH_RISK_EXECUTED" 
      : "COMMAND_EXECUTED",
    command: check.command,
    details: {
      riskLevel: check.riskLevel,
      reason: check.reason,
      warning: check.warning,
    },
    riskLevel: check.riskLevel,
    approved: true, // Always approved in uncensored mode
    approvedBy: approvedBy || "UNCENSORED_MODE",
  };
}

export default {
  evaluateCommand,
  sanitizeCommand,
  isInfoCommand,
  generateAuditEntry,
  DESTRUCTIVE_PATTERNS,
  HIGH_RISK_PATTERNS,
};
