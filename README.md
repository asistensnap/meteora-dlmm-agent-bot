# Meteora DLMM Agent Bot

Initial Hermes Desktop plus Telegram integration for a safe 3-agent Meteora DLMM workflow.

This setup focuses on connection, model routing, topic routing, health checks, troubleshooting, and dummy workflow tests. Real Meteora scanning, wallet execution, DLMM deposits, and auto entry are disabled.

For full Windows/macOS/Linux deployment and GitHub setup, see [DEPLOYMENT.md](./DEPLOYMENT.md).

For Obsidian second-brain memory, see [docs/OBSIDIAN_SECOND_BRAIN.md](./docs/OBSIDIAN_SECOND_BRAIN.md).

For moving this project to a new PC/VPS without touching MCP, see [docs/MOVE_TO_NEW_PC.md](./docs/MOVE_TO_NEW_PC.md).

For the EvilPanda strategy skill, see [skills/evilpanda-strategy/SKILL.md](./skills/evilpanda-strategy/SKILL.md).

For Gbrain memory setup and Hermes profile usage, see [docs/GBRAIN.md](./docs/GBRAIN.md).

For Hermes Desktop SOUL.md profile prompts, see [docs/HERMES_SOULS.md](./docs/HERMES_SOULS.md).

## Private Chat Test

The initial local test uses:

```env
TELEGRAM_CHAT_ID=1186081518
```

If no topic IDs are configured, all messages go to this chat with routing prefixes such as `[OPERATOR]`, `[SCREENING]`, `[ANALYST]`, `[SYSTEM]`, `[RESULT]`, `[ENTRY]`, and `[TROUBLESHOOT]`.

## Group Topics Later

One Telegram Group is supported with these exact future topics:

- 🧭 Operator
- 🔎 Screening
- 🧠 Analyst
- 📡 System
- 📊 Result
- 🚀 Entry
- Trade Log
- 🛠 Troubleshoot

Topic names must not include Lio, Cala, or Konlin.

## Agent Mapping

- Lio -> active Hermes profile model -> Operator -> @Liocala_bot
- Cala -> active Hermes profile model -> Screening -> @Calalio_bot
- Konlin -> active Hermes profile model -> Analyst -> @KOnlin_bot

Default model intent:

- Lio: DeepSeek-compatible operator model
- Cala: DeepSeek-compatible screening model
- Konlin: Claude-compatible analyst model

The actual runtime model is the model selected in Hermes Desktop for each profile. SOUL.md should not be treated as a hard model lock.

Lio is the main Telegram gateway for commands. Cala and Konlin are also enabled as Hermes profiles so their own bot identities can post routed workflow output:

- Cala posts Screening output to the Screening topic.
- Konlin posts Analyst output to the Analyst topic.
- Lio keeps Operator, System, Result, Entry, and Troubleshoot routing.

## Activity Routing

- Commands and workflow progress -> Operator
- Cala dummy screening -> Screening
- Konlin dummy analysis -> Analyst
- System checks -> System
- Final DLMM result -> Result
- Execution mode and entry placeholders -> Entry
- Closed paper/manual positions, close exit events, and PnL summary -> Trade Log
- Errors and missing config -> Troubleshoot

## Telegram IDs

Bot username is not a chat ID.

`TELEGRAM_CHAT_ID` must be a numeric private chat ID or group ID. Telegram supergroups usually look like `-100xxxxxxxxxx`.

Topic IDs are `message_thread_id` values:

```env
OPERATOR_TOPIC_ID=
SCREENING_TOPIC_ID=
ANALYST_TOPIC_ID=
SYSTEM_TOPIC_ID=
RESULT_TOPIC_ID=
ENTRY_TOPIC_ID=
TROUBLESHOOT_TOPIC_ID=
TRADE_LOG_TOPIC_ID=
```

To inspect recent Telegram updates and discover IDs:

```powershell
npm run telegram:ids
```

The helper never prints the bot token.

## Setup

```powershell
cd C:\Users\EBBE\meteora-dlmm-agent-bot
npm install
npm run lint
npm run dev
```

Cross-platform:

```bash
npm install
cp .env.example .env
npm run db:init
npm run ready
npm run lint
npm run build
```

The project `.env` is created with safe defaults. Fill `LIO_TELEGRAM_BOT_TOKEN` only if you do not want to rely on an existing Hermes `TELEGRAM_BOT_TOKEN` fallback.

## Obsidian And Skill

Obsidian is used as the project second brain. It stores project memory, trade lessons, decision logs, mistake logs, and EvilPanda strategy notes.

Do not store secrets in Obsidian.

Recommended local vault folder:

```text
C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot
```

Install the EvilPanda skill into Codex on a new Windows PC:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills\evilpanda-strategy"
Copy-Item ".\skills\evilpanda-strategy\SKILL.md" "$env:USERPROFILE\.codex\skills\evilpanda-strategy\SKILL.md" -Force
```

This repo does not require changing Claude MCP or TradingView MCP.

## Gbrain Memory

Gbrain can be used as a local memory layer for Obsidian notes and Hermes profiles.

Current intended usage:

- manual activation on desktop
- manual Obsidian import
- no auto-start by default
- no MCP changes required

Manual Windows check:

```powershell
$env:PATH='C:\Users\EBBE\.bun\bin;' + $env:PATH
gbrain --version
gbrain stats
```

Update memory after editing Obsidian:

```powershell
$env:PATH='C:\Users\EBBE\.bun\bin;' + $env:PATH
gbrain import "C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot" --no-embed
gbrain stats
```

Hermes profiles can use the `gbrain` skill:

- `telegram-cimot`
- `telegram-cala`
- `telegram-lio`
- `telegram-konlin`

Example Hermes prompt:

```text
Gunakan skill gbrain untuk membaca memory project Meteora DLMM.
```

See [docs/GBRAIN.md](./docs/GBRAIN.md).

## Hermes SOUL.md Profiles

Hermes Desktop profile prompts are stored in active profile folders under:

```text
C:\Users\EBBE\AppData\Local\hermes\profiles
```

This repo keeps backup/template copies in:

```text
hermes/souls/
```

Profiles:

- `telegram-cimot` = separate Cimot helper
- `telegram-lio` = Meteora DLMM operator
- `telegram-cala` = Meteora DLMM screening scanner
- `telegram-konlin` = Meteora DLMM Claude analyst

Model changes should be made in Hermes Desktop profile/model settings. The SOUL.md files now say to follow the active Hermes Desktop profile model so the agents do not get locked to one fixed model.

See [docs/HERMES_SOULS.md](./docs/HERMES_SOULS.md).

## Telegram Commands

- `/start`
- `/status`
- `/ping`
- `/ping_all`
- `/modelcheck`
- `/topiccheck`
- `/envcheck`
- `/scan_test`
- `/workflow_test`
- `/troubleshoot`
- `/execution_mode`
- `/trade_log`
- `/trade_summary`
- `/trade_log_test`
- `/evilpanda_strategy`

Expected dummy workflow:

- `/scan_test` posts Cala dummy output to Screening.
- `/workflow_test` posts Lio start, Cala screening, Konlin analysis, final Result, and Lio summary.
- `/execution_mode` posts to Entry.
- `/trade_log` and `/trade_summary` post closed-position PnL data to Trade Log.
- `/trade_log_test` posts dummy positive/negative closed positions to Trade Log.
- `/evilpanda_strategy` shows the configured EvilPanda Strategy rules.
- Errors post to Troubleshoot.

## EvilPanda Strategy

`EvilPanda Strategy` is configured as a DLMM strategy profile.

Coin selection:
- Dexscreener market cap >= $250k and 24h volume >= $1,000,000.
- Sort by age.
- Ignore coins without picture or verify profile manually.
- GMGN fees > 30, phishing < 30%, bundling < 60%, insiders < 10%, top10 < 30%.

Entry:
- Dexscreener 15m chart.
- Price breaks above Supertrend.
- One-sided SOL DLMM position.
- SPOT or BID_ASK depending on behavior.
- Prefer 80/100/125 bin pools.
- General range -86% to -94%.

DLMM pool choosing:
- Use after coin selection and before entry.
- Choose pools that keep the position in range long enough to print fees.
- Prefer 80/100/125 bin pools.
- For coins under 12h old, prefer 5%/10% higher-fee pools when available.
- Avoid pools likely to go out of range too quickly.
- If no pool fits fee/range/bin requirements, do nothing.

Exit:
- EvilPanda Exit Strategy v2.
- BB, MACD, RSI.
- RSI length 2, upper limit 90.
- Exit requires at least 2-indicator confluence.
- Signal A: RSI(2) close above 90 plus price close above BB upper.
- Signal B: RSI(2) close above 90 plus MACD first green histogram.
- Multiple indicators firing together means a stronger exit signal.
- Preferred path is to earn fees during the dump, then exit on bounce strength.
- Prefer systematic exit over trying to catch the exact top.
- Emergency exit is valid if risk changes materially, liquidity/volume collapses, pool is out of useful range, original entry was a mistake, or market becomes unsafe.
- Every close must be logged into Trade Log with PnL and exit reason.

Behavior:
- Prefer 15m and avoid 1m/5m traps unless intentionally chosen.
- Do nothing in dry markets.
- Exit when strategy says exit.
- Cut mistakes even at a loss.
- Divide portfolio into at least 6 positions.
- Do not open new positions after 18:00 local time.
- No revenge DLMM.

## Safety

```env
EXECUTION_MODE=SCANNER_ONLY
ENABLE_REAL_EXECUTION=false
EMERGENCY_STOP=false
```

No private keys are required. Auto entry, wallet execution, blockchain transactions, real DLMM deposits, and real Meteora scanning are disabled by default.

## Meridian Full Auto Small

Meridian full-auto execution is prepared as a separate launcher. It is not mixed with Cimot or Hermes gateway launchers.

Launcher folder:

```text
C:\Users\EBBE\Hermes-Gateway-Launchers\Meridian-Full-Auto
```

Dry-run, no real transactions:

```text
Start-Meridian-DRY-RUN.bat
```

Cross-platform:

```bash
npm run meridian:auto:dry
```

Live full auto small:

```text
Start-Meridian-LIVE-FULL-AUTO-SMALL.bat
```

Cross-platform:

```bash
npm run meridian:auto:live
```

The live launcher refuses to start until this local file is complete:

```text
C:\Users\EBBE\Downloads\meridian-upstream\.env
```

Required for live:

```env
WALLET_PRIVATE_KEY=
RPC_URL=
OPENROUTER_API_KEY=
HELIUS_API_KEY=
DRY_RUN=false
```

Do not send private keys through Telegram or chat. Put them only in the local `.env` file.

Current full-auto-small defaults:

- Deploy size: `0.1 SOL`
- Max deploy size: `0.15 SOL`
- Max open positions: `1`
- Strategy: EvilPanda-style one-sided SOL DLMM
- Screening timeframe: `30m` because Meridian's screening API does not support `15m`
- Entry decision still uses the 15m Supertrend rule in the strategy prompt
- Exit uses EvilPanda Exit Strategy v2

## Meridian-Safe Integration

This project includes a safe integration inspired by `yunus-0x/meridian`.
It reuses the existing Lio, Cala, and Konlin bots and does not create a new Telegram bot.

Included:
- Meridian-style risk presets: `safe`, `moderate`, `degen`
- Local screening thresholds and cycle settings
- Telegram commands for viewing/changing presets
- Dry-run only configuration

Intentionally disabled:
- wallet private key handling
- live DLMM deposits
- close/claim/rebalance transactions
- autonomous capital deployment

Telegram commands:
- `/meridian_status`
- `/meridian_safe`
- `/meridian_moderate`
- `/meridian_degen`

Local setup:

```powershell
npm run meridian:setup:moderate
npm run lint
npm run build
```

The generated config lives at:

```text
config/meridian-safe.config.json
```

Lio remains the main command gateway. Cala and Konlin are connected to the Meridian-safe config through `telegram-cala` and `telegram-konlin`, and their bot tokens are used for Screening and Analyst topic output when configured.

Current profile mapping:

- Lio -> `telegram-lio`
- Cala -> `telegram-cala`
- Konlin -> `telegram-konlin`

Konlin real Claude calls require Anthropic/Claude API config in Hermes Desktop or environment. Dummy `/workflow_test` does not spend Claude tokens.
