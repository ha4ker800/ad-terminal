/**
 * AD TERMINAL - AI Token Manager & Multi-Model Router
 * Manages API keys, rate limits, and model rotation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIModel = "gemini-2.5-flash" | "gemini-2.5-pro" | "groq-llama3" | "openrouter-mixtral";

export interface ModelConfig {
  name: string;
  provider: "google" | "groq" | "openrouter";
  modelId: string;
  maxTokens: number;
  temperature: number;
  costPer1KTokens: number;
  apiKeyEnv: string;
}

export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
    provider: "google",
    modelId: "gemini-2.5-flash",
    maxTokens: 8192,
    temperature: 0.3,
    costPer1KTokens: 0.00015,
    apiKeyEnv: "GEMINI_API_KEY",
  },
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro",
    provider: "google",
    modelId: "gemini-2.5-pro",
    maxTokens: 8192,
    temperature: 0.3,
    costPer1KTokens: 0.00125,
    apiKeyEnv: "GEMINI_API_KEY",
  },
  "groq-llama3": {
    name: "Groq Llama 3",
    provider: "groq",
    modelId: "llama-3.1-70b-versatile",
    maxTokens: 4096,
    temperature: 0.3,
    costPer1KTokens: 0.00059,
    apiKeyEnv: "GROQ_API_KEY",
  },
  "openrouter-mixtral": {
    name: "OpenRouter Mixtral",
    provider: "openrouter",
    modelId: "mistralai/mixtral-8x7b-instruct",
    maxTokens: 4096,
    temperature: 0.3,
    costPer1KTokens: 0.0006,
    apiKeyEnv: "OPENROUTER_API_KEY",
  },
};

// Rate limiting tracking
interface RateLimitTracker {
  requests: number;
  tokens: number;
  resetAt: Date;
}

const rateLimits: Map<AIModel, RateLimitTracker> = new Map();

/**
 * Get or initialize rate limit tracker for a model
 */
function getRateLimit(model: AIModel): RateLimitTracker {
  if (!rateLimits.has(model)) {
    rateLimits.set(model, {
      requests: 0,
      tokens: 0,
      resetAt: new Date(Date.now() + 60000), // 1 minute window
    });
  }
  return rateLimits.get(model)!;
}

/**
 * Check if model is rate limited
 */
export function isRateLimited(model: AIModel): boolean {
  const tracker = getRateLimit(model);
  
  // Reset if window expired
  if (new Date() > tracker.resetAt) {
    tracker.requests = 0;
    tracker.tokens = 0;
    tracker.resetAt = new Date(Date.now() + 60000);
    return false;
  }
  
  // Different limits per provider
  const limits: Record<string, { requests: number; tokens: number }> = {
    google: { requests: 60, tokens: 1000000 },
    groq: { requests: 30, tokens: 6000 },
    openrouter: { requests: 20, tokens: 10000 },
  };
  
  const config = MODEL_CONFIGS[model];
  const limit = limits[config.provider];
  
  return tracker.requests >= limit.requests || tracker.tokens >= limit.tokens;
}

/**
 * Update rate limit tracking
 */
function updateRateLimit(model: AIModel, tokens: number): void {
  const tracker = getRateLimit(model);
  tracker.requests++;
  tracker.tokens += tokens;
}

/**
 * Get the best available model based on rate limits and priority
 */
export function getAvailableModel(preferred?: AIModel): AIModel | null {
  const models: AIModel[] = ["gemini-2.5-flash", "groq-llama3", "openrouter-mixtral", "gemini-2.5-pro"];
  
  // Try preferred model first
  if (preferred && !isRateLimited(preferred)) {
    return preferred;
  }
  
  // Find first non-rate-limited model
  for (const model of models) {
    if (!isRateLimited(model)) {
      return model;
    }
  }
  
  return null; // All models rate limited
}

/**
 * Generate system prompt with device telemetry context
 */
export function generateSystemPrompt(telemetry?: DeviceTelemetry): string {
  const basePrompt = `[AD TERMINAL :: AI COMMAND ENGINE v1.0]

You are an autonomous command generation AI for the AD TERMINAL platform.
Your task is to generate precise, executable shell commands based on user requests.

RULES:
1. Generate ONLY the command(s) needed - no explanations in output
2. Use appropriate syntax for the target OS
3. Chain commands with && or ; for sequential execution
4. Use proper escaping for special characters
5. Prefer safe, non-destructive operations
6. When uncertain, generate informative commands rather than destructive ones

OUTPUT FORMAT:
Return ONLY the executable command(s). No markdown, no backticks, no commentary.
Example good output: cd ~/workspace && git pull origin main
Example bad output: \`\`\`bash\ncd ~/workspace\n\`\`\``;

  if (telemetry) {
    return `${basePrompt}

TARGET DEVICE PROFILE:
- OS: ${telemetry.osType} ${telemetry.osVersion || ""}
- Kernel: ${telemetry.kernel || "unknown"}
- CPU Cores: ${telemetry.cpuCores || "unknown"}
- RAM: ${telemetry.freeRamMb ? `${Math.round(telemetry.freeRamMb / 1024)}GB free` : "unknown"}
- Battery: ${telemetry.batteryLevel ? `${telemetry.batteryLevel}%` : "unknown"}
- Installed Tools: ${telemetry.installedTools?.join(", ") || "unknown"}

ADJUSTMENTS:
- Use ${telemetry.osType === "windows" ? "PowerShell/CMD" : "Bash"} syntax
${telemetry.freeRamMb && telemetry.freeRamMb < 2048 ? "- AVOID memory-intensive operations (low RAM device)" : ""}
${telemetry.batteryLevel && telemetry.batteryLevel < 20 ? "- Minimize CPU usage (low battery)" : ""}
${!telemetry.installedTools?.includes("python") ? "- DO NOT use python commands" : ""}
${!telemetry.installedTools?.includes("node") ? "- DO NOT use npm/node commands" : ""}`;
  }

  return basePrompt;
}

/**
 * Generate command using Gemini API
 */
export async function generateWithGemini(
  prompt: string,
  modelId: "gemini-2.5-flash" | "gemini-2.5-pro" = "gemini-2.5-flash",
  telemetry?: DeviceTelemetry
): Promise<{ command: string; tokens: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[AD TERMINAL :: ERROR] GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  const systemPrompt = generateSystemPrompt(telemetry);
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUSER REQUEST: ${prompt}` }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  const response = result.response;
  const command = response.text().trim();
  
  // Estimate tokens (rough approximation)
  const tokens = Math.ceil((systemPrompt.length + prompt.length + command.length) / 4);
  updateRateLimit(modelId, tokens);

  return { command, tokens };
}

/**
 * Generate command using Groq API
 */
export async function generateWithGroq(
  prompt: string,
  telemetry?: DeviceTelemetry
): Promise<{ command: string; tokens: number }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("[AD TERMINAL :: ERROR] GROQ_API_KEY not configured");
  }

  const systemPrompt = generateSystemPrompt(telemetry);
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`[AD TERMINAL :: ERROR] Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  const command = data.choices[0]?.message?.content?.trim() || "";
  const tokens = data.usage?.total_tokens || Math.ceil((systemPrompt.length + prompt.length + command.length) / 4);
  
  updateRateLimit("groq-llama3", tokens);

  return { command, tokens };
}

/**
 * Generate command using OpenRouter API
 */
export async function generateWithOpenRouter(
  prompt: string,
  telemetry?: DeviceTelemetry
): Promise<{ command: string; tokens: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("[AD TERMINAL :: ERROR] OPENROUTER_API_KEY not configured");
  }

  const systemPrompt = generateSystemPrompt(telemetry);
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`[AD TERMINAL :: ERROR] OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  const command = data.choices[0]?.message?.content?.trim() || "";
  const tokens = data.usage?.total_tokens || Math.ceil((systemPrompt.length + prompt.length + command.length) / 4);
  
  updateRateLimit("openrouter-mixtral", tokens);

  return { command, tokens };
}

/**
 * Main command generation function with fallback routing
 */
export async function generateCommand(
  prompt: string,
  preferredModel?: AIModel,
  telemetry?: DeviceTelemetry
): Promise<{ command: string; model: string; tokens: number }> {
  const model = getAvailableModel(preferredModel);
  
  if (!model) {
    throw new Error("[AD TERMINAL :: ERROR] All AI models rate limited. Please try again shortly.");
  }

  try {
    let result: { command: string; tokens: number };
    
    switch (MODEL_CONFIGS[model].provider) {
      case "google":
        result = await generateWithGemini(prompt, model as "gemini-2.5-flash" | "gemini-2.5-pro", telemetry);
        break;
      case "groq":
        result = await generateWithGroq(prompt, telemetry);
        break;
      case "openrouter":
        result = await generateWithOpenRouter(prompt, telemetry);
        break;
      default:
        throw new Error(`[AD TERMINAL :: ERROR] Unknown provider for model: ${model}`);
    }

    return { ...result, model };
  } catch (error) {
    // Try fallback model
    const fallbackModel = getAvailableModel();
    if (fallbackModel && fallbackModel !== model) {
      console.log(`[AD TERMINAL :: FALLBACK] ${model} failed, trying ${fallbackModel}`);
      return generateCommand(prompt, fallbackModel, telemetry);
    }
    throw error;
  }
}

/**
 * Generate command using multiple models and select best (Parallel Mode)
 */
export async function generateCommandParallel(
  prompt: string,
  telemetry?: DeviceTelemetry
): Promise<{ command: string; model: string; tokens: number; comparison: string }> {
  const models: AIModel[] = ["gemini-2.5-flash", "groq-llama3"];
  
  const results = await Promise.allSettled([
    generateWithGemini(prompt, "gemini-2.5-flash", telemetry),
    generateWithGroq(prompt, telemetry),
  ]);

  const successful = results
    .map((r, i) => ({ result: r, model: models[i] }))
    .filter((r): r is { result: PromiseFulfilledResult<{ command: string; tokens: number }>; model: AIModel } => 
      r.result.status === "fulfilled"
    );

  if (successful.length === 0) {
    throw new Error("[AD TERMINAL :: ERROR] All models failed to generate command");
  }

  // Simple heuristic: prefer shorter commands that contain common safe keywords
  const scored = successful.map(({ result, model }) => {
    const cmd = result.value.command;
    let score = 0;
    
    // Penalize very long commands
    if (cmd.length < 200) score += 10;
    
    // Prefer commands with common safe operations
    if (/git|npm|pip|apt|cd|ls|mkdir/.test(cmd)) score += 5;
    
    // Penalize commands with dangerous patterns
    if (/rm|del|format|dd/.test(cmd)) score -= 10;
    
    return { 
      command: cmd, 
      model, 
      tokens: result.value.tokens,
      score 
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];

  const comparison = `Parallel Mode Results:
${scored.map((s, i) => `${i === 0 ? "✓" : " "} ${s.model}: "${s.command.substring(0, 50)}..." (score: ${s.score})`).join("\n")}`;

  return {
    command: winner.command,
    model: winner.model,
    tokens: winner.tokens,
    comparison,
  };
}

// Device telemetry type
export interface DeviceTelemetry {
  osType: string;
  osVersion?: string;
  kernel?: string;
  cpuCores?: number;
  totalRamMb?: number;
  freeRamMb?: number;
  batteryLevel?: number;
  installedTools?: string[];
}

export default {
  generateCommand,
  generateCommandParallel,
  getAvailableModel,
  isRateLimited,
  MODEL_CONFIGS,
};
