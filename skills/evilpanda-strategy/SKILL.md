---
name: evilpanda-strategy
description: Apply the EvilPanda DLMM trading strategy for Meteora DLMM workflows, including coin selection, Cala screening rules, Konlin validation, 15m Supertrend entry logic, BB/MACD/RSI(2) exit confluence, risk/emotion rules, trade-log memory, and Obsidian placement. Use when working on Meteora DLMM strategy rules, scanner filters, auto-entry planning, exit logic, trade review, or second-brain documentation for the EvilPanda strategy.
---

# EvilPanda Strategy

Use this skill when implementing, reviewing, or documenting the EvilPanda Strategy inside the Meteora DLMM Agent Bot.

Do not treat this strategy as guaranteed profit. Keep real execution behind explicit runtime safety gates.

## Placement

Recommended local placements:

- Codex local skill: `%USERPROFILE%\.codex\skills\evilpanda-strategy\SKILL.md`
- Obsidian workflow copy: `Obsidian/Meteora Dlmm/Meteora DLMM Agent Bot/04 Workflows/EvilPanda Strategy Skill/SKILL.md`
- Strategy note: `16 - EvilPanda Strategy.md`
- Live memory: `20 - Live Bot Memory.md`
- Trade log memory: `25 - Trade Log Memory.md`
- Mistake log: `22 - Mistake Log.md`
- Decision log: `21 - Decision Log.md`

## Agent Responsibilities

- Lio: orchestrate commands, route results, enforce mode/safety, avoid emotional decisions.
- Cala: screen coins and pools locally. Do not call Claude. Return compact JSON.
- Konlin: validate only shortlisted candidates. Return compact JSON with decision, strategy, range, allocation, exit rule, and confidence.

## Part 1 - Coin Selection

Use these filters before considering a DLMM setup:

- Dexscreener market cap filter: at least `250k`.
- Dexscreener 24h volume filter: at least `1,000,000`.
- Sort coins by age.
- Ignore coins without picture, or press/check the profile button before trusting them.
- GMGN checks:
  - fees over `30`
  - phishing below `30%`
  - bundling below `60%`
  - insiders below `10%`
  - top 10 holders below `30%`

If these data sources are unavailable, mark the candidate as `DATA_MISSING` and do not upgrade it to high confidence.

## Part 2 - Entry Criteria

Use the 15 minute chart as default.

- Add Supertrend on Dexscreener chart.
- Wait for price to break above Supertrend.
- Open one-sided SOL DLMM position only after the Supertrend break condition is met.
- Select `SPOT` or `BID_ASK` based on volatility and pool quality.
- Generally prefer `80`, `100`, or `125` bin pools.
- Generally use a range around `-86%` to `-94%`.

Avoid lower timeframes by default because 1m/5m produce more traps.

## Part 3 - Exit Criteria

Use Bollinger Bands, MACD, and RSI.

RSI settings:

- RSI length: `2`
- Upper limit: `90`

Exit requires confluence of at least 2 indicators:

- RSI(2) closes above `90` and price closes above Bollinger Band upper line at the same time.
- Or RSI(2) closes above `90` and MACD prints the first green histogram at the same time.

When the strategy says exit, exit. Do not overthink for higher prices.

## Part 4 - Emotion And Risk Rules

- Prefer 15m chart to avoid over-monitoring and traps.
- A dump can be good for DLMM fee earning; do not panic just because price dumps.
- In dry market conditions, do nothing until a coin passes filters.
- Cut mistakes quickly, even at a loss.
- Divide portfolio into at least 6 positions.
- Do not over-position.
- Increase size only as a reward after a clean profitable day without losses.
- Do not open new positions after 6pm if it may require overnight babysitting.
- Do not revenge DLMM after a loss.
- Focus on process profitability and confidence, not forcing signals.

## Screening Output Guidance

Cala should include strategy fields in compact JSON:

```json
{
  "strategyName": "EvilPanda Strategy",
  "coinSelectionPassed": true,
  "entry": {
    "timeframe": "15m",
    "supertrendBreakAbove": true,
    "poolBinPreference": "80/100/125",
    "rangePreference": "-86% to -94%"
  },
  "localStrategy": "SPOT"
}
```

## Konlin Output Guidance

Konlin should validate only shortlisted candidates:

```json
{
  "strategyName": "EvilPanda Strategy",
  "decision": "WATCHLIST",
  "strategy": "SPOT",
  "range": "WIDE",
  "maxAllocation": "small",
  "exitRule": "Exit on RSI(2)>90 plus BB upper close, or RSI(2)>90 plus first green MACD histogram.",
  "confidence": 78
}
```

## Obsidian Memory Rules

When live or reviewing:

- Log entries and exits in `20 - Live Bot Memory.md`.
- Log all closed positions in `25 - Trade Log Memory.md`.
- Log broken rules in `22 - Mistake Log.md`.
- Log model/risk/mode changes in `21 - Decision Log.md`.

Each Obsidian note should include:

```yaml
tags:
  - meteora-dlmm
  - evilpanda-strategy
```

Use links:

```md
Related: [[16 - EvilPanda Strategy]] [[20 - Live Bot Memory]] [[25 - Trade Log Memory]]
```

## Safety

Never add wallet secrets to Obsidian.

Never enable live execution from this skill alone. Runtime code must still require explicit config such as `ENABLE_REAL_EXECUTION=true`, non-dry-run mode, wallet configuration, and safety checks.
