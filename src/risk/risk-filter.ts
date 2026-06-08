import { config } from "../config.js";
import type { NormalizedPool } from "../types.js";

export function hardRejectReason(pool: NormalizedPool): string | null {
  if (pool.isBlacklisted) return "blacklisted";
  if (!pool.poolAddress || !pool.pair) return "missing_critical_data";
  if (!Number.isFinite(pool.tvl) || pool.tvl <= 0) return "invalid_tvl";
  if (!Number.isFinite(pool.volume24h) || pool.volume24h <= 0) return "invalid_volume";
  if (!Number.isFinite(pool.feeTvlRatio24h) || pool.feeTvlRatio24h <= 0) return "invalid_fee_tvl";
  if (pool.tvl < config.risk.minTvl) return "low_tvl";
  if (pool.volume24h < config.risk.minVolume24h) return "low_volume";
  if (pool.feeTvlRatio24h < config.risk.minFeeTvlRatio24h) return "low_fee_tvl";
  if (pool.poolAgeHours < config.risk.minPoolAgeHours) return "too_new";
  return null;
}
