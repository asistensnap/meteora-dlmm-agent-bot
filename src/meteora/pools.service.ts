import { MeteoraApi } from "./meteora-api.js";
import type { MeteoraRawPool } from "./types.js";
import { ageHoursFrom } from "../utils/time.js";
import { safeRatio } from "../utils/math.js";
import type { NormalizedPool } from "../types.js";

export class PoolsService {
  constructor(private readonly api = new MeteoraApi()) {}

  async getNormalizedPools(): Promise<NormalizedPool[]> {
    const rawPools = await this.api.fetchPools();
    return rawPools.map(normalizePool).filter((pool): pool is NormalizedPool => pool !== null);
  }
}

function normalizePool(raw: MeteoraRawPool): NormalizedPool | null {
  const poolAddress = stringValue(raw.pool_address ?? raw.poolAddress ?? raw.address ?? raw.lbPair);
  const tokenX = stringValue(raw.token_x ?? raw.tokenX ?? raw.tokenXSymbol);
  const tokenY = stringValue(raw.token_y ?? raw.tokenY ?? raw.tokenYSymbol);
  const pair = stringValue(raw.pair ?? raw.name ?? raw.symbol) || `${tokenX || "?"}/${tokenY || "?"}`;
  const tvl = numberValue(raw.tvl ?? raw.liquidity ?? raw.liquidity_usd ?? raw.reserveUsd);
  const volume24h = numberValue(raw.volume_24h ?? raw.volume24h ?? raw.tradeVolume24h ?? raw.volume);
  const fee24h = numberValue(raw.fee_24h ?? raw.fee24h ?? raw.fees24h ?? raw.fees);
  const poolCreatedAt = stringValue(raw.pool_created_at ?? raw.poolCreatedAt ?? raw.created_at);
  const feeTvlRatio24h = numberValue(raw.fee_tvl_ratio_24h ?? raw.feeTvlRatio24h) || safeRatio(fee24h, tvl);

  if (!poolAddress || !pair) return null;

  return {
    poolAddress,
    pair,
    tokenX,
    tokenY,
    tvl,
    volume5m: numberValue(raw.volume_5m ?? raw.volume5m),
    volume30m: numberValue(raw.volume_30m ?? raw.volume30m),
    volume1h: numberValue(raw.volume_1h ?? raw.volume1h),
    volume4h: numberValue(raw.volume_4h ?? raw.volume4h),
    volume24h,
    fee5m: numberValue(raw.fee_5m ?? raw.fee5m),
    fee30m: numberValue(raw.fee_30m ?? raw.fee30m),
    fee1h: numberValue(raw.fee_1h ?? raw.fee1h),
    fee4h: numberValue(raw.fee_4h ?? raw.fee4h),
    fee24h,
    feeTvlRatio1h: numberValue(raw.fee_tvl_ratio_1h ?? raw.feeTvlRatio1h),
    feeTvlRatio4h: numberValue(raw.fee_tvl_ratio_4h ?? raw.feeTvlRatio4h),
    feeTvlRatio24h,
    apr1h: numberValue(raw.apr_1h ?? raw.apr1h),
    apr4h: numberValue(raw.apr_4h ?? raw.apr4h),
    apr24h: numberValue(raw.apr_24h ?? raw.apr24h ?? raw.apr),
    farmApy: numberValue(raw.farm_apy ?? raw.farmApy),
    feePct: numberValue(raw.fee_pct ?? raw.feePct),
    binStep: numberValue(raw.bin_step ?? raw.binStep),
    currentPrice: numberValue(raw.current_price ?? raw.currentPrice ?? raw.price) || undefined,
    poolCreatedAt,
    poolAgeHours: ageHoursFrom(poolCreatedAt),
    isBlacklisted: Boolean(raw.is_blacklisted ?? raw.isBlacklisted),
    raw
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
