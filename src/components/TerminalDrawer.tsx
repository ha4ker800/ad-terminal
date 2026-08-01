"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Minimize2,
  Maximize2,
  Send,
  Trash,
  Download,
  Play,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { CommandLog } from "@/db/schema";

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  terminalId?: string;
  terminalName?: string;
  logs: CommandLog[];
  onExecute: (command: string) => void;
  executionMode: "single" | "parallel" | "adgodmode";
  isExecuting: boolean;
}

export default function TerminalDrawer({
  isOpen,
  onClose,
  terminalId,
  terminalName,
  logs,
  onExecute,
  executionMode,
  isExecuting,
}: TerminalDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [command, setCommand] = useState("");
  const [activeTab, setActiveTab] = useState<"console" | "ai" | "preview">("console");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isOpen) return null;

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isExecuting) {
      onExecute(command);
      setCommand("");
    }
  };

  const handleClear = () => {
    // Clear would be handled by parent
  };

  const handleExport = () => {
    const content = logs
      .map(
        (log) =>
          `[${new Date(log.createdAt || "").toISOString()}] $${log.command}\n${
            log.stdout || ""
          }\n${log.stderr || ""}\nExit: ${log.exitCode}\n---`
      )
      .join("\n\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-terminal-${terminalName || "session"}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getExecutionModeColor = () => {
    switch (executionMode) {
      case "single":
        return "text-[#00ff41] border-[#00ff41]";
      case "parallel":
        return "text-[#00ffff] border-[#00ffff]";
      case "adgodmode":
        return "text-[#ff00ff] border-[#ff00ff] animate-pulse";
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-[#00ff41]/30 transition-all duration-300 z-40 ${
        isExpanded ? "h-[80vh]" : "h-[400px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-[#222]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#00ff41] font-bold text-sm">
              {terminalName || "TERMINAL CONSOLE"}
            </span>
            <span className="text-xs text-[#008822] font-mono">
              {terminalId?.slice(0, 8)}...
            </span>
          </div>
          <div
            className={`px-2 py-0.5 text-xs border rounded ${getExecutionModeColor()}`}
          >
            {executionMode.toUpperCase()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="hidden sm:flex items-center gap-1 mr-4">
            <button
              onClick={() => setActiveTab("console")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "console"
                  ? "bg-[#00ff41] text-black"
                  : "text-[#00ff41] hover:bg-[#00ff41]/10"
              }`}
            >
              CONSOLE
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "ai"
                  ? "bg-[#00ff41] text-black"
                  : "text-[#00ff41] hover:bg-[#00ff41]/10"
              }`}
            >
              AI LOG
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-[#00ff41] text-black"
                  : "text-[#00ff41] hover:bg-[#00ff41]/10"
              }`}
            >
              PREVIEW
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handleExport}
            className="p-1.5 text-[#008822] hover:text-[#00ff41] transition-colors"
            title="Export logs"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 text-[#008822] hover:text-[#00ff41] transition-colors"
            title="Clear console"
          >
            <Trash className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[#008822] hover:text-[#00ff41] transition-colors"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[#008822] hover:text-[#ff0040] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100% - 48px - 56px)' }}>
        {activeTab === "console" && (
          <>
            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-[#008822] py-8">
                  <p>[AD TERMINAL :: NO OUTPUT]</p>
                  <p className="text-xs mt-2">
                    Execute commands to see output here
                  </p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={log.id || index} className="space-y-1">
                    {/* Command */}
                    <div className="flex items-start gap-2">
                      <span className="text-[#00ff41]">$</span>
                      <span className="text-[#00ff41] break-all">
                        {log.command}
                      </span>
                      {log.status === "completed" && (
                        <CheckCircle className="w-3 h-3 text-[#00ff41] flex-shrink-0 mt-0.5" />
                      )}
                      {log.status === "failed" && (
                        <AlertTriangle className="w-3 h-3 text-[#ff0040] flex-shrink-0 mt-0.5" />
                      )}
                      {log.status === "pending" && (
                        <Loader2 className="w-3 h-3 text-[#ffaa00] animate-spin flex-shrink-0 mt-0.5" />
                      )}
                    </div>

                    {/* Output */}
                    {log.stdout && (
                      <div className="pl-4 text-[#00ff41]/80 whitespace-pre-wrap">
                        {log.stdout}
                      </div>
                    )}

                    {/* Error */}
                    {log.stderr && (
                      <div className="pl-4 text-[#ff0040] whitespace-pre-wrap">
                        {log.stderr}
                      </div>
                    )}

                    {/* Exit Code */}
                    {log.exitCode !== undefined && log.exitCode !== null && (
                      <div
                        className={`pl-4 text-xs ${
                          log.exitCode === 0
                            ? "text-[#008822]"
                            : "text-[#ff0040]"
                        }`}
                      >
                        [Exit Code: {log.exitCode}]
                        {log.executionTimeMs &&
                          ` (${log.executionTimeMs}ms)`}
                      </div>
                    )}

                    {/* AI Info */}
                    {log.aiModelUsed && (
                      <div className="pl-4 text-xs text-[#00ffff]/60">
                        [AI: {log.aiModelUsed}]
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-b border-[#222] my-2" />
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </>
        )}

        {activeTab === "ai" && (
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {logs.filter((l) => l.aiPrompt).length === 0 ? (
              <div className="text-center text-[#008822] py-8">
                <p>[AD TERMINAL :: NO AI INTERACTIONS]</p>
              </div>
            ) : (
              logs
                .filter((l) => l.aiPrompt)
                .map((log, index) => (
                  <div key={index} className="mb-4 p-3 bg-[#111] rounded border border-[#222]">
                    <div className="text-[#00ffff] text-xs mb-2">
                      [AI REQUEST - {log.aiModelUsed}]
                    </div>
                    <div className="text-[#00ff41]/70 whitespace-pre-wrap text-xs mb-2">
                      {log.aiPrompt}
                    </div>
                    <div className="text-[#00ffff] text-xs mb-1">
                      [AI RESPONSE]
                    </div>
                    <div className="text-[#00ff41] whitespace-pre-wrap text-xs">
                      {log.aiResponse}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {activeTab === "preview" && (
          <div className="flex-1 bg-white">
            <iframe
              src="about:blank"
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleExecute}
        className="px-4 py-3 bg-[#111] border-t border-[#222] flex gap-2 flex-shrink-0"
      >
        <span className="text-[#00ff41] py-2">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter command or ask AI..."
          disabled={isExecuting}
          className="input-terminal flex-1"
        />
        <button
          type="submit"
          disabled={isExecuting || !command.trim()}
          className="px-4 py-2 bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isExecuting ? "EXECUTING..." : "EXECUTE"}
        </button>
      </form>
    </div>
  );
}
