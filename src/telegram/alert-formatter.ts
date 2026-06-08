import type { BotMode, ClaudePoolAnalysis, ScoredCandidate } from "../types.js";
import { usd } from "../utils/math.js";

export function formatOpportunityAlert(candidate: ScoredCandidate, analysis: ClaudePoolAnalysis, rank: number, mode: BotMode): string {
  return [
    "🔥 METEORA DLMM OPPORTUNITY",
    "",
    `Rank: #${rank}`,
    `Pool: ${candidate.pair}`,
    `Address: ${candidate.poolAddress}`,
    `Score: ${candidate.score}/100`,
    `Risk: ${candidate.risk}`,
    `Local Strategy: ${candidate.localStrategy}`,
    `Claude Strategy: ${analysis.strategy}`,
    `Decision: ${analysis.decision}`,
    `Confidence: ${analysis.confidence}/100`,
    "",
    `TVL: ${usd(candidate.tvl)}`,
    `Volume 24h: ${usd(candidate.volume24h)}`,
    `Fee 24h: ${usd(candidate.fee24h)}`,
    `Fee/TVL 24h: ${candidate.feeTvl24h.toFixed(4)}`,
    `APR 24h: ${candidate.apr24h.toFixed(2)}%`,
    `Bin Step: ${candidate.binStep}`,
    "",
    `Suggested Range: ${analysis.range}`,
    `Max Allocation: ${analysis.maxAllocation}`,
    "",
    "Reason:",
    analysis.mainReason,
    "",
    "Exit Rule:",
    analysis.exitRule,
    "",
    "Mode:",
    mode.toUpperCase()
  ].join("\n");
}

export function formatRows(title: string, rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return `${title}\n\nNo records yet.`;
  const body = rows
    .map((row, index) => {
      const pair = String(row.pair ?? "unknown");
      const score = row.score === undefined ? "" : ` score=${row.score}`;
      const strategy = row.local_strategy ?? row.strategy ?? "";
      const decision = row.decision ? ` decision=${row.decision}` : "";
      return `#${index + 1} ${pair}${score} strategy=${strategy}${decision}`;
    })
    .join("\n");
  return `${title}\n\n${body}`;
}
