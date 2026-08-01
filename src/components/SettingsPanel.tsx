"use client";

import { useState, useEffect } from "react";
import {
  X,
  Key,
  Shield,
  User,
  Bell,
  Save,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import {
  getApiKeys,
  setApiKeys,
  getSecuritySettings,
  setSecuritySettings,
  getUserPreferences,
  setUserPreferences,
  clearAllSettings,
  type ApiKeys,
  type SecuritySettings,
  type UserPreferences,
} from "@/lib/settings";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"api" | "security" | "preferences">("api");
  const [apiKeys, setApiKeysState] = useState<ApiKeys>({});
  const [security, setSecurityState] = useState<SecuritySettings>({
    guardrailsEnabled: false,
    adGodModeOverride: true,
    requireApprovalForHighRisk: false,
    maxHealingAttempts: 3,
    auditLogging: true,
  });
  const [preferences, setPreferencesState] = useState<UserPreferences>({
    defaultExecutionMode: "adgodmode",
    autoSaveLogs: true,
    theme: "cyber",
    notifications: true,
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKeysState(getApiKeys());
      setSecurityState(getSecuritySettings());
      setPreferencesState(getUserPreferences());
    }
  }, [isOpen]);

  const handleSaveApiKeys = () => {
    setApiKeys(apiKeys);
    showSavedNotification();
  };

  const handleSaveSecurity = () => {
    setSecuritySettings(security);
    showSavedNotification();
  };

  const handleSavePreferences = () => {
    setUserPreferences(preferences);
    showSavedNotification();
  };

  const showSavedNotification = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearAll = () => {
    if (confirm("Are you sure? This will reset ALL settings!")) {
      clearAllSettings();
      setApiKeysState({});
      setSecurityState({
        guardrailsEnabled: false,
        adGodModeOverride: true,
        requireApprovalForHighRisk: false,
        maxHealingAttempts: 3,
        auditLogging: true,
      });
      setPreferencesState({
        defaultExecutionMode: "adgodmode",
        autoSaveLogs: true,
        theme: "cyber",
        notifications: true,
      });
      showSavedNotification();
    }
  };

  const updateApiKey = (provider: keyof ApiKeys, value: string) => {
    setApiKeysState((prev) => ({ ...prev, [provider]: value }));
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#00ff41]/50 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-[0_0_50px_rgba(0,255,65,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#111]">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-[#00ff41]" />
            <h2 className="text-xl font-bold text-[#00ff41]">SYSTEM SETTINGS</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="w-48 border-r border-[#222] bg-[#0d0d0d]">
            <button
              onClick={() => setActiveTab("api")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeTab === "api"
                  ? "bg-[#00ff41]/10 text-[#00ff41] border-l-2 border-[#00ff41]"
                  : "text-[#008822] hover:text-[#00ff41] hover:bg-[#00ff41]/5"
              }`}
            >
              <Key className="w-4 h-4" />
              API KEYS
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeTab === "security"
                  ? "bg-[#00ff41]/10 text-[#00ff41] border-l-2 border-[#00ff41]"
                  : "text-[#008822] hover:text-[#00ff41] hover:bg-[#00ff41]/5"
              }`}
            >
              <Shield className="w-4 h-4" />
              SECURITY
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeTab === "preferences"
                  ? "bg-[#00ff41]/10 text-[#00ff41] border-l-2 border-[#00ff41]"
                  : "text-[#008822] hover:text-[#00ff41] hover:bg-[#00ff41]/5"
              }`}
            >
              <User className="w-4 h-4" />
              PREFERENCES
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {saved && (
              <div className="mb-4 p-3 bg-[#00ff41]/10 border border-[#00ff41] rounded flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00ff41]" />
                <span className="text-[#00ff41] text-sm">Settings saved!</span>
              </div>
            )}

            {/* API Keys Tab */}
            {activeTab === "api" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[#00ff41] font-bold mb-2">AI API KEYS</h3>
                  <p className="text-xs text-[#008822] mb-4">
                    Configure your AI provider API keys. These are stored locally in your browser.
                  </p>
                </div>

                {/* Gemini */}
                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <label className="block text-sm text-[#00ff41] mb-2">
                    Google Gemini API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showKeys.gemini ? "text" : "password"}
                      value={apiKeys.gemini || ""}
                      onChange={(e) => updateApiKey("gemini", e.target.value)}
                      placeholder="AIzaSy..."
                      className="input-terminal flex-1"
                    />
                    <button
                      onClick={() => toggleShowKey("gemini")}
                      className="p-2 text-[#008822] hover:text-[#00ff41]"
                    >
                      {showKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#008822] mt-1">
                    Get from: https://makersuite.google.com/app/apikey
                  </p>
                </div>

                {/* Groq */}
                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <label className="block text-sm text-[#00ff41] mb-2">
                    Groq API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showKeys.groq ? "text" : "password"}
                      value={apiKeys.groq || ""}
                      onChange={(e) => updateApiKey("groq", e.target.value)}
                      placeholder="gsk_..."
                      className="input-terminal flex-1"
                    />
                    <button
                      onClick={() => toggleShowKey("groq")}
                      className="p-2 text-[#008822] hover:text-[#00ff41]"
                    >
                      {showKeys.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#008822] mt-1">
                    Get from: https://console.groq.com/keys
                  </p>
                </div>

                {/* OpenRouter */}
                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <label className="block text-sm text-[#00ff41] mb-2">
                    OpenRouter API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showKeys.openrouter ? "text" : "password"}
                      value={apiKeys.openrouter || ""}
                      onChange={(e) => updateApiKey("openrouter", e.target.value)}
                      placeholder="sk-or-..."
                      className="input-terminal flex-1"
                    />
                    <button
                      onClick={() => toggleShowKey("openrouter")}
                      className="p-2 text-[#008822] hover:text-[#00ff41]"
                    >
                      {showKeys.openrouter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#008822] mt-1">
                    Get from: https://openrouter.ai/keys
                  </p>
                </div>

                {/* Telegram */}
                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <label className="block text-sm text-[#00ff41] mb-2">
                    Telegram Bot Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showKeys.telegram ? "text" : "password"}
                      value={apiKeys.telegram || ""}
                      onChange={(e) => updateApiKey("telegram", e.target.value)}
                      placeholder="123456:ABC-DEF..."
                      className="input-terminal flex-1"
                    />
                    <button
                      onClick={() => toggleShowKey("telegram")}
                      className="p-2 text-[#008822] hover:text-[#00ff41]"
                    >
                      {showKeys.telegram ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#008822] mt-1">
                    Get from @BotFather on Telegram
                  </p>
                </div>

                <button
                  onClick={handleSaveApiKeys}
                  className="btn-terminal btn-terminal-cyan flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  SAVE API KEYS
                </button>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[#00ff41] font-bold mb-2">SECURITY SETTINGS</h3>
                  <p className="text-xs text-[#008822] mb-4">
                    Configure security and censorship settings.
                  </p>
                </div>

                {/* UNCENSORED MODE */}
                <div className="p-4 bg-[#ff0040]/10 border border-[#ff0040]/30 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#ff0040] font-bold">⚠️ UNCENSORED MODE</label>
                    <input
                      type="checkbox"
                      checked={!security.guardrailsEnabled}
                      onChange={(e) =>
                        setSecurityState({ ...security, guardrailsEnabled: !e.target.checked })
                      }
                      className="w-5 h-5 accent-[#ff0040]"
                    />
                  </div>
                  <p className="text-xs text-[#ff0040]/70">
                    When enabled, ALL commands are allowed without restriction. 
                    WARNING: This allows destructive operations!
                  </p>
                </div>

                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#00ff41]">ADGODMODE Override</label>
                    <input
                      type="checkbox"
                      checked={security.adGodModeOverride}
                      onChange={(e) =>
                        setSecurityState({ ...security, adGodModeOverride: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#00ff41]"
                    />
                  </div>
                  <p className="text-xs text-[#008822]">
                    Allow elevated privileges in ADGODMODE
                  </p>
                </div>

                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#00ff41]">Require Approval for High Risk</label>
                    <input
                      type="checkbox"
                      checked={security.requireApprovalForHighRisk}
                      onChange={(e) =>
                        setSecurityState({ ...security, requireApprovalForHighRisk: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#00ff41]"
                    />
                  </div>
                  <p className="text-xs text-[#008822]">
                    Show confirmation for flagged commands
                  </p>
                </div>

                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <label className="block text-[#00ff41] mb-2">
                    Max Auto-Healing Attempts: {security.maxHealingAttempts}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={security.maxHealingAttempts}
                    onChange={(e) =>
                      setSecurityState({ ...security, maxHealingAttempts: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#00ff41]"
                  />
                  <p className="text-xs text-[#008822] mt-1">
                    Number of automatic retry attempts for failed commands
                  </p>
                </div>

                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#00ff41]">Audit Logging</label>
                    <input
                      type="checkbox"
                      checked={security.auditLogging}
                      onChange={(e) =>
                        setSecurityState({ ...security, auditLogging: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#00ff41]"
                    />
                  </div>
                  <p className="text-xs text-[#008822]">
                    Log all command executions
                  </p>
                </div>

                <button
                  onClick={handleSaveSecurity}
                  className="btn-terminal btn-terminal-cyan flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  SAVE SECURITY SETTINGS
                </button>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[#00ff41] font-bold mb-2">USER PREFERENCES</h3>
                  <p className="text-xs text-[#008822] mb-4">
                    Customize your AD TERMINAL experience.
                  </p>
                </div>

                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <label className="block text-[#00ff41] mb-2">Default Execution Mode</label>
                  <select
                    value={preferences.defaultExecutionMode}
                    onChange={(e) =>
                      setPreferencesState({
                        ...preferences,
                        defaultExecutionMode: e.target.value as any,
                      })
                    }
                    className="input-terminal w-full"
                  >
                    <option value="single">Single Model</option>
                    <option value="parallel">Parallel Comparison</option>
                    <option value="adgodmode">ADGODMODE</option>
                  </select>
                </div>

                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#00ff41]">Auto-Save Logs</label>
                    <input
                      type="checkbox"
                      checked={preferences.autoSaveLogs}
                      onChange={(e) =>
                        setPreferencesState({ ...preferences, autoSaveLogs: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#00ff41]"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <label className="block text-[#00ff41] mb-2">Theme</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) =>
                      setPreferencesState({ ...preferences, theme: e.target.value as any })
                    }
                    className="input-terminal w-full"
                  >
                    <option value="cyber">Cyber Terminal (Default)</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div className="p-4 bg-[#111] border border-[#222] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#00ff41]">Notifications</label>
                    <input
                      type="checkbox"
                      checked={preferences.notifications}
                      onChange={(e) =>
                        setPreferencesState({ ...preferences, notifications: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#00ff41]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePreferences}
                  className="btn-terminal btn-terminal-cyan flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  SAVE PREFERENCES
                </button>
              </div>
            )}

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-[#ff0040]/30">
              <h3 className="text-[#ff0040] font-bold mb-4">⚠️ DANGER ZONE</h3>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-4 py-2 bg-[#ff0040]/10 text-[#ff0040] border border-[#ff0040] rounded hover:bg-[#ff0040]/20"
              >
                <Trash2 className="w-4 h-4" />
                RESET ALL SETTINGS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
