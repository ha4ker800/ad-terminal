/**
 * AD TERMINAL - Chat LocalStorage
 * Stores chat history locally, NOT in database
 */

export interface ChatMessage {
  id: string;
  role: "user" | "bot" | "system";
  content: string;
  timestamp: number;
}

const CHAT_STORAGE_KEY = "ad_terminal_chat_history";
const MAX_MESSAGES = 100;

export function getChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(CHAT_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addChatMessage(message: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
  const messages = getChatHistory();
  const newMessage: ChatMessage = {
    ...message,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
  };
  
  // Add to beginning, keep only MAX_MESSAGES
  const updated = [newMessage, ...messages].slice(0, MAX_MESSAGES);
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
  
  return newMessage;
}

export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAT_STORAGE_KEY);
}

export function exportChatHistory(): string {
  const messages = getChatHistory();
  return messages
    .map((m) => `[${new Date(m.timestamp).toLocaleString()}] ${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");
}

export function getChatStats(): { total: number; lastMessage: number | null } {
  const messages = getChatHistory();
  return {
    total: messages.length,
    lastMessage: messages[0]?.timestamp || null,
  };
}
