import type { HeronDurability } from "../strategy/heron-strategy.js";

export interface CalaDummyCandidate {
  poolAddress: string;
  pair: string;
  score: number;
  classification: "HIGH_PRIORITY" | "WATCHLIST" | "PAPER_ONLY";
  risk: "LOW" | "MEDIUM" | "HIGH";
  localStrategy: "CURVE" | "SPOT" | "BID_ASK" | "AVOID";
  tvl: number;
  volume24h: number;
  feeTvl24h: number;
  apr24h: number;
  /** Set when the candidate is screened under a named strategy profile (e.g. "HERON Strategy"). */
  strategyName?: string;
  /** HERON durability gate fields (volume1hActive, feeTvlOk, rangeDurabilityOk). */
  durability?: HeronDurability;
}

export interface CalaDummyResult {
  agent: "Cala";
  topic: "🔎 Screening";
  model: "DeepSeek";
  timestamp: string;
  totalPoolsScanned: number;
  totalRejected: number;
  candidateCount: number;
  candidates: CalaDummyCandidate[];
}

export class CalaScreeningAgent {
  scanTest(): CalaDummyResult {
    const candidates = [
      {
        poolAddress: "DUMMY_POOL_SOL_USDC",
        pair: "SOL/USDC",
        score: 84,
        classification: "WATCHLIST",
        risk: "MEDIUM",
        localStrategy: "SPOT",
        tvl: 1_250_000,
        volume24h: 4_800_000,
        feeTvl24h: 0.0099,
        apr24h: 145
      },
      {
        poolAddress: "DUMMY_POOL_USDC_USDT",
        pair: "USDC/USDT",
        score: 79,
        classification: "WATCHLIST",
        risk: "LOW",
        localStrategy: "CURVE",
        tvl: 3_500_000,
        volume24h: 6_200_000,
        feeTvl24h: 0.0023,
        apr24h: 52
      },
      {
        poolAddress: "DUMMY_POOL_MEME_SOL",
        pair: "MEME/SOL",
        score: 72,
        classification: "WATCHLIST",
        risk: "HIGH",
        localStrategy: "BID_ASK",
        tvl: 85_000,
        volume24h: 950_000,
        feeTvl24h: 0.115,
        apr24h: 420,
        strategyName: "HERON Strategy",
        durability: {
          volume1hActive: true,
          feeTvlOk: true,
          rangeDurabilityOk: false
        }
      }
    ] satisfies CalaDummyCandidate[];

    return {
      agent: "Cala",
      topic: "🔎 Screening",
      model: "DeepSeek",
      timestamp: new Date().toISOString(),
      totalPoolsScanned: 25,
      totalRejected: 22,
      candidateCount: 3,
      candidates
    };
  }
}
