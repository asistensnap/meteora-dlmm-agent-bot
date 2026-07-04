# Phase 1 — Bug Audit and Fixes

Every finding below has file:line evidence from the pre-fix code. Areas from the audit
checklist that produced no findings are listed at the bottom as explicitly clean or
not applicable — no bugs were invented to look thorough.

## Findings and fixes

| ID | File:Line (pre-fix) | Severity | Evidence | Fix |
|----|---------------------|----------|----------|-----|
| B1 | `src/utils/time.ts:10` | Medium | `ageHoursFrom` returned `24*365` for a *missing* timestamp but `0` for an *unparseable* one. `risk-filter.ts:13` rejects `poolAgeHours < minPoolAgeHours`, so a malformed `pool_created_at` string silently rejected an otherwise valid pool as "too_new", while a missing one bypassed the gate — opposite outcomes for the same information content. | Invalid timestamps now use the same `UNKNOWN_AGE_HOURS` sentinel as missing ones (documented constant). |
| B2 | `src/agents/operator.agent.ts:156-157` | Medium | `sendAlerts` called `markAlerted(...)` and `saveAlert(...)` unconditionally after `sendAlert(...)`, but `TopicRouter.sendToTopic` returns `undefined` on a failed Telegram send (`topic-router.ts:31`). A transient Telegram failure therefore suppressed that pool's alert for the entire `DUPLICATE_ALERT_COOLDOWN_MINUTES` window with no record delivered. | On `messageId === undefined`, log a warning and `continue` without marking/saving/counting, so the alert retries on the next scan. |
| B3 | `src/agents/claude-analyst.agent.ts:41-53` | Medium | `parsed.results` from the Claude API was used without field validation. A result missing `confidence` passes the paper-trading gate (`undefined < threshold` is `false` in `paper-trading.ts:21`), and missing `mainReason`/`exitRule` crash better-sqlite3 with "cannot bind undefined" in `repositories.saveClaudeAnalysis`, rejecting the whole scan run. | `parseClaudeResult` now filters results lacking `poolAddress`/`pair`, coerces `decision`/`strategy`/`range` to valid enum values (safe defaults `PAPER_ONLY`/`AVOID`/`NONE`), defaults missing strings, and forces non-finite `confidence` to `0` (fails gates conservatively). |
| B4 | `src/paper/paper-trading.ts:6-36` | Medium | No idempotency guard: after the alert cooldown expires, a still-qualifying pool creates a second (third, …) `OPEN` paper position for the same `pool_address`, corrupting paper-performance stats. This is the paper-domain instance of the "double-submitting open" audit item. | Added `SELECT 1 ... WHERE pool_address = ? AND status = 'OPEN'` check before insert; also wrapped the method in try/finally (see B5). |
| B5 | `src/database/repositories.ts` (all methods), `src/paper/paper-trading.ts` | Medium | Every repository method did `openDb()` … `db.close()` with no try/finally. Any thrown statement (constraint, disk, bind error — see B3) leaked the handle and could hold the WAL lock. | All 8 repository methods and `PaperTradingService.createPositions` now close the DB in `finally`. |
| B6 | `src/telegram/topic-router.ts:11,20` | Low-Medium | When topic IDs are configured but the group chat ID is not (or the command arrives from a different chat), `sendToTopic` fell back to the sender's chat **while still attaching `message_thread_id`**. Telegram rejects thread IDs in chats without forum topics → the reply and the subsequent troubleshoot message both fail. | Thread ID is now only attached when sending to the *configured* chat; fallback sends use the `[TOPIC]` prefix instead. |
| B7 | `src/telegram/command-handler.ts:102-103` | Low | `/scan_now` sent `workflow.analyst` / `workflow.result` unguarded; both are `""` in validation-failure paths (`lio-operator.agent.ts:141-171`), and Telegram rejects empty message text. `/workflow_test` already guarded these. | Added the same truthiness guards. |
| B8 | `src/index.ts` | Medium | No `polling_error` listener, no `unhandledRejection`/`uncaughtException` logging, and no signal handling — Ctrl+C killed the process without stopping Telegram polling (risk of duplicate-getUpdates conflicts on fast restart) and async errors outside command handlers were invisible. | Added process-level rejection/exception logging, a `polling_error` listener, and SIGINT/SIGTERM shutdown that awaits `bot.stopPolling()`. |
| B9 | `src/meteora/meteora-api.ts:14-16` | Low-Medium | All endpoint failures were swallowed (`catch { continue }`) and total failure returned `[]` — a real scan cannot distinguish "Meteora API down" from "zero pools", and nothing was ever logged. | Failures are now logged per endpoint (`logger.warn`) plus a final warning when returning empty. Retry/backoff/failover intentionally deferred (scanner already re-runs each interval; see deferred list). |
| B10 | `src/utils/dedupe.ts:11-13` | Low | `lastAlertByPool` grew unboundedly — every pool ever alerted stayed in the Map for the process lifetime. | `markAlerted` now prunes entries older than the cooldown before inserting. |

## Checklist areas with no findings

- **Blockhash/confirmation, lamports vs SOL, BN/BigInt precision, priority fees, RPC
  failover, on-chain idempotency** — *not applicable*: the repo contains no
  `@solana/web3.js`, Meteora SDK, or any transaction-building code (verified in
  `package.json` and all of `src/`). Nothing to fix, nothing was guessed at.
- **Swap logic (Jupiter)** — not present in the codebase.
- **DLMM bin math / rent / claim-before-close / OOR detection** — no bin math exists
  yet; OOR detection and net PnL are *missing features*, built in Phase 2, not bugs.
- **Config validation** — already fails fast via zod `safeParse` + throw
  (`src/config.ts:79-85`); message clarity improved as a Phase 2 feature.
- **Telegram input validation** — every handler is anchored-regex matched and wrapped
  in `handle()` try/catch routing errors to the Troubleshoot topic
  (`command-handler.ts:169-183`). Malformed commands simply don't match; no crash path
  found.
- **Race conditions** — no interval/scheduler is wired at all in the current runtime
  (node-cron is installed but unused; `OperatorAgent.runScan` has no caller). The
  Phase 2 management cycle is built with an overlap guard from the start.
- **BigInt/Number precision in amounts** — all amounts are USD floats for
  scoring/reporting only; no token-amount integer math exists.

## Verification

- `npm run lint` (tsc --noEmit): PASS after fixes (baseline: PASS).
- `npm run build`: verified in Phase 4.
- No behavior default moved toward live execution; all changes are error-handling,
  validation, and consistency fixes.
