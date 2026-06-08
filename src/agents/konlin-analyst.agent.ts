import type { CalaDummyCandidate } from "./cala-screening.agent.js";

export interface KonlinDummyAnalysis {
  agent: "Konlin";
  topic: "🧠 Analyst";
  model: "Claude";
  timestamp: string;
  results: Array<{
    poolAddress: string;
    pair: string;
    decision: "ENTER_SMALL" | "WATCHLIST" | "PAPER_ONLY" | "AVOID";
    strategy: "CURVE" | "SPOT" | "BID_ASK" | "AVOID";
    range: "NARROW" | "MEDIUM" | "WIDE" | "NONE";
    maxAllocation: string;
    exitRule: string;
    confidence: number;
  }>;
  bestPool: string;
  summary: string;
}

export class KonlinAnalystAgent {
  analyzeTest(candidates: CalaDummyCandidate[]): KonlinDummyAnalysis {
    const poolAddresses = new Set(candidates.map((candidate) => candidate.poolAddress));
    const results = [
      {
        poolAddress: "DUMMY_POOL_SOL_USDC",
        pair: "SOL/USDC",
        decision: "WATCHLIST" as const,
        strategy: "SPOT" as const,
        range: "MEDIUM" as const,
        maxAllocation: "2-5%",
        exitRule: "Review if volume drops more than 50% or pool risk increases.",
        confidence: 78
      },
      {
        poolAddress: "DUMMY_POOL_USDC_USDT",
        pair: "USDC/USDT",
        decision: "WATCHLIST" as const,
        strategy: "CURVE" as const,
        range: "NARROW" as const,
        maxAllocation: "5-10%",
        exitRule: "Review if peg weakens or fee/TVL drops below threshold.",
        confidence: 82
      },
      {
        poolAddress: "DUMMY_POOL_MEME_SOL",
        pair: "MEME/SOL",
        decision: "PAPER_ONLY" as const,
        strategy: "BID_ASK" as const,
        range: "WIDE" as const,
        maxAllocation: "0%",
        exitRule: "Paper only. Avoid real exposure unless high-risk mode is enabled.",
        confidence: 74
      }
    ].filter((result) => poolAddresses.has(result.poolAddress));

    return {
      agent: "Konlin",
      topic: "🧠 Analyst",
      model: "Claude",
      timestamp: new Date().toISOString(),
      results,
      bestPool: "DUMMY_POOL_USDC_USDT",
      summary: "USDC/USDT is safest. SOL/USDC is balanced."
    };
  }
}
