# Meteora DLMM Agent Bot Deployment

This guide is for moving the project to another Windows, macOS, or Linux machine and preparing it for GitHub.

## 1. What To Copy

Copy or clone this repository:

```bash
git clone <your-repo-url> meteora-dlmm-agent-bot
cd meteora-dlmm-agent-bot
```

Do not copy these files to GitHub:

```text
.env
.env.*
node_modules/
dist/
data/*.sqlite
logs/
```

They are ignored by `.gitignore`.

## 2. Requirements

All platforms:

- Node.js 20 or newer
- npm
- Git
- Telegram bot token
- DeepSeek API key for Lio/Cala
- Anthropic API key for Konlin

For Meridian live auto execution:

- Meridian engine repo
- OpenRouter API key
- Helius RPC/API key
- Solana wallet private key stored locally in `.env`
- Funded wallet with SOL

## 3. Install On Windows

```powershell
git clone <your-repo-url> meteora-dlmm-agent-bot
cd meteora-dlmm-agent-bot
npm install
copy .env.example .env
npm run db:init
npm run lint
npm run build
```

## 4. Install On macOS / Linux

```bash
git clone <your-repo-url> meteora-dlmm-agent-bot
cd meteora-dlmm-agent-bot
npm install
cp .env.example .env
npm run db:init
npm run lint
npm run build
```

## 5. Telegram Existing Bot Setup

Use this when you already have Lio/Cala/Konlin bots.

Fill `.env`:

```env
LIO_TELEGRAM_BOT_TOKEN=existing_lio_token
CALA_TELEGRAM_BOT_TOKEN=existing_cala_token
KONLIN_TELEGRAM_BOT_TOKEN=existing_konlin_token

TELEGRAM_CHAT_ID=your_private_or_group_chat_id
TELEGRAM_GROUP_CHAT_ID=your_group_chat_id
```

Then discover topic IDs:

```bash
npm run telegram:ids
```

Fill:

```env
OPERATOR_TOPIC_ID=
SCREENING_TOPIC_ID=
ANALYST_TOPIC_ID=
SYSTEM_TOPIC_ID=
RESULT_TOPIC_ID=
ENTRY_TOPIC_ID=
TRADE_LOG_TOPIC_ID=
TROUBLESHOOT_TOPIC_ID=
```

## 6. Telegram New Bot Setup

Use this when creating new bots.

1. Open Telegram.
2. Message `@BotFather`.
3. Run:

```text
/newbot
```

4. Create:

```text
Lio bot
Cala bot
Konlin bot
```

5. Put tokens in `.env`.
6. Add bots to the Telegram group.
7. Make Lio admin.
8. Enable topics in the group.
9. Create topics:

```text
Operator
Screening
Analyst
System
Result
Entry
Trade Log
Troubleshoot
```

10. Run:

```bash
npm run telegram:ids
```

11. Fill topic IDs in `.env`.

## 7. Start Hermes / Telegram Layer

Normal local app:

```bash
npm run dev
```

Hermes Desktop profiles are machine-local. On a new PC you must recreate/import Hermes profiles or use the local Node bot first.

Expected Telegram tests:

```text
/ping_all
/topiccheck
/modelcheck
/evilpanda_strategy
/workflow_test
/trade_log_test
```

## 8. Meridian Dry Run

Install Meridian next to this project:

```bash
cd ..
git clone https://github.com/yunus-0x/meridian meridian-upstream
cd meridian-upstream
npm install
```

Back in this project:

```bash
cd ../meteora-dlmm-agent-bot
npm run meridian:auto:setup
npm run meridian:auto:dry
```

Dry run does not send real transactions.

## 9. Meridian Live Full Auto Small

Live auto is intentionally blocked until the Meridian local `.env` is complete.

File:

```text
../meridian-upstream/.env
```

Required:

```env
WALLET_PRIVATE_KEY=
RPC_URL=
OPENROUTER_API_KEY=
HELIUS_API_KEY=
DRY_RUN=false
```

Start live:

```bash
npm run meridian:auto:live
```

Safety defaults:

- max open positions: 1
- deploy amount: 0.1 SOL
- max deploy amount: 0.15 SOL
- strategy: EvilPanda one-sided SOL DLMM
- exit: EvilPanda Exit Strategy v2

## 10. Readiness Check

```bash
npm run ready
```

This shows what is configured and what is missing.

## 11. GitHub Repository

If GitHub CLI is installed and logged in:

```bash
gh repo create meteora-dlmm-agent-bot --private --source=. --remote=origin --push
```

If not:

1. Open https://github.com/new
2. Repository name:

```text
meteora-dlmm-agent-bot
```

3. Create an empty repository.
4. Run:

```bash
git init
git add .
git commit -m "Initial Meteora DLMM agent system"
git branch -M main
git remote add origin https://github.com/<your-user>/meteora-dlmm-agent-bot.git
git push -u origin main
```

Never commit `.env`.

