import { NextRequest, NextResponse } from "next/server";
import { initializeMasterBot, getMasterBot } from "@/lib/telegram_master";

/**
 * AD TERMINAL - Telegram Master/Clone Bot Webhook Handler
 * Routes updates to appropriate bot (master or clone)
 */

// POST /api/telegram/webhook - Handle incoming updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = request.url;
    
    // Determine if this is master or clone webhook
    const isMaster = url.includes("/master");
    const isClone = url.includes("/clone/");
    
    // Get bot type and ID
    let botType: "master" | "clone" = "master";
    let botId = "master";
    
    if (isClone) {
      botType = "clone";
      const match = url.match(/\/clone\/([^\/]+)/);
      botId = match ? match[1] : "unknown";
    }
    
    // Initialize master bot if needed
    const masterToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!masterToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"}/api/telegram/webhook`;
    
    let masterBot = getMasterBot();
    if (!masterBot) {
      masterBot = initializeMasterBot(masterToken, webhookUrl);
      await masterBot.initialize();
    }
    
    // Route the update
    await masterBot.routeCommand(botType, botId, body);
    
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error("[TELEGRAM WEBHOOK ERROR]", error);
    return NextResponse.json({ ok: false, error: "Webhook failed" });
  }
}

// GET /api/telegram/webhook - Setup/verification endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  
  if (action === "setup") {
    // Setup webhooks
    const masterToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!masterToken) {
      return NextResponse.json({ error: "No token configured" }, { status: 500 });
    }
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"}/api/telegram/webhook`;
    
    try {
      const masterBot = initializeMasterBot(masterToken, webhookUrl);
      await masterBot.initialize();
      
      return NextResponse.json({
        success: true,
        message: "Telegram bots initialized",
        masterWebhook: `${webhookUrl}/master`,
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Setup failed",
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({
    status: "AD TERMINAL Telegram Webhook",
    endpoints: {
      master: "/api/telegram/webhook/master",
      clone: "/api/telegram/webhook/clone/:cloneId",
    },
  });
}
