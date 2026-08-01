"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, Smartphone, Monitor, Server, RefreshCw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface AddTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTerminalAdded?: (nodeToken: string) => void;
}

type DeviceType = "termux" | "windows" | "linux" | "macos";

export default function AddTerminalModal({
  isOpen,
  onClose,
  onTerminalAdded,
}: AddTerminalModalProps) {
  const [step, setStep] = useState<"select" | "generate" | "done">("select");
  const [selectedDevice, setSelectedDevice] = useState<DeviceType | null>(null);
  const [nodeToken, setNodeToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState("https://your-app.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedDevice(null);
      setNodeToken("");
      setCopied(false);
    }
  }, [isOpen]);

  const generateToken = useCallback(() => {
    const token = "AD-TERM-" + uuidv4().replace(/-/g, "").substring(0, 8).toUpperCase();
    setNodeToken(token);
    onTerminalAdded?.(token);
    return token;
  }, [onTerminalAdded]);

  const handleDeviceSelect = (device: DeviceType) => {
    setSelectedDevice(device);
    generateToken();
    setStep("generate");
  };

  const getCommand = () => {
    const baseUrl = appUrl;
    
    switch (selectedDevice) {
      case "termux":
        return `curl -sSL ${baseUrl}/scripts/connect.sh | bash -s ${nodeToken}`;
      case "linux":
        return `curl -sSL ${baseUrl}/scripts/connect.sh | bash -s ${nodeToken}`;
      case "windows":
        return `curl -sSL ${baseUrl}/scripts/connect.bat -o connect.bat && connect.bat ${nodeToken}`;
      case "macos":
        return `curl -sSL ${baseUrl}/scripts/connect.sh | bash -s ${nodeToken}`;
      default:
        return "";
    }
  };

  const getPowerShellCommand = () => {
    return `iwr -useb ${appUrl}/scripts/connect.ps1 | iex -args "${nodeToken}"`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const regenerateToken = () => {
    generateToken();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00ff41]/10 border border-[#00ff41] rounded flex items-center justify-center">
              <span className="text-[#00ff41] text-xl font-bold">+</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#00ff41]">
                ADD TERMINAL
              </h2>
              <p className="text-xs text-[#008822]">
                [AD TERMINAL :: PAIRING PROTOCOL v1.0]
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Device Selection */}
        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-[#00ff41]/70 mb-4">
              Select the device type you want to connect to AD TERMINAL:
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleDeviceSelect("termux")}
                className="glass-card p-6 text-left hover:border-[#00ff41] hover:shadow-[0_0_15px_rgba(0,255,65,0.2)] transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Smartphone className="w-8 h-8 text-[#00ff41] group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-bold text-[#00ff41]">Termux</span>
                </div>
                <p className="text-xs text-[#008822]">Android Terminal Emulator</p>
                <code className="mt-3 block text-xs bg-[#0a0a0a] p-2 rounded text-[#00aa33]">
                  pkg install curl
                </code>
              </button>

              <button
                onClick={() => handleDeviceSelect("linux")}
                className="glass-card p-6 text-left hover:border-[#00ff41] hover:shadow-[0_0_15px_rgba(0,255,65,0.2)] transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-8 h-8 text-[#00ff41] group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-bold text-[#00ff41]">Linux</span>
                </div>
                <p className="text-xs text-[#008822]">Debian, Ubuntu, RHEL, etc.</p>
                <code className="mt-3 block text-xs bg-[#0a0a0a] p-2 rounded text-[#00aa33]">
                  apt/yum based systems
                </code>
              </button>

              <button
                onClick={() => handleDeviceSelect("windows")}
                className="glass-card p-6 text-left hover:border-[#00ff41] hover:shadow-[0_0_15px_rgba(0,255,65,0.2)] transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Monitor className="w-8 h-8 text-[#00ff41] group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-bold text-[#00ff41]">Windows</span>
                </div>
                <p className="text-xs text-[#008822]">CMD, PowerShell</p>
                <code className="mt-3 block text-xs bg-[#0a0a0a] p-2 rounded text-[#00aa33]">
                  curl or PowerShell
                </code>
              </button>

              <button
                onClick={() => handleDeviceSelect("macos")}
                className="glass-card p-6 text-left hover:border-[#00ff41] hover:shadow-[0_0_15px_rgba(0,255,65,0.2)] transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Monitor className="w-8 h-8 text-[#00ff41] group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-bold text-[#00ff41]">macOS</span>
                </div>
                <p className="text-xs text-[#008822]">Mac Terminal</p>
                <code className="mt-3 block text-xs bg-[#0a0a0a] p-2 rounded text-[#00aa33]">
                  Homebrew recommended
                </code>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Generated Commands */}
        {step === "generate" && selectedDevice && (
          <div className="space-y-6">
            {/* Token Display */}
            <div className="glass-card p-4 border-l-4 border-l-[#00ff41]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#008822] mb-1">NODE TOKEN</p>
                  <p className="text-lg font-mono text-[#00ff41] tracking-wider">
                    {nodeToken}
                  </p>
                </div>
                <button
                  onClick={regenerateToken}
                  className="p-2 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors"
                  title="Generate new token"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Command Display */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#008822]">ONE-LINE INSTALLATION COMMAND</p>
                <button
                  onClick={() => copyToClipboard(getCommand())}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-[#00ff41]/10 text-[#00ff41] rounded hover:bg-[#00ff41]/20 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" /> COPIED
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> COPY
                    </>
                  )}
                </button>
              </div>
              <div className="code-block relative group">
                <code className="text-[#00ff41]">{getCommand()}</code>
              </div>
              <p className="mt-2 text-xs text-[#008822]">
                Run this command on your {selectedDevice.toUpperCase()} device to establish connection.
              </p>
            </div>

            {/* PowerShell Alternative for Windows */}
            {selectedDevice === "windows" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[#008822]">POWERSHELL ALTERNATIVE</p>
                  <button
                    onClick={() => copyToClipboard(getPowerShellCommand())}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[#00ffff]/10 text-[#00ffff] rounded hover:bg-[#00ffff]/20 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> COPY
                  </button>
                </div>
                <div className="code-block border-l-4 border-l-[#00ffff]">
                  <code className="text-[#00ffff]">{getPowerShellCommand()}</code>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="glass-card p-4 border border-[#333]">
              <h4 className="text-sm font-bold text-[#00ff41] mb-2">
                CONNECTION INSTRUCTIONS
              </h4>
              <ol className="text-xs text-[#00ff41]/70 space-y-2 list-decimal list-inside">
                <li>Copy the installation command above</li>
                <li>Open your terminal on the target device</li>
                <li>Paste and execute the command</li>
                <li>Wait for the connection handshake to complete</li>
                <li>The device will appear in your terminal grid automatically</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="btn-terminal flex-1"
              >
                ← BACK
              </button>
              <button
                onClick={onClose}
                className="btn-terminal btn-terminal-cyan flex-1"
              >
                DONE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
