import type { HeronBreakdownFlag, HeronDurability, HeronNetCheck } from "../strategy/heron-strategy.js";
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
    /** Set when validated under a named strategy profile (e.g. "HERON Strategy"). */
    strategyName?: string;
    durability?: HeronDurability;
    netCheck?: HeronNetCheck;
    breakdownWatch?: HeronBreakdownFlag[];
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
        exitRule: "HERON: bounce (RSI(2)>90 + BB upper or first green MACD histogram), breakdown signals, net stop -12%, or 12h time stop — first to fire wins.",
        confidence: 74,
        strategyName: "HERON Strategy",
        durability: {
          volume1hActive: true,
          feeTvlOk: true,
          rangeDurabilityOk: false
        },
        netCheck: {
          expectedNetBeatsVaultHurdle: false
        },
        breakdownWatch: [] as HeronBreakdownFlag[]
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
