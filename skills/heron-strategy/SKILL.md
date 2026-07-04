---
name: heron-strategy
description: Apply the HERON DLMM strategy for Meteora DLMM workflows. HERON is an evolution of the EvilPanda strategy that keeps momentum entry, one-sided SOL liquidity, and fee-harvest-through-dump, but adds net-of-IL accounting, an asymmetric bounce-vs-breakdown exit, a pool-durability entry gate, an opportunity-cost hurdle, and a daily kill-switch. Covers coin selection, Cala screening rules, Konlin validation, 15m Supertrend entry, BB/MACD/RSI(2) bounce exit plus breakdown/time/net stops, risk/emotion rules, trade-log memory, and Obsidian placement. Use when implementing, reviewing, or documenting the HERON strategy for Meteora DLMM scanner filters, auto-entry planning, exit logic, trade review, or second-brain docs.
---

# HERON Strategy

Use this skill when implementing, reviewing, or documenting the HERON Strategy inside the Meteora DLMM Agent Bot.

HERON is an evolution of the EvilPanda Strategy. It keeps the momentum entry, one-sided SOL liquidity, and the "a dump is good for fees" harvest core, and fixes EvilPanda's main blind spot: a token that dumps and never bounces. HERON cuts the dying dip on data, instead of waiting for an RSI bounce that may never come.

Do not treat this strategy as guaranteed profit. Keep real execution behind explicit runtime safety gates.

## Core Difference From EvilPanda

- EvilPanda holds every dump and exits only on a bounce (RSI(2)>90 confluence). HERON holds a dump only while fees are still accruing and demand is intact, and CUTS on breakdown signals, a time stop, or a net-loss stop.
- HERON judges a position by net (fees minus impermanent/conversion loss), not by fee count.
- HERON only enters pools that can plausibly print enough fees to beat the conversion loss, and only when expected net beats parking SOL passively.

## Agent Responsibilities

- Lio: orchestrate commands, route results, enforce mode/safety, enforce the daily kill-switch, avoid emotional decisions.
- Cala: screen coins and pools locally. Do not call Claude. Return compact JSON. Include durability and fee-density fields.
- Konlin: validate only shortlisted candidates. Return compact JSON with decision, strategy, range, allocation, exit rule, net check, breakdown flags, and confidence.

## Part 1 - Coin Selection

- Dexscreener market cap filter: at least 250k.
- Dexscreener 24h volume filter: at least 1,000,000.
- Hard floor: ignore tokens younger than 2h.
- Ignore coins without picture, or check the profile before trusting them.
- Mint authority must be revoked and freeze authority must be revoked. If either is active, reject.
- GMGN checks (tightened vs EvilPanda): fees over 30; phishing below 30%; bundling below 40%; insiders below 10%; top 10 holders below 30%.
- If these data sources are unavailable, mark the candidate as DATA_MISSING and do not upgrade it to high confidence.

## Part 2 - Entry Criteria

Use the 15 minute chart as default.

- Add Supertrend on the chart. Wait for price to break above Supertrend.
- Durability gate (new vs EvilPanda): 1h volume still active, not a single-candle spike; pool fee/TVL high enough that expected fees can offset conversion loss; pool unlikely to fall out of useful range before printing meaningful fees. If no pool qualifies, do nothing.
- Open a one-sided SOL DLMM position only after the Supertrend break AND the durability gate both pass.
- Avoid 1m/5m timeframes by default (more traps).

## Part 3 - Position Shape And Range

- Select SPOT or BID_ASK based on volatility and pool quality. Prefer BID_ASK single-sided below price to accumulate on the dump; SPOT for steadier fee capture.
- Generally prefer 80, 100, or 125 bin-step pools.
- Range: volatility-scaled wide downside band covering roughly 1.5x-2x the token's recent typical drawdown. Keep it wide; never tight. (EvilPanda's fixed -86% to -94% band is an acceptable default.)
- A single position spans up to about 69 bins; use stacked positions for wider bands. Each position locks SOL rent, mostly returned on close. Verify bin cap and rent in the current SDK.

## Part 4 - Exit Criteria

Three parallel exit paths. Take whichever fires first.

Primary bounce exit (EvilPanda v2 confluence): RSI length 2, upper limit 90. Exit on RSI(2) close above 90 AND price close above Bollinger Band upper, OR RSI(2) close above 90 AND MACD first green histogram. Earn fees through the dump, exit on bounce strength. When the strategy says exit, exit.

Breakdown exit (new) - close immediately, no bounce required, if ANY: volume collapsing (fees no longer accruing); holders fleeing or top holder distributing; support broken decisively on rising sell volume; a new rug / mint-freeze-authority / blacklist signal; pool TVL or liquidity collapsing, or position stuck out of useful range.

Hard stops (new): net stop — if net (fees minus IL) falls past stopLossPct with no bounce setup forming, close. Time stop — if held longer than maxHoldHours with net still negative and no bounce setup, close.

Emergency exit (kept): material risk change, liquidity/volume collapse, permanently out of useful range, or the original entry was a mistake.

Every close must be logged with PnL and exit reason.

## Part 5 - Net Accounting And Hurdle

- Profit truth = fees minus impermanent/conversion loss. Fee count alone is not profit.
- Track net per position every cycle. Fees below IL with no bounce setup means the position is losing, regardless of APR.
- Hurdle: keep or enter only if expected net beats parking the same SOL passively (Dynamic Vault lending yield). If no live vault-APY tool exists, treat as a soft check and lean conservative.

## Part 6 - Emotion And Risk Rules

- A dump can be good for fee earning; do not panic on price alone - but only hold while Part 5 net check and Part 4 breakdown checks still pass.
- In dry market conditions, do nothing until a coin passes filters.
- Cut mistakes quickly, even at a loss.
- Divide portfolio into at least 6 positions. Do not over-position.
- Increase size only after a clean profitable day without losses.
- Daily kill-switch: if cumulative net drawdown exceeds maxDailyDrawdownPct, close all positions, stop opening, wait for human review.
- Keep a reserve floor (reservePct) parked passively, never deployed.
- No new positions after 18:00 local if it requires overnight babysitting.
- No revenge trading after a loss.
- Platform caveat: Meteora and a co-founder are named in active US class-action litigation over prior token launches. Keep total Meteora exposure bounded and re-verify status periodically.

## Parameters

```
minTokenAgeMinutes    = 120
bundlingPctMax        = 40
top10PctMax           = 30
insidersPctMax        = 10
stopLossPct           = -12
maxHoldHours          = 12
maxDailyDrawdownPct   = 10
minPositions          = 6
reservePct            = 20
noEntryAfterLocal     = 18:00
```

Values are a disciplined starting point, not an optimum. Paper-trade in DRY_RUN, then adjust from real results.

## Safety

Never add wallet secrets to Obsidian. Never enable live execution from this skill alone; runtime code must still require explicit config such as ENABLE_REAL_EXECUTION=true, non-dry-run mode, wallet configuration, and safety checks. This strategy hardens risk discipline; it does not guarantee profit, and DLMM LP can lose money including total loss of a position.
