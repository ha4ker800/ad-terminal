"use client";

import { useState } from "react";
import { 
  X, 
  Radio, 
  Send, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Terminal,
  Smartphone,
  Monitor,
  Server
} from "lucide-react";
import type { Terminal as TerminalType } from "@/db/schema";

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminals: TerminalType[];
}

export default function BroadcastModal({ isOpen, onClose, terminals }: BroadcastModalProps) {
  const [command, setCommand] = useState("");
  const [filter, setFilter] = useState<"all" | "android" | "linux" | "windows" | "macos">("all");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; total: number } | null>(null);

  const onlineTerminals = terminals.filter(t => t.status === "online");
  const filteredTerminals = filter === "all" 
    ? onlineTerminals 
    : onlineTerminals.filter(t => t.osType === filter);

  const handleBroadcast = async () => {
    if (!command.trim()) return;
    
    setIsBroadcasting(true);
    setResult(null);

    try {
      const response = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          executionMode: "adgodmode",
          filter: filter === "all" ? undefined : { osType: filter },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: data.successful,
          failed: data.failed,
          total: data.targetCount,
        });
      }
    } catch (error) {
      console.error("Broadcast failed:", error);
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Radio className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Broadcast Command</h2>
              <p className="text-sm text-slate-400">Execute on multiple terminals simultaneously</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Target Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Target Terminals</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: `All Online (${onlineTerminals.length})`, icon: Terminal },
                { value: "android", label: `Android (${onlineTerminals.filter(t => t.osType === "android").length})`, icon: Smartphone },
                { value: "linux", label: `Linux (${onlineTerminals.filter(t => t.osType === "linux").length})`, icon: Server },
                { value: "windows", label: `Windows (${onlineTerminals.filter(t => t.osType === "windows").length})`, icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filter === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Command Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Command to Broadcast</label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command to execute on all selected terminals..."
              className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm font-mono focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-400">
              This will execute on <strong>{filteredTerminals.length}</strong> terminals simultaneously. 
              Make sure the command is compatible with all target operating systems.
            </p>
          </div>

          {/* Result */}
          {result && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              result.failed === 0 ? "bg-green-500/10 border border-green-500/30" : "bg-yellow-500/10 border border-yellow-500/30"
            }`}>
              <CheckCircle className={`w-5 h-5 ${result.failed === 0 ? "text-green-500" : "text-yellow-500"}`} />
              <p className="text-sm">
                Broadcast complete: <strong>{result.success}</strong> succeeded, <strong>{result.failed}</strong> failed out of <strong>{result.total}</strong> terminals
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBroadcast}
              disabled={isBroadcasting || !command.trim() || filteredTerminals.length === 0}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isBroadcasting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Broadcast to {filteredTerminals.length} terminals
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
