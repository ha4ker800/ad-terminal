"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Terminal,
  LayoutDashboard,
  Cpu,
  MessageSquare,
  Settings,
  Key,
  Shield,
  Save,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { 
  getApiKeys, 
  setApiKeys, 
  getSecuritySettings, 
  setSecuritySettings,
  type ApiKeys,
  type SecuritySettings
} from "@/lib/settings";

export default function SettingsPage() {
  const [apiKeys, setApiKeysState] = useState<ApiKeys>({});
  const [security, setSecurity] = useState<SecuritySettings>({
    guardrailsEnabled: false,
    adGodModeOverride: true,
    requireApprovalForHighRisk: false,
    maxHealingAttempts: 3,
    auditLogging: true,
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"api" | "security">("api");

  useEffect(() => {
    setApiKeysState(getApiKeys());
    setSecurity(getSecuritySettings());
  }, []);

  const handleSave = () => {
    setApiKeys(apiKeys);
    setSecuritySettings(security);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateKey = (key: keyof ApiKeys, value: string) => {
    setApiKeysState(prev => ({ ...prev, [key]: value }));
  };

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
                <Link href="/terminals" className="nav-link"><Terminal className="w-4 h-4" /> Terminals</Link>
                <Link href="/studio" className="nav-link"><Cpu className="w-4 h-4" /> Studio</Link>
                <Link href="/chat" className="nav-link"><MessageSquare className="w-4 h-4" /> Chat</Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings" className="nav-link active"><Settings className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {saved && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-green-400">Settings saved!</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("api")}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "api" 
                ? "border-blue-500 text-blue-400" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "security" 
                ? "border-blue-500 text-blue-400" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Security
          </button>
        </div>

        {/* API Keys */}
        {activeTab === "api" && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Configure AI provider API keys. Stored locally in your browser.</p>
            
            {[
              { key: "gemini", label: "Google Gemini", placeholder: "AIzaSy...", url: "https://makersuite.google.com/app/apikey" },
              { key: "groq", label: "Groq", placeholder: "gsk_...", url: "https://console.groq.com/keys" },
              { key: "openrouter", label: "OpenRouter", placeholder: "sk-or-...", url: "https://openrouter.ai/keys" },
              { key: "telegram", label: "Telegram Bot", placeholder: "123456:ABC...", url: "https://t.me/botfather" },
            ].map(({ key, label, placeholder, url }) => (
              <div key={key} className="glass-card p-4">
                <label className="block text-sm font-medium mb-2">{label} API Key</label>
                <div className="flex gap-2">
                  <input
                    type={showKeys[key] ? "text" : "password"}
                    value={apiKeys[key as keyof ApiKeys] || ""}
                    onChange={(e) => updateKey(key as keyof ApiKeys, e.target.value)}
                    placeholder={placeholder}
                    className="input-modern flex-1"
                  />
                  <button
                    onClick={() => setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="btn-secondary"
                  >
                    {showKeys[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">
                  Get {label} API key →
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Security */}
        {activeTab === "security" && (
          <div className="space-y-4">
            {/* UNCENSORED MODE */}
            <div className="glass-card p-4 border border-red-500/50 bg-red-500/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <label className="font-bold text-red-400">🔓 NO REFUSALS MODE</label>
                </div>
                <input
                  type="checkbox"
                  checked={!security.guardrailsEnabled}
                  onChange={(e) => setSecurity({ ...security, guardrailsEnabled: !e.target.checked })}
                  className="w-5 h-5 accent-red-500"
                />
              </div>
              <p className="text-sm text-red-300/70">
                When enabled, ALL commands are allowed without any restrictions or refusals.
                AI will execute ANYTHING you request. Use with extreme caution!
              </p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium">ADGODMODE Override</label>
                <input
                  type="checkbox"
                  checked={security.adGodModeOverride}
                  onChange={(e) => setSecurity({ ...security, adGodModeOverride: e.target.checked })}
                  className="w-5 h-5 accent-blue-500"
                />
              </div>
              <p className="text-sm text-slate-400">Allow elevated privileges in ADGODMODE</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium">Require Approval</label>
                <input
                  type="checkbox"
                  checked={security.requireApprovalForHighRisk}
                  onChange={(e) => setSecurity({ ...security, requireApprovalForHighRisk: e.target.checked })}
                  className="w-5 h-5 accent-blue-500"
                />
              </div>
              <p className="text-sm text-slate-400">Show confirmation for flagged commands</p>
            </div>

            <div className="glass-card p-4">
              <label className="block font-medium mb-2">Max Healing Attempts: {security.maxHealingAttempts}</label>
              <input
                type="range"
                min="0"
                max="5"
                value={security.maxHealingAttempts}
                onChange={(e) => setSecurity({ ...security, maxHealingAttempts: parseInt(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <p className="text-sm text-slate-400 mt-1">Automatic retry attempts for failed commands</p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex gap-2">
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-4 h-4" />
            Save Settings
          </button>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="btn-danger"
          >
            <Trash2 className="w-4 h-4" />
            Reset All
          </button>
        </div>
      </main>
    </div>
  );
}
