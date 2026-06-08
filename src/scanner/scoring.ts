import { clamp, safeRatio } from "../utils/math.js";
import { estimateTokenRisk } from "../risk/token-risk.js";
import type { CandidateClassification, NormalizedPool, RiskLevel, ScoredCandidate } from "../types.js";
import { selectStrategy } from "./strategy-selector.js";

export function scorePool(pool: NormalizedPool): ScoredCandidate {
  const volumeTvlRatio = safeRatio(pool.volume24h, pool.tvl);
  const feeTvl24h = pool.feeTvlRatio24h || safeRatio(pool.fee24h, pool.tvl);
  const tokenRisk = estimateTokenRisk(pool);
  const localStrategy = selectStrategy(pool, volumeTvlRatio);
  const feeScore = clamp(feeTvl24h / 0.02, 0, 1) * 100;
  const volumeScore = clamp(volumeTvlRatio / 4, 0, 1) * 100;
  const tvlScore = clamp(Math.log10(pool.tvl) / 7, 0, 1) * 100;
  const tokenSafetyScore = tokenRisk === "LOW" ? 95 : tokenRisk === "MEDIUM" ? 70 : 30;
  const strategyFitScore = strategyFit(localStrategy);
  const ageScore = clamp(pool.poolAgeHours / 168, 0, 1) * 100;
  const score = Math.round(
    feeScore * 0.3 +
      volumeScore * 0.25 +
      tvlScore * 0.15 +
      tokenSafetyScore * 0.15 +
      strategyFitScore * 0.1 +
      ageScore * 0.05
  );

  return {
    poolAddress: pool.poolAddress,
    pair: pool.pair,
    score,
    classification: classify(score),
    risk: riskLevel(tokenRisk, localStrategy, score),
    localStrategy,
    tvl: pool.tvl,
    volume24h: pool.volume24h,
    fee24h: pool.fee24h,
    feeTvl24h,
    apr24h: pool.apr24h ?? 0,
    farmApy: pool.farmApy,
    binStep: pool.binStep ?? 0,
    volumeTvlRatio,
    poolAgeHours: pool.poolAgeHours,
    poolCreatedAt: pool.poolCreatedAt,
    raw: pool.raw
  };
}

function classify(score: number): CandidateClassification {
  if (score >= 85) return "HIGH_PRIORITY";
  if (score >= 70) return "WATCHLIST";
  if (score >= 55) return "PAPER_ONLY";
  return "IGNORE";
}

function riskLevel(tokenRisk: RiskLevel, strategy: string, score: number): RiskLevel {
  if (tokenRisk === "HIGH" || strategy === "BID_ASK") return "HIGH";
  if (tokenRisk === "LOW" && score >= 85) return "LOW";
  return "MEDIUM";
}

function strategyFit(strategy: string): number {
  if (strategy === "CURVE") return 88;
  if (strategy === "SPOT") return 74;
  if (strategy === "BID_ASK") return 78;
  return 20;
}
