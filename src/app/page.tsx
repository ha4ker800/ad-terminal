"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Terminal, 
  Plus,
  LayoutDashboard,
  Cpu,
  MessageSquare,
  Settings,
  Smartphone,
  Monitor,
  Server,
  Wifi,
  Cpu as CpuIcon,
  HardDrive,
  Radio,
  Zap,
  Shield,
  Bot
} from "lucide-react";
import AddTerminalModal from "@/components/AddTerminalModal";
import BroadcastModal from "@/components/BroadcastModal";
import type { Terminal as TerminalType } from "@/db/schema";

export default function Home() {
  const [terminals, setTerminals] = useState<TerminalType[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

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
      console.error("Failed to fetch:", error);
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
                <Link href="/" className="nav-link active"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
                <Link href="/terminals" className="nav-link"><Terminal className="w-4 h-4" /> Terminals</Link>
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
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-400 mt-1">Multi-device command & control platform</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsBroadcastOpen(true)} 
              className="btn-secondary"
              disabled={onlineCount === 0}
            >
              <Radio className="w-4 h-4" />
              Broadcast
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Terminal
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Terminal className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{terminals.length}</p>
                <p className="text-sm text-slate-400">Total Terminals</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Wifi className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineCount}</p>
                <p className="text-sm text-slate-400">Online</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">ADGOD</p>
                <p className="text-sm text-slate-400">Mode Active</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">NO</p>
                <p className="text-sm text-slate-400">Refusals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/terminals" className="glass-card p-6 hover:border-blue-500/50 transition-all group">
            <Terminal className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-bold text-lg">Terminals</h3>
            <p className="text-slate-400 text-sm">Manage connected devices</p>
          </Link>
          <Link href="/chat" className="glass-card p-6 hover:border-green-500/50 transition-all group">
            <Bot className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-bold text-lg">AI Chat</h3>
            <p className="text-slate-400 text-sm">Chat with AI assistant</p>
          </Link>
          <Link href="/settings" className="glass-card p-6 hover:border-purple-500/50 transition-all group">
            <Settings className="w-8 h-8 text-purple-500 mb-3" />
            <h3 className="font-bold text-lg">Settings</h3>
            <p className="text-slate-400 text-sm">API keys & preferences</p>
          </Link>
        </div>

        {/* Recent Terminals */}
        <h2 className="text-xl font-bold mb-4">Connected Terminals</h2>
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
            {terminals.slice(0, 6).map((terminal) => (
              <div key={terminal.id} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg text-blue-500">
                      {terminal.osType === "android" ? <Smartphone className="w-5 h-5" /> :
                       terminal.osType === "windows" ? <Monitor className="w-5 h-5" /> :
                       <Server className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-medium">{terminal.deviceName || `Terminal-${terminal.nodeToken.slice(-4)}`}</h3>
                      <p className="text-sm text-slate-400">{terminal.osType}</p>
                    </div>
                  </div>
                  <span className={`badge ${terminal.status === "online" ? "badge-online" : "badge-offline"}`}>
                    {terminal.status}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 text-sm text-slate-400">
                  {terminal.cpuCores && <span className="flex items-center gap-1"><CpuIcon className="w-3 h-3" /> {terminal.cpuCores} cores</span>}
                  {terminal.freeRamMb && <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {Math.round(terminal.freeRamMb / 1024)}GB</span>}
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

      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        terminals={terminals}
      />
    </div>
  );
}
