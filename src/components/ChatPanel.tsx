"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Bot,
  User,
  Command,
  Terminal,
  Trash2,
  Download,
  RefreshCw,
  Settings,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "bot" | "system";
  content: string;
  timestamp: Date;
  command?: string;
  result?: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  terminals: Array<{ id: string; deviceName?: string; status: string }>;
}

export default function ChatPanel({ isOpen, onClose, terminals }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [botConnected, setBotConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial welcome message
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "bot",
          content: `🤖 Welcome to AD TERMINAL Bot Interface!

Available commands:
/help - Show all commands
/status - System status
/terminals - List connected devices
/exec <id> <command> - Execute on terminal
/broadcast <command> - Execute on all
/ai <prompt> - Generate AI command
/clear - Clear chat

Type a command or ask me anything!`,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Process command
    const response = await processCommand(input);

    const botMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "bot",
      content: response.message,
      timestamp: new Date(),
      command: response.command,
      result: response.result,
    };

    setMessages((prev) => [...prev, botMessage]);
    setIsLoading(false);
  };

  const processCommand = async (text: string): Promise<{ message: string; command?: string; result?: string }> => {
    const parts = text.trim().split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "/help":
        return {
          message: `📋 Available Commands:

/terminals - Show connected devices
/status - System status
/exec <terminal_id> <command> - Run command
/broadcast <command> - Run on all online
/ai <description> - AI command generation
/clear - Clear chat history
/settings - Bot settings`,
        };

      case "/status":
        const onlineCount = terminals.filter((t) => t.status === "online").length;
        return {
          message: `🏗️ AD TERMINAL Status:

📱 Terminals: ${onlineCount}/${terminals.length} online
🔒 Guardrails: UNCENSORED MODE
🤖 AI Engines: Ready
⚡ Execution: ADGODMODE Active

System operational!`,
        };

      case "/terminals":
        if (terminals.length === 0) {
          return { message: "📱 No terminals connected. Add one from the dashboard!" };
        }
        const terminalList = terminals
          .map((t, i) => `${i + 1}. ${t.status === "online" ? "🟢" : "🔴"} ${t.deviceName || t.id.slice(0, 8)} (${t.status})`)
          .join("\n");
        return {
          message: `📱 Connected Terminals:\n\n${terminalList}`,
        };

      case "/exec":
        if (args.length < 2) {
          return {
            message: "❌ Usage: /exec <terminal_id> <command>\nExample: /exec abc123 ls -la",
          };
        }
        const terminalId = args[0];
        const command = args.slice(1).join(" ");
        return {
          message: `⚡ Command queued:\nTerminal: ${terminalId}\nCommand: ${command}\n\nCheck the terminal drawer for results!`,
          command: command,
        };

      case "/broadcast":
        if (args.length === 0) {
          return { message: "❌ Usage: /broadcast <command>" };
        }
        const broadcastCmd = args.join(" ");
        const onlineTerminals = terminals.filter((t) => t.status === "online");
        return {
          message: `📡 Broadcast sent to ${onlineTerminals.length} terminals:\n\`${broadcastCmd}\``,
          command: broadcastCmd,
        };

      case "/ai":
        if (args.length === 0) {
          return { message: "❌ Usage: /ai <description>\nExample: /ai find large files" };
        }
        const prompt = args.join(" ");
        // Simulate AI response
        const aiCommands: Record<string, string> = {
          "find large files": "find . -type f -size +100M -exec ls -lh {} \\;",
          "list processes": "ps aux | grep $(whoami)",
          "disk usage": "df -h | grep -E '(Filesystem|/dev/)'",
          "memory usage": "free -h",
          "network connections": "netstat -tuln",
        };
        const generatedCommand = aiCommands[prompt.toLowerCase()] || `echo "Generated command for: ${prompt}"`;
        return {
          message: `🤖 AI Generated Command:\n\nPrompt: "${prompt}"\n\n\`\`\`bash\n${generatedCommand}\n\`\`\`\n\nUse /exec <terminal_id> ${generatedCommand} to run it!`,
          command: generatedCommand,
        };

      case "/clear":
        setMessages([]);
        return {
          message: "🧹 Chat history cleared!",
        };

      case "/settings":
        return {
          message: `⚙️ Bot Settings:

Bot Status: ${botConnected ? "🟢 Connected" : "🔴 Disconnected"}
Response Mode: ADGODMODE (Uncensored)
AI Provider: Multi-model (Gemini/Groq/OpenRouter)

To configure API keys, open Settings Panel`,
        };

      default:
        // Simulate AI chat response
        return {
          message: `🤖 I received: "${text}"\n\nI'm your AD TERMINAL assistant. I can help you:\n• Execute commands on connected devices\n• Generate AI-powered commands\n• Check system status\n\nType /help to see all commands!`,
        };
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleExport = () => {
    const content = messages
      .map((m) => `[${m.timestamp.toLocaleTimeString()}] ${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-terminal-chat-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#00ff41]/50 w-full max-w-2xl h-[80vh] flex flex-col rounded-lg shadow-[0_0_50px_rgba(0,255,65,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#00ff41]/10 rounded">
              <Bot className="w-5 h-5 text-[#00ff41]" />
            </div>
            <div>
              <h3 className="text-[#00ff41] font-bold">AD TERMINAL BOT</h3>
              <p className="text-xs text-[#008822]">
                {botConnected ? "🟢 Connected" : "🔴 Local Mode"} • {terminals.filter((t) => t.status === "online").length} terminals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              className="p-2 text-[#008822] hover:text-[#00ff41] transition-colors"
              title="Export chat"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 text-[#008822] hover:text-[#ff0040] transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "bot"
                    ? "bg-[#00ff41]/10 text-[#00ff41]"
                    : msg.role === "system"
                    ? "bg-[#ffaa00]/10 text-[#ffaa00]"
                    : "bg-[#00ffff]/10 text-[#00ffff]"
                }`}
              >
                {msg.role === "bot" ? (
                  <Bot className="w-4 h-4" />
                ) : msg.role === "system" ? (
                  <Terminal className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div
                className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === "bot"
                    ? "bg-[#111] border border-[#222] text-[#00ff41]"
                    : msg.role === "system"
                    ? "bg-[#ffaa00]/10 border border-[#ffaa00]/30 text-[#ffaa00]"
                    : "bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00ff41]/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#00ff41]" />
              </div>
              <div className="bg-[#111] border border-[#222] p-3 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#00ff41] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[#00ff41] rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-[#00ff41] rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-[#222] bg-[#111]"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type /help for commands or ask anything..."
              className="input-terminal flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-2 text-xs text-[#008822]">
            <span className="cursor-pointer hover:text-[#00ff41]" onClick={() => setInput("/terminals")}>
              /terminals
            </span>
            <span className="cursor-pointer hover:text-[#00ff41]" onClick={() => setInput("/status")}>
              /status
            </span>
            <span className="cursor-pointer hover:text-[#00ff41]" onClick={() => setInput("/ai ")}>
              /ai
            </span>
            <span className="cursor-pointer hover:text-[#00ff41]" onClick={() => setInput("/exec ")}>
              /exec
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
