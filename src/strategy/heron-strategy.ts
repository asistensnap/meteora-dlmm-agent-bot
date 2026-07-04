import { config } from "../config.js";
import type { PositionNetStatus } from "../positions/position-tracker.js";

export const HERON_STRATEGY_NAME = "HERON Strategy";

/**
 * HERON schema extensions carried in Cala screening JSON and Konlin validation
 * JSON, following the EvilPanda schema style (see skills/heron-strategy/SKILL.md).
 */
export interface HeronDurability {
  volume1hActive: boolean;
  feeTvlOk: boolean;
  rangeDurabilityOk: boolean;
}

export interface HeronNetCheck {
  expectedNetBeatsVaultHurdle: boolean;
}

export type HeronBreakdownFlag =
  | "VOLUME_COLLAPSING"
  | "HOLDERS_FLEEING"
  | "SUPPORT_BROKEN"
  | "RUG_OR_AUTHORITY_SIGNAL"
  | "TVL_COLLAPSING"
  | "STUCK_OUT_OF_RANGE"
  | "NET_STOP_HIT"
  | "TIME_STOP_HIT";

export const heronStrategy = {
  name: HERON_STRATEGY_NAME,
  timeframe: "15m",
  evolutionOf: "EvilPanda Strategy",
  purpose:
    "Keep EvilPanda's momentum entry, one-sided SOL liquidity, and fee-harvest-through-dump, but judge positions by net (fees minus IL), gate entries on pool durability and an opportunity-cost hurdle, and cut dying dips on breakdown/time/net stops instead of waiting for a bounce that may never come.",
  parameters: {
    minTokenAgeMinutes: 120,
    bundlingPctMax: 40,
    top10PctMax: 30,
    insidersPctMax: 10,
    stopLossPct: -12,
    maxHoldHours: 12,
    // Maps to the runtime daily kill-switch threshold (MAX_DAILY_DRAWDOWN_PCT).
    maxDailyDrawdownPct: config.positions.maxDailyDrawdownPct,
    minPositions: 6,
    reservePct: 20,
    noEntryAfterLocal: "18:00"
  },
  exits: {
    bounce: "RSI(2) close above 90 AND (price close above BB upper OR MACD first green histogram). EvilPanda v2 confluence, kept as primary.",
    breakdown:
      "Close immediately, no bounce required, on ANY of: volume collapsing (fees no longer accruing), holders fleeing / top holder distributing, support broken on rising sell volume, new rug/mint-freeze-authority/blacklist signal, pool TVL or liquidity collapsing, or position stuck out of useful range.",
    netStop: "If net (fees minus IL) falls past stopLossPct with no bounce setup forming, close.",
    timeStop: "If held longer than maxHoldHours with net still negative and no bounce setup, close.",
    emergency: "Material risk change, liquidity/volume collapse, permanently out of useful range, or the original entry was a mistake."
  },
  safety: {
    liveExecutionEnabled: false,
    requiresManualOrPaperMode: true,
    noProfitGuarantee: true
  }
} as const;

/**
 * Breakdown watch derived from the Phase 2 net-PnL tracker and OOR state.
 * This is the runtime hook for HERON's breakdown exit in scanner/dry-run mode:
 * it flags, it never executes.
 */
export function heronBreakdownWatch(status: PositionNetStatus, entryTimestamp?: string): HeronBreakdownFlag[] {
  const flags: HeronBreakdownFlag[] = [];

  if (!status.inRange && (status.oorMinutes ?? 0) >= 60) {
    flags.push("STUCK_OUT_OF_RANGE");
  }
  if (status.netPct <= heronStrategy.parameters.stopLossPct) {
    flags.push("NET_STOP_HIT");
  }
  if (entryTimestamp) {
    const heldHours = (Date.now() - Date.parse(entryTimestamp)) / 3_600_000;
    if (Number.isFinite(heldHours) && heldHours > heronStrategy.parameters.maxHoldHours && status.netUsd < 0) {
      flags.push("TIME_STOP_HIT");
    }
  }
  return flags;
}

export function heronStrategyPrompt(): string {
  const parameters = heronStrategy.parameters;
  return [
    `${heronStrategy.name}`,
    "",
    "Evolution of EvilPanda: keeps momentum entry, one-sided SOL liquidity, and",
    "fee-harvest-through-dump; fixes the blind spot of a token that dumps and never",
    "bounces by cutting on data instead of waiting for an RSI bounce.",
    "",
    "Core Differences From EvilPanda:",
    "- Holds a dump only while fees accrue and demand is intact; CUTS on breakdown signals, a time stop, or a net-loss stop.",
    "- Judges positions by net (fees minus impermanent/conversion loss), never fee count alone.",
    "- Enters only pools that can plausibly out-print conversion loss, and only when expected net beats parking SOL passively.",
    "",
    "Coin Selection:",
    "- Dexscreener: market cap >= $250k, 24h volume >= $1,000,000.",
    `- Hard floor: ignore tokens younger than 2h (${parameters.minTokenAgeMinutes} minutes).`,
    "- Ignore coins without picture, or check the profile first.",
    "- Mint authority AND freeze authority must be revoked; reject if either is active.",
    `- GMGN (tightened): fees > 30, phishing < 30%, bundling < ${parameters.bundlingPctMax}%, insiders < ${parameters.insidersPctMax}%, top 10 holders < ${parameters.top10PctMax}%.`,
    "- Data sources unavailable => DATA_MISSING, never high confidence.",
    "",
    "Entry Criteria (15m default):",
    "- Wait for price to break above Supertrend.",
    "- Durability gate: 1h volume still active (not a single-candle spike); pool fee/TVL can offset conversion loss; pool unlikely to fall out of useful range before printing meaningful fees.",
    "- Open one-sided SOL DLMM only after Supertrend break AND durability gate both pass.",
    "- If no pool qualifies, do nothing. Avoid 1m/5m by default.",
    "",
    "Position Shape And Range:",
    "- SPOT or BID_ASK by volatility/pool quality; prefer BID_ASK single-sided below price for dump accumulation.",
    "- Prefer 80/100/125 bin-step pools.",
    "- Volatility-scaled wide downside band ~1.5x-2x recent typical drawdown (EvilPanda -86% to -94% is an acceptable default).",
    "- Single position spans up to ~69 bins; stack positions for wider bands. Verify bin cap and rent in the current SDK.",
    "",
    "Exit Criteria (three parallel paths, first to fire wins):",
    "1. Bounce exit (EvilPanda v2): RSI(2) close > 90 + BB upper close, OR RSI(2) close > 90 + MACD first green histogram.",
    "2. Breakdown exit: close immediately on volume collapse, holders fleeing, support broken on rising sell volume, rug/authority/blacklist signal, TVL collapse, or stuck out of useful range.",
    `3. Hard stops: net stop at ${parameters.stopLossPct}% net (fees minus IL) with no bounce setup; time stop after ${parameters.maxHoldHours}h with net still negative.`,
    "- Emergency exit kept. Every close logged with PnL and exit reason.",
    "",
    "Net Accounting And Hurdle:",
    "- Profit truth = fees minus impermanent/conversion loss; tracked per position every cycle (/positions_net).",
    "- Keep or enter only if expected net beats parking the same SOL passively (Dynamic Vault yield); soft check, lean conservative.",
    "",
    "Risk Rules:",
    `- Daily kill-switch at ${parameters.maxDailyDrawdownPct}% cumulative net drawdown (runtime MAX_DAILY_DRAWDOWN_PCT): stop opening, recommend CLOSE-ALL, wait for human reset.`,
    `- At least ${parameters.minPositions} positions; reserve floor ${parameters.reservePct}% parked passively.`,
    `- No new positions after ${parameters.noEntryAfterLocal} local if overnight babysitting is required.`,
    "- No revenge trading. Cut mistakes quickly, even at a loss.",
    "- Platform caveat: Meteora and a co-founder are named in active US class-action litigation; keep exposure bounded and re-verify periodically.",
    "",
    "Safety:",
    "- Real execution remains disabled; scanner/dry-run only.",
    "- No private keys. No guaranteed profit; DLMM LP can lose money including total loss."
  ].join("\n");
}
