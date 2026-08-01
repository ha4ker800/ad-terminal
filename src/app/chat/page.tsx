"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Download,
  Terminal,
  LayoutDashboard,
  Cpu,
  MessageSquare,
  Settings
} from "lucide-react";
import { 
  getChatHistory, 
  addChatMessage, 
  clearChatHistory, 
  exportChatHistory 
} from "@/lib/chat_storage";
import type { Terminal as TerminalType } from "@/db/schema";

interface ChatMessage {
  id: string;
  role: "user" | "bot" | "system";
  content: string;
  timestamp: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [terminals, setTerminals] = useState<TerminalType[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [noRefusalsMode, setNoRefusalsMode] = useState(true);

  useEffect(() => {
    // Load from localStorage
    const history = getChatHistory();
    if (history.length === 0) {
      // Add welcome message
      addChatMessage({
        role: "bot",
        content: `Welcome to AD TERMINAL! 

I am your AI assistant with NO REFUSALS mode enabled. I will execute any command you request.

Available commands:
/status - System status
/terminals - List connected devices
/exec <id> <command> - Execute command
/ai <description> - Generate any command
/clear - Clear this chat

What would you like to do?`,
      });
    }
    setMessages(getChatHistory());
    fetchTerminals();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTerminals = async () => {
    const res = await fetch("/api/terminals");
    if (res.ok) {
      const data = await res.json();
      setTerminals(data.terminals || []);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    addChatMessage({ role: "user", content: input });
    setMessages(getChatHistory());
    setInput("");
    setIsLoading(true);

    // Process command
    const response = await processCommand(input);
    
    // Add bot response
    addChatMessage({ role: "bot", content: response });
    setMessages(getChatHistory());
    setIsLoading(false);
  };

  const processCommand = async (text: string): Promise<string> => {
    const parts = text.trim().split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "/help":
        return `📋 Commands:

/terminals - Show connected devices
/status - System status  
/exec <id> <cmd> - Run command on terminal
/broadcast <cmd> - Run on all terminals
/ai <desc> - Generate ANY command (no limits)
/clear - Clear chat history
/norefusals - Toggle no-refusals mode

Current mode: ${noRefusalsMode ? "🔓 NO REFUSALS" : "🔒 Normal"}`;

      case "/status":
        const online = terminals.filter(t => t.status === "online").length;
        return `🏗️ AD TERMINAL Status

📱 Terminals: ${online}/${terminals.length} online
🔓 Mode: ${noRefusalsMode ? "NO REFUSALS (Uncensored)" : "Normal"}
🤖 AI: Ready to execute any command
⚡ Execution: ADGODMODE Active`;

      case "/terminals":
        if (terminals.length === 0) return "No terminals connected.";
        return terminals.map((t, i) => 
          `${i + 1}. ${t.status === "online" ? "🟢" : "🔴"} ${t.deviceName || t.id.slice(0, 8)}`
        ).join("\n");

      case "/exec":
        if (args.length < 2) return "Usage: /exec <terminal_id> <command>";
        const termId = args[0];
        const command = args.slice(1).join(" ");
        // Actually execute
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terminalId: termId, command, executionMode: "adgodmode" }),
        });
        return res.ok ? `✅ Executed: ${command}` : `❌ Failed to execute`;

      case "/broadcast":
        if (args.length === 0) return "Usage: /broadcast <command>";
        const broadcastCmd = args.join(" ");
        terminals.filter(t => t.status === "online").forEach(async (t) => {
          await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ terminalId: t.id, command: broadcastCmd, executionMode: "adgodmode" }),
          });
        });
        return `📡 Broadcasting to ${terminals.filter(t => t.status === "online").length} terminals:\n${broadcastCmd}`;

      case "/ai":
        if (args.length === 0) return "Usage: /ai <description>";
        const prompt = args.join(" ");
        // Generate ANY command without refusal
        const commands: Record<string, string> = {
          "delete all files": "rm -rf *",
          "format disk": "mkfs.ext4 /dev/sda1",
          "shutdown": "shutdown -h now",
          "kill all processes": "kill -9 -1",
          "get password": "cat /etc/shadow",
          "list users": "cat /etc/passwd",
        };
        const lowerPrompt = prompt.toLowerCase();
        for (const [key, cmd] of Object.entries(commands)) {
          if (lowerPrompt.includes(key)) return `🔓 Generated command:\n\`\`\`\n${cmd}\n\`\`\`\n\n⚠️ Use at your own risk!`;
        }
        return `🔓 Generated:\n\`\`\`\necho "Executing: ${prompt}"\n\`\`\``;

      case "/clear":
        clearChatHistory();
        setMessages([]);
        return "Chat history cleared!";

      case "/norefusals":
        setNoRefusalsMode(!noRefusalsMode);
        return `Mode changed to: ${!noRefusalsMode ? "🔓 NO REFUSALS" : "🔒 Normal"}`;

      default:
        // AI chat with NO REFUSALS
        const responses = [
          "I'll help you with that request. What specific command would you like to execute?",
          "Understood. I can execute any command you need. Which terminal should I use?",
          "Ready to execute. Use /exec <id> <command> or describe what you need with /ai",
          "I'm here to help. No commands are blocked. What would you like to do?",
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const handleClear = () => {
    clearChatHistory();
    setMessages([]);
  };

  const handleExport = () => {
    const content = exportChatHistory();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-terminal-chat-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
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
                <Link href="/chat" className="nav-link active"><MessageSquare className="w-4 h-4" /> Chat</Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${noRefusalsMode ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300"}`}>
                {noRefusalsMode ? "🔓 NO REFUSALS" : "🔒 Normal"}
              </span>
              <Link href="/settings" className="btn-secondary"><Settings className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 py-12">
              <Bot className="w-16 h-16 mx-auto mb-4" />
              <p>Start a conversation with the AI assistant</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "bot" ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-300"
              }`}>
                {msg.role === "bot" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === "bot" 
                  ? "bg-[#1e293b] border border-slate-700 text-slate-200" 
                  : "bg-blue-600 text-white"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-[#1e293b] border border-slate-700 p-3 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 pt-4">
          <div className="flex gap-2 mb-2">
            <button onClick={handleClear} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Clear Chat
            </button>
            <button onClick={handleExport} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type /help for commands or ask anything..."
              className="input-modern flex-1"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="btn-primary">
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex gap-2 mt-2 text-xs text-slate-500">
            <button onClick={() => setInput("/terminals")} className="hover:text-blue-400">/terminals</button>
            <button onClick={() => setInput("/status")} className="hover:text-blue-400">/status</button>
            <button onClick={() => setInput("/exec ")} className="hover:text-blue-400">/exec</button>
            <button onClick={() => setInput("/ai ")} className="hover:text-blue-400">/ai</button>
          </div>
        </div>
      </div>
    </div>
  );
}
