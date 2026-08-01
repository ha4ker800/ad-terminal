"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, 
  Terminal, 
  Cpu, 
  Wifi, 
  WifiOff,
  Smartphone,
  Monitor,
  Server,
  Trash2,
  Play,
  Settings,
  MessageSquare,
  LayoutDashboard
} from "lucide-react";
import AddTerminalModal from "@/components/AddTerminalModal";
import type { Terminal as TerminalType } from "@/db/schema";

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState<TerminalType[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);

  useEffect(() => {
    fetchTerminals();
    const interval = setInterval(fetchTerminals, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTerminals = async () => {
    try {
      const res = await fetch("/api/terminals");
      if (res.ok) {
        const data = await res.json();
        setTerminals(data.terminals || []);
      }
    } catch (error) {
      console.error("Failed to fetch terminals:", error);
    }
  };

  const handleDisconnect = async (id: string) => {
    await fetch(`/api/terminals/${id}`, { method: "DELETE" });
    fetchTerminals();
  };

  const getDeviceIcon = (osType: string) => {
    switch (osType) {
      case "android": return <Smartphone className="w-5 h-5" />;
      case "windows": return <Monitor className="w-5 h-5" />;
      case "linux":
      case "macos": return <Server className="w-5 h-5" />;
      default: return <Terminal className="w-5 h-5" />;
    }
  };

  const onlineCount = terminals.filter(t => t.status === "online").length;

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <Terminal className="w-6 h-6 text-blue-500" />
                <span className="font-bold text-lg">AD TERMINAL</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link href="/" className="nav-link"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
                <Link href="/terminals" className="nav-link active"><Terminal className="w-4 h-4" /> Terminals</Link>
                <Link href="/studio" className="nav-link"><Cpu className="w-4 h-4" /> Studio</Link>
                <Link href="/chat" className="nav-link"><MessageSquare className="w-4 h-4" /> Chat</Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings" className="btn-secondary"><Settings className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Terminals</h1>
            <p className="text-slate-400 mt-1">{onlineCount} of {terminals.length} terminals online</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Terminal
          </button>
        </div>

        {/* Grid */}
        {terminals.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Terminal className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">No terminals connected</h3>
            <p className="text-slate-400 mb-4">Add your first device to get started</p>
            <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Terminal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terminals.map((terminal) => (
              <div
                key={terminal.id}
                className={`glass-card p-4 cursor-pointer transition-all ${
                  selectedTerminal === terminal.id ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setSelectedTerminal(terminal.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg text-blue-500">
                      {getDeviceIcon(terminal.osType || "")}
                    </div>
                    <div>
                      <h3 className="font-medium">{terminal.deviceName || `Terminal-${terminal.nodeToken.slice(-4)}`}</h3>
                      <p className="text-sm text-slate-400">{terminal.nodeToken}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {terminal.status === "online" ? (
                      <span className="badge badge-online flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Online
                      </span>
                    ) : (
                      <span className="badge badge-offline flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> Offline
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-400">
                  <div>OS: {terminal.osType}</div>
                  <div>CPU: {terminal.cpuCores} cores</div>
                  {terminal.batteryLevel && <div>Battery: {terminal.batteryLevel}%</div>}
                  {terminal.freeRamMb && <div>RAM: {Math.round(terminal.freeRamMb / 1024)}GB free</div>}
                </div>

                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); /* execute */ }}
                    className="flex-1 btn-primary text-sm justify-center"
                    disabled={terminal.status !== "online"}
                  >
                    <Play className="w-3 h-3" />
                    Execute
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDisconnect(terminal.id); }}
                    className="btn-secondary text-sm"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AddTerminalModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onTerminalAdded={fetchTerminals}
      />
    </div>
  );
}
