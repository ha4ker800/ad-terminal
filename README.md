# AD TERMINAL v1.0

**Enterprise-Grade Autonomous Command & Control AI Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<p align="center">
  <img src="https://raw.githubusercontent.com/user/repo/main/docs/terminal-demo.gif" alt="AD TERMINAL Demo" width="800"/>
</p>

## 🚀 Features

### Core Platform
- 🔌 **Multi-Device Pairing** - Connect Android (Termux), Windows, Linux, macOS
- 🌐 **WebSocket & HTTP Polling** - Works on Vercel serverless
- 🤖 **AI Command Generation** - Gemini, Groq, OpenRouter integration
- ⚡ **ADGODMODE Protocol** - Unrestricted autonomous execution
- 🛡️ **Security Guardrails** - 12+ safety rules with audit logging
- 🔧 **Auto-Self-Healing** - Automatic error recovery (3 retry cycles)

### App Building Studio
- 📝 **Code Editor** with syntax highlighting
- 🔀 **AST Code Patching** - In-place code modification
- 🧪 **API Payload Tester** - HTTP request testing
- 👁️ **Live Preview** - Local dev server tunneling
- 📦 **Project Management** - React, Vue, Python, Android projects

### Integrations
- 📱 **Telegram Bot** - Control from anywhere
- 🗄️ **PostgreSQL** - Persistent storage
- ⚡ **Redis/KV** - Command queue for serverless

## 📦 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/ad-terminal.git
cd ad-terminal
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb ad_terminal

# Push schema
npx drizzle-kit push
```

### 4. Run Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔌 Connecting Devices

### Android (Termux)

```bash
curl -sSL http://localhost:3000/connect.sh | bash -s YOUR_TOKEN
```

### Windows PowerShell

```powershell
iwr -useb http://localhost:3000/connect.ps1 | iex -args "YOUR_TOKEN"
```

### Windows CMD

```cmd
curl -sSL http://localhost:3000/connect.bat -o connect.bat && connect.bat YOUR_TOKEN
```

### Linux/macOS

```bash
curl -sSL http://localhost:3000/connect.sh | bash -s YOUR_TOKEN
```

## 🛠️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AD TERMINAL v1.0                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 16)                                      │
│  ├── React Components (Cyber-Terminal UI)                   │
│  ├── WebSocket / HTTP Polling Client                        │
│  └── Code Editor (AST Patching)                             │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Next.js API Routes)                             │
│  ├── /api/terminals - Device management                     │
│  ├── /api/execute - Command execution                       │
│  ├── /api/ws - Polling endpoint (serverless)                │
│  └── /api/telegram/webhook - Bot integration                │
├─────────────────────────────────────────────────────────────┤
│  Services                                                   │
│  ├── Token Manager (AI routing)                             │
│  ├── Guardrails (Security)                                  │
│  ├── Error Healing (Auto-recovery)                          │
│  └── Command Queue (Redis/Vercel KV)                        │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── PostgreSQL (Drizzle ORM)                               │
│  └── Redis/Vercel KV (Command queue)                        │
├─────────────────────────────────────────────────────────────┤
│  Connected Devices                                          │
│  ├── Android (Termux)                                       │
│  ├── Windows (PowerShell/CMD)                               │
│  ├── Linux                                                  │
│  └── macOS                                                  │
└─────────────────────────────────────────────────────────────┘
```

## 🎮 Usage

### Dashboard

1. **Add Terminal** - Click "+ ADD TERMINAL" or press `Ctrl+Shift+T`
2. **Select Device Type** - Choose your OS
3. **Run Connection Script** - Copy and run the one-liner on your device
4. **Execute Commands** - Type in terminal drawer or use AI generation

### Execution Modes

| Mode | Description |
|------|-------------|
| **SINGLE** | Fast execution with one AI model |
| **PARALLEL** | Dual AI models with optimal output selection |
| **ADGODMODE** | Unrestricted execution with auto-healing |

### AI Command Generation

```
Type: "list all files modified in last 24 hours"
AI generates: find . -mtime -1 -type f -ls
```

### App Building Studio

1. Navigate to `/studio`
2. Create a new project
3. Select project type (React, Vue, Python, etc.)
4. Use Code Editor with AST patching
5. Test APIs with Payload Tester
6. Preview live in iframe

## 🛡️ Security

### Guardrail Levels

- **CRITICAL** (Auto-block): Disk wipe, root deletion, shutdown
- **HIGH** (Require approval): Sudo, network kill, package removal
- **MEDIUM** (Logged): File delete, git force, remote downloads
- **LOW** (Allowed): Information commands

### ADGODMODE Audit

All unrestricted executions are logged with:
- Command executed
- Terminal ID
- Risk level
- Timestamp
- Approval status

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GEMINI_API_KEY` | No | Google Gemini API |
| `GROQ_API_KEY` | No | Groq API |
| `OPENROUTER_API_KEY` | No | OpenRouter API |
| `KV_REST_API_URL` | No | Vercel KV for queue |
| `TELEGRAM_BOT_TOKEN` | No | Telegram Bot |

### Telegram Bot Setup

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create new bot with `/newbot`
3. Copy token to `TELEGRAM_BOT_TOKEN`
4. Set webhook: `https://your-app.vercel.app/api/telegram/webhook`

## 📱 Client Scripts

Client scripts are auto-generated in `public/scripts/`:

- `connect.sh` - Bash script for Termux/Linux/macOS
- `connect.ps1` - PowerShell script for Windows
- `connect.bat` - CMD batch file for Windows

Scripts handle:
- OS detection
- Dependency installation
- Telemetry gathering
- WebSocket/HTTP polling connection

## 🧪 Development

### Run Tests

```bash
npm run typecheck
npm run lint
npm run build
```

### Database Migrations

```bash
# Generate migration
npx drizzle-kit generate

# Push schema
npx drizzle-kit push
```

### Adding New AI Models

Edit `src/lib/token_manager.ts`:

```typescript
export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  // Add your model here
  "your-model": {
    name: "Your Model",
    provider: "your-provider",
    modelId: "model-id",
    maxTokens: 4096,
    temperature: 0.3,
    costPer1KTokens: 0.001,
    apiKeyEnv: "YOUR_API_KEY",
  },
};
```

## 🚀 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ad-terminal)

1. Connect GitHub repository
2. Add environment variables
3. Add PostgreSQL (Neon or Supabase)
4. Deploy!

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted

```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### WebSocket Not Working

On Vercel, WebSockets don't work. The app automatically falls back to HTTP polling.

### Commands Not Executing

1. Check terminal is online (green indicator)
2. Verify client script is running
3. Check logs in terminal drawer

### AI Not Responding

1. Verify API keys in `.env`
2. Check rate limits
3. Try different execution mode

### Database Connection Failed

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🔮 Roadmap

- [ ] SSH tunneling support
- [ ] File manager UI
- [ ] Docker container management
- [ ] Kubernetes integration
- [ ] Multi-user support with RBAC
- [ ] Audit log analytics
- [ ] Mobile app (React Native)

## 📞 Support

- Discord: [Join Server](https://discord.gg/adterminal)
- Issues: [GitHub Issues](https://github.com/yourusername/ad-terminal/issues)
- Email: support@adterminal.dev

---

<p align="center">
  <strong>[AD TERMINAL :: v1.0 :: SYSTEM OPERATIONAL]</strong>
</p>
