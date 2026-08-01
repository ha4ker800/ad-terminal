# AD TERMINAL — Vercel + Neon Deploy Guide

## Step 1: Neon Database Setup

1. Go to https://neon.tech → Sign up → **New Project**
2. Name it `ad-terminal`
3. Region: `US East` (closest to Vercel default)
4. Click **Create Project**
5. Copy the **Pooled connection string** (looks like):
   ```
   postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## Step 2: Run DB Migrations (One Time Only)

On your local machine (NOT Termux — too slow):
```bash
# Add DATABASE_URL to .env.local first
echo "DATABASE_URL=your_neon_url_here" > .env.local

# Push schema to Neon
npm run db:push
```

This creates all tables in Neon. You only do this once.

## Step 3: Upstash Redis (Optional but Recommended)

1. Go to https://upstash.com → **Create Database**
2. Name: `ad-terminal-queue`
3. Region: `US East 1`
4. Copy **REST URL** and **REST Token**

## Step 4: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, then go to Vercel Dashboard
```

## Step 5: Set Environment Variables in Vercel

Go to your project → **Settings** → **Environment Variables** → Add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon pooled connection string |
| `UPSTASH_REDIS_REST_URL` | Your Upstash URL |
| `UPSTASH_REDIS_REST_TOKEN` | Your Upstash token |
| `GEMINI_API_KEY` | Your Gemini key |
| `GROQ_API_KEY` | Your Groq key |
| `NEXT_PUBLIC_APP_URL` | https://your-app.vercel.app |

Then **Redeploy** once after setting env vars.

## Step 6: Test

1. Open your Vercel URL
2. Click **+ ADD TERMINAL**
3. Copy the curl command
4. Run it in Termux
5. Terminal should appear as Online ✅

## Files Changed in This Fix

| File | What Changed |
|---|---|
| `next.config.ts` | Removed `output: standalone`, removed WS headers |
| `package.json` | Fixed `lucide-react` version, removed `@vercel/kv`, updated xterm packages |
| `src/db/index.ts` | Added Neon SSL support, serverless pool sizing |
| `src/lib/command_queue.ts` | Replaced `@vercel/kv` with `@upstash/redis`, removed broken `fastQueue` |
| `.env.example` | Updated with correct Neon + Upstash variable names |
