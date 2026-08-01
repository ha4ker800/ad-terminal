"use client";

import { useState } from "react";
import {
  Smartphone,
  Monitor,
  Server,
  Battery,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Wifi,
  WifiOff,
  Cpu,
  HardDrive,
  Play,
  Square,
  Terminal,
  MoreVertical,
  Trash2,
  Power,
} from "lucide-react";
import type { Terminal as TerminalType } from "@/db/schema";

interface TerminalCardProps {
  terminal: TerminalType;
  isSelected: boolean;
  onSelect: () => void;
  onExecute: (command: string) => void;
  onDisconnect?: (terminalId: string) => void;
}

export default function TerminalCard({
  terminal,
  isSelected,
  onSelect,
  onExecute,
  onDisconnect,
}: TerminalCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [quickCommand, setQuickCommand] = useState("");

  const getDeviceIcon = () => {
    switch (terminal.osType) {
      case "android":
        return <Smartphone className="w-5 h-5" />;
      case "windows":
        return <Monitor className="w-5 h-5" />;
      case "linux":
      case "macos":
        return <Server className="w-5 h-5" />;
      default:
        return <Terminal className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (terminal.status) {
      case "online":
        return "bg-[#00ff41] shadow-[0_0_10px_#00ff41]";
      case "offline":
        return "bg-[#ff0040] shadow-[0_0_10px_#ff0040]";
      case "busy":
        return "bg-[#ffaa00] shadow-[0_0_10px_#ffaa00]";
      case "error":
        return "bg-[#ff00ff] shadow-[0_0_10px_#ff00ff]";
      default:
        return "bg-[#333]";
    }
  };

  const getBatteryIcon = () => {
    if (!terminal.batteryLevel) return null;
    if (terminal.batteryLevel > 50) return <Battery className="w-4 h-4 text-[#00ff41]" />;
    if (terminal.batteryLevel > 20) return <BatteryMedium className="w-4 h-4 text-[#ffaa00]" />;
    if (terminal.batteryLevel > 10) return <BatteryLow className="w-4 h-4 text-[#ff0040]" />;
    return <BatteryWarning className="w-4 h-4 text-[#ff0040] animate-pulse" />;
  };

  const formatRam = (mb?: number | null) => {
    if (!mb) return "Unknown";
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  const handleQuickExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCommand.trim()) {
      onExecute(quickCommand);
      setQuickCommand("");
    }
  };

  return (
    <div
      className={`glass-card p-3 sm:p-4 transition-all cursor-pointer ${
        isSelected
          ? "border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.3)]"
          : "border-[#222] hover:border-[#00ff41]/50"
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={`p-1.5 sm:p-2 rounded bg-[#00ff41]/10 text-[#00ff41] flex-shrink-0`}>
            {getDeviceIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[#00ff41] text-sm truncate">
              {terminal.deviceName || `TERMINAL-${terminal.nodeToken.slice(-4)}`}
            </h3>
            <p className="text-xs text-[#008822] font-mono truncate">
              {terminal.nodeToken}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-[#008822] hover:text-[#00ff41] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a1a] border border-[#333] rounded shadow-xl z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onDisconnect?.(terminal.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[#ff0040] hover:bg-[#ff0040]/10 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> REMOVE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="flex items-center gap-2 text-[#00ff41]/70">
          <Cpu className="w-3 h-3" />
          <span>{terminal.cpuCores || "?"} Cores</span>
        </div>
        <div className="flex items-center gap-2 text-[#00ff41]/70">
          <HardDrive className="w-3 h-3" />
          <span>{formatRam(terminal.freeRamMb)} free</span>
        </div>
        {terminal.batteryLevel && (
          <div className="flex items-center gap-2 text-[#00ff41]/70">
            {getBatteryIcon()}
            <span>{terminal.batteryLevel}%</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[#00ff41]/70">
          {terminal.status === "online" ? (
            <Wifi className="w-3 h-3 text-[#00ff41]" />
          ) : (
            <WifiOff className="w-3 h-3 text-[#ff0040]" />
          )}
          <span>{terminal.status.toUpperCase()}</span>
        </div>
      </div>

      {/* OS Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 text-xs bg-[#00ff41]/10 text-[#00ff41] rounded border border-[#00ff41]/30">
          {terminal.osType?.toUpperCase() || "UNKNOWN"}
        </span>
        {terminal.osVersion && (
          <span className="text-xs text-[#008822]">{terminal.osVersion}</span>
        )}
      </div>

      {/* Quick Execute */}
      <form onSubmit={handleQuickExecute} className="flex gap-2">
        <input
          type="text"
          value={quickCommand}
          onChange={(e) => setQuickCommand(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="Quick command..."
          className="input-terminal flex-1 text-xs py-2"
        />
        <button
          type="submit"
          onClick={(e) => e.stopPropagation()}
          disabled={terminal.status !== "online"}
          className="px-3 py-2 bg-[#00ff41] text-black text-xs font-bold hover:bg-[#00cc33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-3 h-3" />
        </button>
      </form>

      {/* Last Seen */}
      {terminal.lastPingAt && (
        <p className="mt-2 text-xs text-[#008822]">
          Last seen: {new Date(terminal.lastPingAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
