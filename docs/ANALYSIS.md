# Phase 0 — Recon and Baseline

Date: 2026-07-04 (UTC). Audit performed read-only before any code change.

## What this repo actually is

`meteora-dlmm-agent-bot` v0.1.0 is a **Telegram-driven, scanner-only/dry-run** 3-agent
system. It contains **no on-chain code at all**: there is no `@solana/web3.js`, no
Meteora DLMM SDK, and no Jupiter dependency in `package.json` or `node_modules`
imports. All "execution" surfaces are placeholders (`src/execution/disabled-interfaces.ts`)
or paper records in SQLite. This materially narrows the Phase 1 audit: blockhash,
lamports, slippage, bin math, and rent-accounting classes of bugs cannot exist here yet.

## Entry points

| Entry | Path | Role |
|---|---|---|
| `npm run dev` / `start` | `src/index.ts` | Boots `LioOperatorAgent`, starts Telegram polling bot (or logs-only if no token) |
| `npm run scan` | `src/index.ts --scan-once` | Runs dummy workflow once, logs result, exits |
| `npm run db:init` | `src/database/db.ts --init` | Creates SQLite schema |
| `npm run meridian:auto:dry` | `tools/start-meridian.js` | Launches the external Meridian engine (`../meridian-upstream` or `MERIDIAN_ENGINE_PATH`) with `DRY_RUN=true` forced |
| `npm run lint` / `build` | `tsc --noEmit` / `tsc` | Type check / compile to `dist/` |

There is no test runner (no test script, no jest/vitest/mocha installed).

## The three agents

- **Lio (operator)** — `src/agents/lio-operator.agent.ts`. Orchestrates: builds start/status
  messages, runs the dummy workflow (`workflowMessages()`): Cala scan → validate →
  Konlin analyze → validate → Result + summary. Owns TradeLogService.
- **Cala (screener)** — `src/agents/cala-screening.agent.ts` (dummy `scanTest()`), with the
  real local pipeline in `src/scanner/*` (`LocalScanner` → `hardRejectReason` →
  `scorePool` → `isAlertCandidate`) fed by `src/meteora/meteora-api.ts` (public
  Meteora DLMM REST API via axios; read-only HTTP, no keys).
- **Konlin (validator)** — `src/agents/konlin-analyst.agent.ts` (dummy) and
  `src/agents/claude-analyst.agent.ts` (real Claude call via `src/claude/claude.client.ts`,
  axios POST to Anthropic Messages API with JSON-fallback parser).

A second, parallel operator (`src/agents/operator.agent.ts`, `OperatorAgent`) implements
the *real* scan workflow (screen → persist → Claude → paper positions → alerts) but is
**not wired to any entry point** — `src/index.ts` only constructs `LioOperatorAgent`.
It is reachable only as dead code today.

## Telegram command routing

`src/telegram/telegram.bot.ts` creates one polling bot (Lio token, fallback
`TELEGRAM_BOT_TOKEN`). `src/telegram/command-handler.ts` registers ~30 `onText` regex
handlers, each wrapped in `handle()` (try/catch → Troubleshoot topic).
`src/telegram/topic-router.ts` maps logical topics (OPERATOR, SCREENING, ANALYST,
SYSTEM, RESULT, ENTRY, TRADE_LOG, TROUBLESHOOT) to `message_thread_id`s from env, with
fallback to the main chat plus a `[TOPIC]` prefix. `/evilpanda_strategy` →
`lio.evilPandaStrategy()` → `evilPandaStrategyPrompt()` in
`src/strategy/evilpanda-strategy.ts` — this is the pattern HERON will mirror.

## Strategy-skill loading mechanism

The runtime does **not** load SKILL.md files. `skills/evilpanda-strategy/SKILL.md` is
documentation for external agent runners; the runtime equivalent is the hardcoded
`evilPandaStrategy` object + prompt in `src/strategy/evilpanda-strategy.ts`.

Install targets detected on this machine:

- **Codex**: `%USERPROFILE%\.codex\skills\` exists and already contains
  `evilpanda-strategy\` → Codex is the active runner (matches README install snippet).
- **Claude Code**: `%USERPROFILE%\.claude\skills\` also exists (other skills installed,
  no evilpanda copy) → HERON will be installed to both per mission step 3b/3c.

## Config

`src/config.ts`: dotenv + fallback env files from Hermes
(`%LOCALAPPDATA%\hermes\.env`, `...\profiles\telegram-lio\.env`), then a zod
`envSchema.safeParse` that throws a clear message on invalid config (fail-fast exists).
Safety hardcodes: `execution.enableRealExecution: false` (ignores env),
`execution.mode` collapses everything except PAPER_TRADING to SCANNER_ONLY,
`walletKeypairPath: undefined`. `src/meridian/config.ts` loads
`config/meridian-safe.config.json` with `dryRun: z.literal(true)` and
`liveExecutionEnabled: z.literal(false)` — the schema itself refuses live values.

## Persistence

better-sqlite3, WAL mode, `./data/meteora-dlmm.sqlite`. Tables: `pool_scans`,
`claude_analysis`, `alerts`, `paper_positions`, `trade_logs`, `settings`
(`src/database/schema.sql`). `Repositories` opens/closes a fresh DB handle per call.

## Obsidian

Vault exists: `C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot`
(notes 00–28 present). Note numbers 17 and 23 are already used
("17 - Cara Pakai Graph View.md", "23 - Prompt Library.md"); the HERON notes requested
as `17 - HERON Strategy.md` and `23 - Net And Breakdown Log.md` will be created with
those exact names beside them (no overwrite; numbering collision recorded).

## EvilPanda end-to-end flow (as wired today)

1. `/workflow_test` → `CommandHandler` → `LioOperatorAgent.workflowMessages()`
2. Cala `scanTest()` (dummy candidates) → `validateCala`
3. Konlin `analyzeTest()` (dummy decisions) → `validateKonlin`
4. Result + operator summary posted to topics; nothing persisted in the dummy path.
5. Real path (unwired `OperatorAgent.runScan`): LocalScanner → save pool_scans →
   dedupe → ClaudeAnalystAgent → save claude_analysis → PaperTradingService →
   alerts (max per scan, confidence-gated) → save alerts.
6. `/trade_log*` commands read/write `trade_logs` via `TradeLogService`.

## Baseline (pre-change)

| Check | Result |
|---|---|
| `npm run lint` (`tsc --noEmit`) | PASS (exit 0) |
| `npm run build` (`tsc`) | PASS (exit 0) |
| Tests | None exist (no runner installed) |

Pre-existing working-tree state (NOT produced by this audit, left untouched):
modified `package.json`, `tools/setup-meridian-full-auto.js`, `tools/start-meridian.js`;
untracked `BUKA-ENV-EXAMPLE.cmd`, `BUKA-ENV.cmd`, `BUKA-MERIDIAN-ENV.cmd`,
`tools/setup-env-wizard.ps1`, `tools/watch-env-sync.js`.

## Secret hygiene check

`.gitignore` already covers `.env`, `.env.*` (except `.env.example`), `ISI_ENV_*.env`,
`data/*`, `*.sqlite*`, `*.db*`, logs. `git status` confirms `.env` and
`ISI_ENV_METEORA_DLMM.env` are not tracked. No fix needed.
