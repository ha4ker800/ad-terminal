/**
 * AD TERMINAL - Global Settings & API Key Management
 */

export interface ApiKeys {
  gemini?: string;
  groq?: string;
  openrouter?: string;
  telegram?: string;
}

export interface SecuritySettings {
  guardrailsEnabled: boolean;
  adGodModeOverride: boolean;
  requireApprovalForHighRisk: boolean;
  maxHealingAttempts: number;
  auditLogging: boolean;
}

export interface UserPreferences {
  defaultExecutionMode: "single" | "parallel" | "adgodmode";
  autoSaveLogs: boolean;
  theme: "dark" | "light" | "cyber";
  notifications: boolean;
}

const STORAGE_KEYS = {
  API_KEYS: "ad_terminal_api_keys",
  SECURITY: "ad_terminal_security",
  PREFERENCES: "ad_terminal_preferences",
};

// API Keys Management
export function getApiKeys(): ApiKeys {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
  return stored ? JSON.parse(stored) : {};
}

export function setApiKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
}

export function setApiKey(provider: keyof ApiKeys, key: string): void {
  const keys = getApiKeys();
  keys[provider] = key;
  setApiKeys(keys);
}

// Security Settings
export function getSecuritySettings(): SecuritySettings {
  if (typeof window === "undefined") {
    return {
      guardrailsEnabled: false, // DISABLED BY DEFAULT - UNCENSORED
      adGodModeOverride: true,
      requireApprovalForHighRisk: false,
      maxHealingAttempts: 3,
      auditLogging: true,
    };
  }
  const stored = localStorage.getItem(STORAGE_KEYS.SECURITY);
  return stored
    ? JSON.parse(stored)
    : {
        guardrailsEnabled: false, // UNCENSORED MODE
        adGodModeOverride: true,
        requireApprovalForHighRisk: false,
        maxHealingAttempts: 3,
        auditLogging: true,
      };
}

export function setSecuritySettings(settings: SecuritySettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(settings));
}

// User Preferences
export function getUserPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return {
      defaultExecutionMode: "adgodmode",
      autoSaveLogs: true,
      theme: "cyber",
      notifications: true,
    };
  }
  const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
  return stored
    ? JSON.parse(stored)
    : {
        defaultExecutionMode: "adgodmode",
        autoSaveLogs: true,
        theme: "cyber",
        notifications: true,
      };
}

export function setUserPreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
}

// Clear all settings
export function clearAllSettings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.API_KEYS);
  localStorage.removeItem(STORAGE_KEYS.SECURITY);
  localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
}

export default {
  getApiKeys,
  setApiKeys,
  setApiKey,
  getSecuritySettings,
  setSecuritySettings,
  getUserPreferences,
  setUserPreferences,
  clearAllSettings,
};
