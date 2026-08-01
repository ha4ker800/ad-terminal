/**
 * AD TERMINAL - Serverless Command Queue
 * Upstash Redis-based queue for Vercel serverless compatibility
 * Falls back to in-memory for local development (no Redis needed locally)
 */

// ✅ Replaced deprecated @vercel/kv with @upstash/redis
import { Redis } from "@upstash/redis";

interface QueuedCommand {
  id: string;
  terminalId: string;
  command: string;
  executionMode: "single" | "parallel" | "adgodmode";
  timestamp: number;
  status: "pending" | "executing" | "completed" | "failed";
  result?: {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTimeMs: number;
  };
}

const COMMAND_TTL = 3600; // 1 hour

// ✅ Only init Redis if env vars are present
const USE_REDIS =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (USE_REDIS) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// ✅ In-memory fallback for local dev only
// NOTE: On Vercel, fastQueue is skipped entirely — Redis is the only
// persistent store between serverless function invocations
const memoryQueue: Map<string, QueuedCommand> = new Map();

/**
 * Add command to queue
 */
export async function enqueueCommand(
  terminalId: string,
  command: string,
  executionMode: "single" | "parallel" | "adgodmode" = "single"
): Promise<QueuedCommand> {
  const cmd: QueuedCommand = {
    id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    terminalId,
    command,
    executionMode,
    timestamp: Date.now(),
    status: "pending",
  };

  if (redis) {
    // ✅ Vercel path: persist to Redis only (no in-memory)
    const queueKey = `terminal:${terminalId}:commands`;
    await redis.lpush(queueKey, JSON.stringify(cmd));
    await redis.expire(queueKey, COMMAND_TTL);
    await redis.setex(`command:${cmd.id}`, COMMAND_TTL, JSON.stringify(cmd));
  } else {
    // Local dev fallback
    memoryQueue.set(cmd.id, cmd);
  }

  console.log(
    `[AD TERMINAL :: QUEUE] Enqueued ${cmd.id} for terminal ${terminalId}`
  );
  return cmd;
}

/**
 * Get next pending command for terminal (called by polling terminal)
 */
export async function dequeueCommand(
  terminalId: string
): Promise<QueuedCommand | null> {
  if (redis) {
    // ✅ Vercel path: pull from Redis queue
    const queueKey = `terminal:${terminalId}:commands`;
    const data = await redis.rpop(queueKey);

    if (data) {
      const cmd: QueuedCommand =
        typeof data === "string" ? JSON.parse(data) : data;
      cmd.status = "executing";
      await redis.setex(
        `command:${cmd.id}`,
        COMMAND_TTL,
        JSON.stringify(cmd)
      );
      return cmd;
    }
    return null;
  }

  // Local dev fallback
  const commands = Array.from(memoryQueue.values())
    .filter((c) => c.terminalId === terminalId && c.status === "pending")
    .sort((a, b) => a.timestamp - b.timestamp);

  if (commands.length > 0) {
    const cmd = commands[0];
    cmd.status = "executing";
    memoryQueue.set(cmd.id, cmd);
    return cmd;
  }

  return null;
}

/**
 * Get command by ID
 */
export async function getCommand(
  commandId: string
): Promise<QueuedCommand | null> {
  if (redis) {
    const data = await redis.get(`command:${commandId}`);
    if (!data) return null;
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return parsed && parsed.id ? (parsed as QueuedCommand) : null;
  }
  return memoryQueue.get(commandId) || null;
}

/**
 * Store command result
 */
export async function updateCommandResult(
  commandId: string,
  result: QueuedCommand["result"]
): Promise<void> {
  if (redis) {
    const data = await redis.get(`command:${commandId}`);
    if (data) {
      const cmd: QueuedCommand =
        typeof data === "string" ? JSON.parse(data) : data;
      cmd.result = result;
      cmd.status =
        result && result.exitCode === 0 ? "completed" : "failed";
      await redis.setex(
        `command:${commandId}`,
        COMMAND_TTL,
        JSON.stringify(cmd)
      );
    }
  } else {
    const cmd = memoryQueue.get(commandId);
    if (cmd) {
      cmd.result = result;
      cmd.status =
        result && result.exitCode === 0 ? "completed" : "failed";
      memoryQueue.set(commandId, cmd);
    }
  }
}

/**
 * Get pending commands count
 */
export async function getPendingCount(terminalId: string): Promise<number> {
  if (redis) {
    const queueKey = `terminal:${terminalId}:commands`;
    return (await redis.llen(queueKey)) || 0;
  }
  return Array.from(memoryQueue.values()).filter(
    (c) => c.terminalId === terminalId && c.status === "pending"
  ).length;
}

/**
 * Clear terminal queue
 */
export async function clearTerminalQueue(terminalId: string): Promise<void> {
  if (redis) {
    await redis.del(`terminal:${terminalId}:commands`);
  } else {
    for (const [id, cmd] of memoryQueue.entries()) {
      if (cmd.terminalId === terminalId) memoryQueue.delete(id);
    }
  }
}

export default {
  enqueueCommand,
  dequeueCommand,
  getCommand,
  updateCommandResult,
  getPendingCount,
  clearTerminalQueue,
};
