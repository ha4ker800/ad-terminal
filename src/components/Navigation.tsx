"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Terminal, Plus, Settings, Menu, X, Zap, ChevronDown, Code } from "lucide-react";

interface NavigationProps {
  onAddTerminal: () => void;
  godModeActive: boolean;
  onToggleGodMode: () => void;
  executionMode: "single" | "parallel" | "adgodmode";
  onChangeMode: (mode: "single" | "parallel" | "adgodmode") => void;
}

export default function Navigation({
  onAddTerminal,
  godModeActive,
  onToggleGodMode,
  executionMode,
  onChangeMode,
}: NavigationProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [statusIndicator, setStatusIndicator] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 1000);

    const blinkInterval = setInterval(() => {
      setStatusIndicator((prev) => !prev);
    }, 1000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(blinkInterval);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "T") {
        e.preventDefault();
        onAddTerminal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onAddTerminal]);

  const getModeLabel = () => {
    switch (executionMode) {
      case "single":
        return "SINGLE";
      case "parallel":
        return "PARALLEL";
      case "adgodmode":
        return "ADGODMODE";
      default:
        return "SINGLE";
    }
  };

  const getModeColor = () => {
    switch (executionMode) {
      case "single":
        return "text-[#00ff41] border-[#00ff41]";
      case "parallel":
        return "text-[#00ffff] border-[#00ffff]";
      case "adgodmode":
        return "text-[#ff00ff] border-[#ff00ff] animate-pulse";
      default:
        return "text-[#00ff41] border-[#00ff41]";
    }
  };

  const getModeBg = () => {
    switch (executionMode) {
      case "single":
        return "bg-[#00ff41]";
      case "parallel":
        return "bg-[#00ffff]";
      case "adgodmode":
        return "bg-[#ff00ff]";
      default:
        return "bg-[#00ff41]";
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-[#222]">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-[#00ff41]" />
            <span className="text-base sm:text-xl font-bold tracking-wider text-[#00ff41]">
              <span className="hidden sm:inline">AD TERMINAL</span>
              <span className="sm:hidden">AD</span>
            </span>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#111] rounded border border-[#333] ml-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  statusIndicator ? "bg-[#00ff41]" : "bg-[#004411]"
                }`}
              />
              <span className="text-xs text-[#00ff41] tracking-widest">
                CONTROL TOWER
              </span>
            </div>
          </div>

          {/* Center: Mode Selector (Desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => onChangeMode("single")}
              className={`px-3 py-1.5 text-xs font-medium border transition-all ${
                executionMode === "single"
                  ? "bg-[#00ff41] text-black border-[#00ff41]"
                  : "bg-transparent text-[#00ff41] border-[#333] hover:border-[#00ff41]"
              }`}
            >
              SINGLE
            </button>
            <button
              onClick={() => onChangeMode("parallel")}
              className={`px-3 py-1.5 text-xs font-medium border transition-all ${
                executionMode === "parallel"
                  ? "bg-[#00ffff] text-black border-[#00ffff]"
                  : "bg-transparent text-[#00ffff] border-[#333] hover:border-[#00ffff]"
              }`}
            >
              PARALLEL
            </button>
            <button
              onClick={() => onChangeMode("adgodmode")}
              className={`px-3 py-1.5 text-xs font-bold border transition-all ${
                executionMode === "adgodmode"
                  ? "bg-[#ff00ff] text-white border-[#ff00ff]"
                  : "bg-transparent text-[#ff00ff] border-[#333] hover:border-[#ff00ff]"
              }`}
            >
              <Zap className="w-3 h-3 inline mr-1" />
              GODMODE
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Mode Dropdown */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-bold border rounded ${getModeColor()}`}
              >
                {getModeLabel()}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {modeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-[#111] border border-[#333] rounded shadow-xl z-50">
                  <button
                    onClick={() => {
                      onChangeMode("single");
                      setModeDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs ${
                      executionMode === "single" ? "bg-[#00ff41] text-black" : "text-[#00ff41]"
                    }`}
                  >
                    SINGLE
                  </button>
                  <button
                    onClick={() => {
                      onChangeMode("parallel");
                      setModeDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs ${
                      executionMode === "parallel" ? "bg-[#00ffff] text-black" : "text-[#00ffff]"
                    }`}
                  >
                    PARALLEL
                  </button>
                  <button
                    onClick={() => {
                      onChangeMode("adgodmode");
                      setModeDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs ${
                      executionMode === "adgodmode" ? "bg-[#ff00ff] text-white" : "text-[#ff00ff]"
                    }`}
                  >
                    GODMODE
                  </button>
                </div>
              )}
            </div>

            {/* Clock (Desktop) */}
            <div className="hidden sm:block text-xs text-[#008822] font-mono">
              {currentTime}
            </div>

            {/* Add Terminal */}
            <button
              onClick={onAddTerminal}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-[#00ff41] text-black font-bold text-xs sm:text-sm hover:bg-[#00cc33] transition-all"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">ADD TERMINAL</span>
              <span className="sm:hidden">ADD</span>
              <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-black/20 rounded">
                Ctrl+Shift+T
              </kbd>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#00ff41] hover:bg-[#00ff41]/10 rounded"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Settings */}
            <button className="hidden lg:block p-2 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-[#222]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-2 py-2 bg-[#111] rounded">
                <span className="text-xs text-[#008822]">STATUS</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusIndicator ? "bg-[#00ff41]" : "bg-[#004411]"}`} />
                  <span className="text-xs text-[#00ff41]">ONLINE</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between px-2 py-2 bg-[#111] rounded">
                <span className="text-xs text-[#008822]">TIME</span>
                <span className="text-xs text-[#00ff41] font-mono">{currentTime}</span>
              </div>

              <div className="flex items-center justify-between px-2 py-2 bg-[#111] rounded">
                <span className="text-xs text-[#008822]">MODE</span>
                <span className={`text-xs font-bold ${getModeColor().split(' ')[0]}`}>
                  {getModeLabel()}
                </span>
              </div>

              <Link href="/studio" className="flex items-center gap-2 px-2 py-2 text-[#00ff41] hover:bg-[#00ff41]/10 rounded">
                <Code className="w-4 h-4" />
                <span className="text-sm">APP BUILDING STUDIO</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

