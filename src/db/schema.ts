import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const terminalStatusEnum = pgEnum("terminal_status", [
  "online",
  "offline",
  "busy",
  "error",
]);

export const executionModeEnum = pgEnum("execution_mode", [
  "single",
  "parallel",
  "adgodmode",
]);

export const osTypeEnum = pgEnum("os_type", [
  "android",
  "windows",
  "linux",
  "macos",
  "unknown",
]);

// Terminal Nodes - Connected devices
export const terminals = pgTable("terminals", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeToken: varchar("node_token", { length: 32 }).notNull().unique(),
  deviceName: varchar("device_name", { length: 255 }),
  osType: osTypeEnum("os_type").notNull().default("unknown"),
  osVersion: varchar("os_version", { length: 100 }),
  kernel: varchar("kernel", { length: 100 }),
  cpuCores: integer("cpu_cores"),
  totalRamMb: integer("total_ram_mb"),
  freeRamMb: integer("free_ram_mb"),
  batteryLevel: integer("battery_level"),
  installedTools: jsonb("installed_tools").$type<string[]>(),
  status: terminalStatusEnum("status").notNull().default("offline"),
  ipAddress: varchar("ip_address", { length: 45 }),
  lastPingAt: timestamp("last_ping_at"),
  connectedAt: timestamp("connected_at").defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Command Execution Logs
export const commandLogs = pgTable("command_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  terminalId: uuid("terminal_id")
    .references(() => terminals.id, { onDelete: "cascade" })
    .notNull(),
  executionMode: executionModeEnum("execution_mode").notNull().default("single"),
  command: text("command").notNull(),
  stdout: text("stdout"),
  stderr: text("stderr"),
  exitCode: integer("exit_code"),
  executionTimeMs: integer("execution_time_ms"),
  aiModelUsed: varchar("ai_model_used", { length: 50 }),
  aiPrompt: text("ai_prompt"),
  aiResponse: text("ai_response"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  errorMessage: text("error_message"),
  healingAttempts: integer("healing_attempts").default(0),
  healedCommand: text("healed_command"),
  guardrailCheck: jsonb("guardrail_check"),
  createdAt: timestamp("created_at").defaultNow(),
});

// WebSocket Connection Sessions
export const wsSessions = pgTable("ws_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  terminalId: uuid("terminal_id")
    .references(() => terminals.id, { onDelete: "cascade" })
    .notNull(),
  socketId: varchar("socket_id", { length: 255 }).notNull(),
  connectedAt: timestamp("connected_at").defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
  isActive: boolean("is_active").default(true),
});

// Audit Trail for ADGODMODE
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  terminalId: uuid("terminal_id").references(() => terminals.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  command: text("command"),
  details: jsonb("details"),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("low"),
  approved: boolean("approved").default(false),
  approvedBy: varchar("approved_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Token Usage Tracking
export const tokenUsage = pgTable("token_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  model: varchar("model", { length: 50 }).notNull(),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  costUsd: varchar("cost_usd", { length: 20 }),
  terminalId: uuid("terminal_id").references(() => terminals.id, { onDelete: "set null" }),
  commandLogId: uuid("command_log_id").references(() => commandLogs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Workspace Projects
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  localPath: text("local_path"),
  terminalId: uuid("terminal_id").references(() => terminals.id, { onDelete: "cascade" }),
  projectType: varchar("project_type", { length: 50 }),
  gitUrl: text("git_url"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Telegram Bots - Master and Clones
export const telegramBots = pgTable("telegram_bots", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: varchar("token", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("clone"), // "master" | "clone"
  parentToken: varchar("parent_token", { length: 255 }), // For clones, the master token
  chatId: integer("chat_id"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Types
export type TelegramBot = typeof telegramBots.$inferSelect;
export type NewTelegramBot = typeof telegramBots.$inferInsert;

// Types
export type Terminal = typeof terminals.$inferSelect;
export type NewTerminal = typeof terminals.$inferInsert;
export type CommandLog = typeof commandLogs.$inferSelect;
export type NewCommandLog = typeof commandLogs.$inferInsert;
export type WsSession = typeof wsSessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type Project = typeof projects.$inferSelect;
