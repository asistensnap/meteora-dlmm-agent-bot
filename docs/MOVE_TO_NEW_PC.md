# Move To A New PC

This guide moves the Meteora DLMM Agent Bot to another Windows, macOS, Linux, or VPS machine without touching MCP configuration.

## What Gets Moved

Move these:

- GitHub repo
- `.env.example`
- local `.env` values recreated manually
- Obsidian notes
- EvilPanda skill
- Telegram bot/group/topic IDs

Do not move these through GitHub:

- `.env`
- wallet private key
- API keys
- bot tokens
- database files unless intentionally backed up
- logs
- MCP configs

## Windows Setup

```powershell
git clone https://github.com/asistensnap/meteora-dlmm-agent-bot.git
cd meteora-dlmm-agent-bot
npm install
copy .env.example .env
notepad .env
npm run ready
npm run lint
```

Fill `.env` manually from your private backup or provider dashboards.

## macOS/Linux Setup

```bash
git clone https://github.com/asistensnap/meteora-dlmm-agent-bot.git
cd meteora-dlmm-agent-bot
npm install
cp .env.example .env
nano .env
npm run ready
npm run lint
```

## VPS Setup

Use a VPS for live automation so the desktop does not become heavy.

```bash
git clone https://github.com/asistensnap/meteora-dlmm-agent-bot.git
cd meteora-dlmm-agent-bot
npm install
cp .env.example .env
nano .env
npm run ready
npm run build
```

Then run with your chosen process manager only when ready.

## Required Env Values

Minimum for Telegram/testing:

```env
TELEGRAM_CHAT_ID=
LIO_TELEGRAM_BOT_TOKEN=
CALA_TELEGRAM_BOT_TOKEN=
KONLIN_TELEGRAM_BOT_TOKEN=
```

Minimum for models:

```env
DEEPSEEK_API_KEY=
ANTHROPIC_API_KEY=
CLAUDE_ANALYST_MODEL=
OPENROUTER_API_KEY=
```

Minimum for Solana/live data:

```env
HELIUS_API_KEY=
RPC_URL=
WALLET_PRIVATE_KEY=
```

Safety defaults:

```env
DRY_RUN=true
ENABLE_REAL_EXECUTION=false
EXECUTION_MODE=SCANNER_ONLY
EMERGENCY_STOP=false
```

Change live execution only after tests pass and you understand the risk.

## Install EvilPanda Skill On New PC

Copy the repo skill into Codex's local skill folder.

Windows:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills\evilpanda-strategy"
Copy-Item ".\skills\evilpanda-strategy\SKILL.md" "$env:USERPROFILE\.codex\skills\evilpanda-strategy\SKILL.md" -Force
```

macOS/Linux:

```bash
mkdir -p ~/.codex/skills/evilpanda-strategy
cp skills/evilpanda-strategy/SKILL.md ~/.codex/skills/evilpanda-strategy/SKILL.md
```

## Install Gbrain On New PC / VPS

Gbrain is optional memory/context. It does not require changing MCP.

Clone and install:

```bash
git clone https://github.com/garrytan/gbrain.git ~/gbrain
cd ~/gbrain
```

Install Bun with the official Bun installer, then:

```bash
bun install
bun link
gbrain --version
gbrain init --pglite --no-embedding
```

Import Obsidian memory after copying the vault:

```bash
gbrain import "$HOME/Documents/Obsidian/Meteora Dlmm/Meteora DLMM Agent Bot" --no-embed
gbrain stats
```

On Windows PowerShell:

```powershell
$env:PATH='C:\Users\EBBE\.bun\bin;' + $env:PATH
gbrain import "C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot" --no-embed
gbrain stats
```

Keep Gbrain manual on desktop to avoid extra background load. Use VPS for 24/7 memory services later if needed.

## Move Obsidian Notes

Copy the Obsidian folder to your vault:

```text
Meteora Dlmm/Meteora DLMM Agent Bot
```

Recommended vault path:

Windows:

```text
C:\Users\<YOU>\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot
```

macOS/Linux:

```text
~/Documents/Obsidian/Meteora Dlmm/Meteora DLMM Agent Bot
```

## Telegram

Existing Telegram bot can be reused. You do not need to create new bots if you still control the old bot tokens.

If creating new bots:

1. Create bot in BotFather.
2. Add bot to target group.
3. Make bot admin if it must use topics.
4. Enable topics in the group.
5. Use `npm run telegram:ids` to discover chat/topic IDs.
6. Fill `.env`.

Bot usernames are not chat IDs. Group IDs usually start with `-100`.

## Do Not Touch MCP

This migration does not require Claude MCP, TradingView MCP, or any existing MCP configuration.

Keep MCP separate from this project unless you intentionally decide to connect it later.
