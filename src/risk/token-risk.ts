import type { NormalizedPool, RiskLevel } from "../types.js";

const STABLES = new Set(["USDC", "USDT", "USDH", "PYUSD", "USDS"]);
const BLUECHIPS = new Set(["SOL", "JUP", "JTO", "BTC", "ETH", "mSOL", "bSOL", "jitoSOL"]);

export function isStablePair(pool: NormalizedPool): boolean {
  return Boolean(pool.tokenX && pool.tokenY && STABLES.has(pool.tokenX) && STABLES.has(pool.tokenY));
}

export function estimateTokenRisk(pool: NormalizedPool): RiskLevel {
  const symbols = [pool.tokenX, pool.tokenY].filter(Boolean) as string[];
  if (symbols.length === 0) return "MEDIUM";
  if (symbols.every((symbol) => STABLES.has(symbol) || BLUECHIPS.has(symbol))) return "LOW";
  if (pool.poolAgeHours < 24 || /INU|PEPE|BONK|MOON|MEME/i.test(pool.pair)) return "HIGH";
  return "MEDIUM";
}

export function estimateVolatility(pool: NormalizedPool): RiskLevel {
  const shortVolume = (pool.volume1h ?? 0) * 24;
  if (pool.volume24h <= 0 || shortVolume <= 0) return "MEDIUM";
  const acceleration = shortVolume / pool.volume24h;
  if (acceleration > 2.5) return "HIGH";
  if (acceleration < 0.5) return "LOW";
  return "MEDIUM";
}
