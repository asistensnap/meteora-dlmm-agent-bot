import { config } from "../config.js";
import { estimateTokenRisk, estimateVolatility, isStablePair } from "../risk/token-risk.js";
import type { LocalStrategy, NormalizedPool } from "../types.js";

export function selectStrategy(pool: NormalizedPool, volumeTvlRatio: number): LocalStrategy {
  const tokenRisk = estimateTokenRisk(pool);
  const volatility = estimateVolatility(pool);

  if (tokenRisk === "HIGH" || pool.tvl < config.risk.minTvl * 1.5) return "AVOID";
  if (isStablePair(pool) && volatility !== "HIGH" && pool.feeTvlRatio24h >= config.risk.minFeeTvlRatio24h) return "CURVE";
  if (volatility === "HIGH" && pool.feeTvlRatio24h >= config.risk.minFeeTvlRatio24h * 1.5 && volumeTvlRatio >= 1) {
    return "BID_ASK";
  }
  return "SPOT";
}
