/**
 * AD TERMINAL - WebSocket Server
 * Handles persistent WebSocket connections from local execution nodes
 */

import { WebSocket, WebSocketServer } from "ws";
import { db } from "@/db";
import { terminals, commandLogs, wsSessions, executionModeEnum } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { evaluateCommand } from "./guardrails";

// Type for execution mode
type ExecutionMode = typeof executionModeEnum.enumValues[number];

// Connection store
interface TerminalConnection {
  socket: WebSocket;
  terminalId: string;
  nodeToken: string;
  socketId: string;
  connectedAt: Date;
  lastPing: Date;
  isAlive: boolean;
}

const connections: Map<string, TerminalConnection> = new Map();
const terminalSockets: Map<string, string> = new Map(); // terminalId -> socketId

// Message types
export type MessageType =
  | "telemetry"
  | "command"
  | "output"
  | "ping"
  | "pong"
  | "auth"
  | "auth_success"
  | "auth_failed"
  | "execute"
  | "execute_result"
  | "broadcast"
  | "disconnect";

export interface WSMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
  nodeToken?: string;
}

export interface TelemetryPayload {
  osType: string;
  osVersion?: string;
  kernel?: string;
  cpuCores?: number;
  totalRamMb?: number;
  freeRamMb?: number;
  batteryLevel?: number;
  installedTools?: string[];
  ipAddress?: string;
}

export interface CommandPayload {
  commandId?: string;
  command: string;
  executionMode?: ExecutionMode;
  requireApproval?: boolean;
}

export interface OutputPayload {
  commandId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(port: number = 3001): WebSocketServer {
  const wss = new WebSocketServer({ port });

  console.log(`[AD TERMINAL :: WEBSOCKET] Server initialized on port ${port}`);

  wss.on("connection", (socket: WebSocket, req) => {
    const socketId = uuidv4();
    console.log(`[AD TERMINAL :: WEBSOCKET] New connection: ${socketId}`);

    socket.on("message", async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        await handleMessage(socket, socketId, message);
      } catch (error) {
        console.error(`[AD TERMINAL :: WEBSOCKET] Message parse error:`, error);
        sendMessage(socket, {
          type: "auth_failed",
          payload: { error: "Invalid message format" },
          timestamp: Date.now(),
        });
      }
    });

    socket.on("close", () => {
      handleDisconnect(socketId);
    });

    socket.on("error", (error) => {
      console.error(`[AD TERMINAL :: WEBSOCKET] Socket error for ${socketId}:`, error);
    });

    // Send initial auth request
    sendMessage(socket, {
      type: "auth",
      payload: { message: "Send auth with nodeToken" },
      timestamp: Date.now(),
    });
  });

  // Start heartbeat interval
  setInterval(heartbeat, 30000);

  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(
  socket: WebSocket,
  socketId: string,
  message: WSMessage
): Promise<void> {
  switch (message.type) {
    case "auth":
      await handleAuth(socket, socketId, message.payload as { nodeToken: string });
      break;

    case "telemetry":
      await handleTelemetry(socketId, message.payload as TelemetryPayload);
      break;

    case "ping":
      handlePing(socketId);
      break;

    case "output":
      await handleOutput(socketId, message.payload as OutputPayload);
      break;

    case "execute_result":
      await handleExecuteResult(socketId, message.payload as OutputPayload);
      break;

    default:
      console.log(`[AD TERMINAL :: WEBSOCKET] Unknown message type: ${message.type}`);
  }
}

/**
 * Handle authentication
 */
async function handleAuth(
  socket: WebSocket,
  socketId: string,
  payload: { nodeToken: string }
): Promise<void> {
  const { nodeToken } = payload;

  try {
    // Find terminal by node token
    const terminalResult = await db.select().from(terminals).where(eq(terminals.nodeToken, nodeToken)).limit(1);
    const terminal = terminalResult[0];

    if (!terminal) {
      console.log(`[AD TERMINAL :: WEBSOCKET] Auth failed: Invalid node token ${nodeToken}`);
      sendMessage(socket, {
        type: "auth_failed",
        payload: { error: "Invalid node token" },
        timestamp: Date.now(),
      });
      return;
    }

    // Store connection
    const conn: TerminalConnection = {
      socket,
      terminalId: terminal.id,
      nodeToken,
      socketId,
      connectedAt: new Date(),
      lastPing: new Date(),
      isAlive: true,
    };

    connections.set(socketId, conn);
    terminalSockets.set(terminal.id, socketId);

    // Update terminal status
    await db
      .update(terminals)
      .set({
        status: "online",
        lastPingAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(terminals.id, terminal.id));

    // Create session record
    await db.insert(wsSessions).values({
      terminalId: terminal.id,
      socketId,
      isActive: true,
    });

    console.log(`[AD TERMINAL :: WEBSOCKET] Auth success: Terminal ${terminal.deviceName || terminal.id}`);

    // Send success response
    sendMessage(socket, {
      type: "auth_success",
      payload: {
        terminalId: terminal.id,
        deviceName: terminal.deviceName,
        message: "[AD TERMINAL :: CONNECTED] Authentication successful",
      },
      timestamp: Date.now(),
      nodeToken,
    });

    // Trigger on-connect boot script
    await sendBootScript(socket, nodeToken);

  } catch (error) {
    console.error(`[AD TERMINAL :: WEBSOCKET] Auth error:`, error);
    sendMessage(socket, {
      type: "auth_failed",
      payload: { error: "Authentication error" },
      timestamp: Date.now(),
    });
  }
}

/**
 * Send on-connect boot script to terminal
 */
async function sendBootScript(socket: WebSocket, nodeToken: string): Promise<void> {
  const bootScript = `[AD TERMINAL :: BOOT] Initializing zero-token setup...

# Create workspace directory
mkdir -p ~/ad_terminal_workspace
mkdir -p ~/ad_terminal_workspace/projects
mkdir -p ~/ad_terminal_workspace/logs

# Detect OS and update packages
if command -v apt-get &> /dev/null; then
    echo "[AD TERMINAL :: BOOT] Debian/Ubuntu detected, updating..."
    apt-get update -qq
    apt-get install -y -qq curl wget git python3 python3-pip nodejs npm ffmpeg 2>/dev/null || true
elif command -v yum &> /dev/null; then
    echo "[AD TERMINAL :: BOOT] RHEL/CentOS detected, updating..."
    yum update -y -q
    yum install -y -q curl wget git python3 nodejs ffmpeg 2>/dev/null || true
elif command -v termux-setup-storage &> /dev/null; then
    echo "[AD TERMINAL :: BOOT] Termux detected, updating..."
    pkg update -y
    pkg install -y curl wget git python nodejs ffmpeg termux-api
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OS" == "Windows_NT" ]]; then
    echo "[AD TERMINAL :: BOOT] Windows detected"
    # Windows packages managed via winget/chocolatey if available
fi

# Verify installations
echo "[AD TERMINAL :: BOOT] Verifying tools..."
python3 --version 2>/dev/null || python --version 2>/dev/null || echo "Python not available"
node --version 2>/dev/null || echo "Node not available"
git --version 2>/dev/null || echo "Git not available"

echo "[AD TERMINAL :: BOOT] Setup complete. Workspace ready at ~/ad_terminal_workspace"`;

  sendMessage(socket, {
    type: "execute",
    payload: {
      command: bootScript,
      commandId: `boot-${Date.now()}`,
      source: "on_connect_setup",
    },
    timestamp: Date.now(),
    nodeToken,
  });
}

/**
 * Handle telemetry updates
 */
async function handleTelemetry(
  socketId: string,
  payload: TelemetryPayload
): Promise<void> {
  const conn = connections.get(socketId);
  if (!conn) return;

  try {
    await db
      .update(terminals)
      .set({
        osType: payload.osType as "android" | "windows" | "linux" | "macos" | "unknown",
        osVersion: payload.osVersion,
        kernel: payload.kernel,
        cpuCores: payload.cpuCores,
        totalRamMb: payload.totalRamMb,
        freeRamMb: payload.freeRamMb,
        batteryLevel: payload.batteryLevel,
        installedTools: payload.installedTools,
        ipAddress: payload.ipAddress,
        lastPingAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(terminals.id, conn.terminalId));

    conn.lastPing = new Date();
    console.log(`[AD TERMINAL :: TELEMETRY] Updated for terminal ${conn.terminalId}`);

  } catch (error) {
    console.error(`[AD TERMINAL :: TELEMETRY] Update error:`, error);
  }
}

/**
 * Handle ping/pong
 */
function handlePing(socketId: string): void {
  const conn = connections.get(socketId);
  if (!conn) return;

  conn.lastPing = new Date();
  conn.isAlive = true;

  sendMessage(conn.socket, {
    type: "pong",
    payload: { timestamp: Date.now() },
    timestamp: Date.now(),
    nodeToken: conn.nodeToken,
  });
}

/**
 * Handle command output from terminal
 */
async function handleOutput(socketId: string, payload: OutputPayload): Promise<void> {
  const conn = connections.get(socketId);
  if (!conn) return;

  console.log(`[AD TERMINAL :: OUTPUT] Received output for command ${payload.commandId}`);

  // Update command log if exists
  if (payload.commandId) {
    await db
      .update(commandLogs)
      .set({
        stdout: payload.stdout,
        stderr: payload.stderr,
        exitCode: payload.exitCode,
        executionTimeMs: payload.executionTimeMs,
        status: payload.exitCode === 0 ? "completed" : "failed",
      })
      .where(eq(commandLogs.id, payload.commandId));
  }
}

/**
 * Handle execution result
 */
async function handleExecuteResult(socketId: string, payload: OutputPayload): Promise<void> {
  const conn = connections.get(socketId);
  if (!conn) return;

  console.log(`[AD TERMINAL :: RESULT] Command ${payload.commandId} completed with exit code ${payload.exitCode}`);

  // Broadcast to any listeners
  broadcastToDashboard("command_result", {
    terminalId: conn.terminalId,
    ...payload,
  });
}

/**
 * Handle disconnection
 */
async function handleDisconnect(socketId: string): Promise<void> {
  const conn = connections.get(socketId);
  if (!conn) return;

  console.log(`[AD TERMINAL :: WEBSOCKET] Disconnect: ${socketId}`);

  // Update terminal status
  await db
    .update(terminals)
    .set({
      status: "offline",
      disconnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(terminals.id, conn.terminalId));

  // Mark session inactive
  await db
    .update(wsSessions)
    .set({
      disconnectedAt: new Date(),
      isActive: false,
    })
    .where(and(
      eq(wsSessions.socketId, socketId),
      eq(wsSessions.terminalId, conn.terminalId)
    ));

  terminalSockets.delete(conn.terminalId);
  connections.delete(socketId);
}

/**
 * Heartbeat to check connection health
 */
async function heartbeat(): Promise<void> {
  const now = new Date();
  const timeout = 60000; // 60 seconds

  for (const [socketId, conn] of connections) {
    if (now.getTime() - conn.lastPing.getTime() > timeout) {
      console.log(`[AD TERMINAL :: HEARTBEAT] Timeout for ${socketId}`);
      conn.socket.terminate();
      await handleDisconnect(socketId);
    } else {
      // Send ping
      sendMessage(conn.socket, {
        type: "ping",
        payload: {},
        timestamp: Date.now(),
        nodeToken: conn.nodeToken,
      });
    }
  }
}

/**
 * Send message to a socket
 */
function sendMessage(socket: WebSocket, message: WSMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

/**
 * Execute command on a specific terminal
 */
export async function executeOnTerminal(
  terminalId: string,
  command: string,
  options: {
    executionMode?: "single" | "parallel" | "adgodmode";
    commandId?: string;
    requireApproval?: boolean;
  } = {}
): Promise<{ success: boolean; message: string; commandId?: string }> {
  const socketId = terminalSockets.get(terminalId);
  if (!socketId) {
    return { success: false, message: "Terminal not connected" };
  }

  const conn = connections.get(socketId);
  if (!conn) {
    return { success: false, message: "Connection not found" };
  }

  // Guardrail check
  const guardrailCheck = evaluateCommand(command, options.executionMode || "single");
  
  if (!guardrailCheck.allowed && guardrailCheck.requiresApproval && !options.requireApproval) {
    return {
      success: false,
      message: `Guardrail check: ${guardrailCheck.reason}`,
    };
  }

  const commandId = options.commandId || uuidv4();

  sendMessage(conn.socket, {
    type: "execute",
    payload: {
      command,
      commandId,
      executionMode: options.executionMode || "single",
    },
    timestamp: Date.now(),
    nodeToken: conn.nodeToken,
  });

  return {
    success: true,
    message: "Command dispatched",
    commandId,
  };
}

/**
 * Broadcast command to all connected terminals
 */
export async function broadcastToAll(
  command: string,
  options: {
    executionMode?: "single" | "parallel" | "adgodmode";
    excludeTerminalIds?: string[];
  } = {}
): Promise<{ success: boolean; message: string; targets: number }> {
  let count = 0;

  for (const [terminalId, socketId] of terminalSockets) {
    if (options.excludeTerminalIds?.includes(terminalId)) continue;

    const result = await executeOnTerminal(terminalId, command, options);
    if (result.success) count++;
  }

  return {
    success: count > 0,
    message: `Broadcast to ${count} terminals`,
    targets: count,
  };
}

/**
 * Broadcast message to dashboard listeners
 */
export function broadcastToDashboard(type: string, payload: unknown): void {
  // This would integrate with your dashboard SSE or WebSocket
  // For now, we'll use a global event emitter pattern
  if (typeof globalThis !== "undefined") {
    (globalThis as unknown as { adTerminalEvents?: EventTarget }).adTerminalEvents?.dispatchEvent(
      new CustomEvent("dashboard_update", { detail: { type, payload } })
    );
  }
}

/**
 * Get all connected terminals
 */
export function getConnectedTerminals(): Array<{
  socketId: string;
  terminalId: string;
  nodeToken: string;
  connectedAt: Date;
  lastPing: Date;
}> {
  return Array.from(connections.values()).map((conn) => ({
    socketId: conn.socketId,
    terminalId: conn.terminalId,
    nodeToken: conn.nodeToken,
    connectedAt: conn.connectedAt,
    lastPing: conn.lastPing,
  }));
}

/**
 * Get connection by terminal ID
 */
export function getConnectionByTerminalId(terminalId: string): TerminalConnection | undefined {
  const socketId = terminalSockets.get(terminalId);
  if (!socketId) return undefined;
  return connections.get(socketId);
}

export default {
  initializeWebSocketServer,
  executeOnTerminal,
  broadcastToAll,
  getConnectedTerminals,
  getConnectionByTerminalId,
  broadcastToDashboard,
};
