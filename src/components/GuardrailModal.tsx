"use client";

import { AlertTriangle, Shield, CheckCircle, XCircle, Terminal } from "lucide-react";
import type { GuardrailCheck } from "@/lib/guardrails";

interface GuardrailModalProps {
  isOpen: boolean;
  check: GuardrailCheck | null;
  onApprove: () => void;
  onReject: () => void;
}

export default function GuardrailModal({
  isOpen,
  check,
  onApprove,
  onReject,
}: GuardrailModalProps) {
  if (!isOpen || !check) return null;

  const getRiskColor = () => {
    switch (check.riskLevel) {
      case "critical":
        return "text-[#ff0040] border-[#ff0040]";
      case "high":
        return "text-[#ffaa00] border-[#ffaa00]";
      case "medium":
        return "text-[#00ffff] border-[#00ffff]";
      default:
        return "text-[#00ff41] border-[#00ff41]";
    }
  };

  const getRiskIcon = () => {
    switch (check.riskLevel) {
      case "critical":
        return <XCircle className="w-12 h-12 text-[#ff0040]" />;
      case "high":
        return <AlertTriangle className="w-12 h-12 text-[#ffaa00]" />;
      default:
        return <Shield className="w-12 h-12 text-[#00ffff]" />;
    }
  };

  const getRiskTitle = () => {
    switch (check.riskLevel) {
      case "critical":
        return "CRITICAL SECURITY BLOCK";
      case "high":
        return "HIGH RISK ACTION DETECTED";
      case "medium":
        return "MEDIUM RISK ACTION";
      default:
        return "SECURITY CHECK";
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`p-3 rounded-lg border ${getRiskColor()} bg-opacity-10`}
          >
            {getRiskIcon()}
          </div>
          <div>
            <h2 className={`text-xl font-bold ${getRiskColor().split(" ")[0]}`}>
              [⚠️ GUARDRAIL CHECK]
            </h2>
            <p className="text-sm text-[#008822]">
              {getRiskTitle()}
            </p>
          </div>
        </div>

        {/* Risk Level Badge */}
        <div className="mb-4">
          <span
            className={`inline-block px-3 py-1 text-xs font-bold border rounded ${getRiskColor()}`}
          >
            RISK LEVEL: {check.riskLevel.toUpperCase()}
          </span>
        </div>

        {/* Command Display */}
        <div className="mb-4">
          <p className="text-xs text-[#008822] mb-2">COMMAND TO EXECUTE:</p>
          <div className="code-block border-l-4 border-l-[#ffaa00]">
            <code className="text-[#ffaa00]">{check.command}</code>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-6 p-4 bg-[#1a1a1a] rounded border border-[#333]">
          <p className="text-xs text-[#008822] mb-1">DETECTION REASON:</p>
          <p className="text-sm text-[#00ff41]">{check.reason}</p>
        </div>

        {/* Warning for Critical */}
        {check.riskLevel === "critical" && (
          <div className="mb-6 p-4 bg-[#ff0040]/10 rounded border border-[#ff0040]/50">
            <p className="text-sm text-[#ff0040] font-bold">
              ⚠️ This command has been automatically blocked and cannot be approved.
              It matches destructive patterns that could damage the system.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {check.riskLevel !== "critical" && (
            <button
              onClick={onApprove}
              className="btn-terminal btn-terminal-cyan flex-1 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              APPROVE EXECUTION
            </button>
          )}
          <button
            onClick={onReject}
            className={`btn-terminal btn-terminal-danger flex-1 flex items-center justify-center gap-2 ${
              check.riskLevel === "critical" ? "w-full" : ""
            }`}
          >
            <XCircle className="w-4 h-4" />
            {check.riskLevel === "critical" ? "ACKNOWLEDGE" : "REJECT"}
          </button>
        </div>

        {/* Footer */}
        <p className="mt-4 text-xs text-center text-[#008822]">
          [AD TERMINAL :: SECURITY PROTOCOL v1.0]
        </p>
      </div>
    </div>
  );
}
