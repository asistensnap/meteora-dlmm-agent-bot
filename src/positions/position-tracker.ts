import { config } from "../config.js";
import { PoolsService } from "../meteora/pools.service.js";
import { logger } from "../utils/logger.js";
import { nowIso } from "../utils/time.js";
import type { NormalizedPool } from "../types.js";
import { PositionsRepository, type OpenPaperPosition, type PositionTrackingRow } from "./positions.repo.js";

export interface PositionNetStatus {
  positionId: number;
  pair: string;
  poolAddress: string;
  strategy: string;
  notionalUsd: number;
  feesEarnedUsd: number;
  ilUsd: number;
  netUsd: number;
  netPct: number;
  inRange: boolean;
  oorDirection?: "UP" | "DOWN";
  oorSince?: string;
  oorMinutes?: number;
  dataStatus: string;
}

export interface OorTransition {
  positionId: number;
  pair: string;
  direction: "UP" | "DOWN";
  oorSince: string;
  oorMinutes: number;
}

export interface ManagementCycleReport {
  timestamp: string;
  positions: PositionNetStatus[];
  newOorAlerts: OorTransition[];
  dataMissingCount: number;
}

// Simulated downside band per range recommendation (one-sided SOL DLMM below entry).
// WIDE mirrors the EvilPanda -94% default; all values are dry-run estimates only.
const RANGE_LOWER_PCT: Record<string, number> = {
  NARROW: -0.86,
  MEDIUM: -0.9,
  WIDE: -0.94,
  NONE: -0.9
};

/**
 * Tracks simulated net PnL (fees earned minus impermanent/conversion loss) for
 * OPEN paper positions each management cycle. All numbers are estimates from
 * public Meteora pool data; no on-chain state exists in scanner/dry-run mode.
 */
export class NetPnlTracker {
  constructor(
    private readonly repo = new PositionsRepository(),
    private readonly poolsService = new PoolsService()
  ) {}

  async runCycle(): Promise<ManagementCycleReport> {
    const timestamp = nowIso();
    const open = this.repo.openPaperPositions();
    const report: ManagementCycleReport = { timestamp, positions: [], newOorAlerts: [], dataMissingCount: 0 };
    if (open.length === 0) return report;

    let pools: Map<string, NormalizedPool>;
    try {
      const list = await this.poolsService.getNormalizedPools();
      pools = new Map(list.map((pool) => [pool.poolAddress, pool]));
    } catch (error) {
      logger.error({ err: error }, "management cycle: pool fetch failed; skipping net-PnL update");
      pools = new Map();
    }

    for (const position of open) {
      const status = this.updatePosition(position, pools.get(position.pool_address), timestamp);
      report.positions.push(status);
      if (status.dataStatus !== "OK") report.dataMissingCount += 1;
      if (!status.inRange && status.oorSince === timestamp && status.oorDirection) {
        report.newOorAlerts.push({
          positionId: status.positionId,
          pair: status.pair,
          direction: status.oorDirection,
          oorSince: status.oorSince,
          oorMinutes: 0
        });
      }
    }
    return report;
  }

  latestStatuses(): PositionNetStatus[] {
    const open = this.repo.openPaperPositions();
    return open.map((position) => {
      const tracking = this.repo.tracking(position.id);
      return toStatus(position, tracking, undefined);
    });
  }

  private updatePosition(position: OpenPaperPosition, pool: NormalizedPool | undefined, timestamp: string): PositionNetStatus {
    this.repo.initTracking(position.id, pool?.currentPrice ?? null, config.positions.paperNotionalUsd, timestamp);
    const tracking = this.repo.tracking(position.id);
    if (!tracking) {
      logger.error({ positionId: position.id }, "tracking row missing after init");
      return toStatus(position, undefined, undefined);
    }

    if (!pool) {
      tracking.data_status = "DATA_MISSING";
      tracking.last_cycle_at = timestamp;
      this.repo.updateTracking(tracking);
      logger.warn({ positionId: position.id, pair: position.pair }, "pool not found in Meteora API; net-PnL cycle skipped for position");
      return toStatus(position, tracking, undefined);
    }

    // Backfill entry price if the pool had no price on the first cycle.
    if ((tracking.entry_price === null || tracking.entry_price === 0) && pool.currentPrice) {
      tracking.entry_price = pool.currentPrice;
    }

    const elapsedMinutes = elapsedMinutesSince(tracking.last_cycle_at, timestamp);
    const price = pool.currentPrice;
    const entry = tracking.entry_price;

    // Range check: one-sided SOL band below entry price.
    let inRange = true;
    let direction: "UP" | "DOWN" | undefined;
    if (price && entry && entry > 0) {
      const lowerBound = entry * (1 + (RANGE_LOWER_PCT[position.range_recommendation] ?? -0.9));
      if (price > entry * 1.001) {
        inRange = false;
        direction = "UP";
      } else if (price < lowerBound) {
        inRange = false;
        direction = "DOWN";
      }
    }

    // Simulated fee accrual: notional share of the pool's 24h fee/TVL rate,
    // pro-rated by elapsed time, only while in range.
    if (inRange && pool.feeTvlRatio24h > 0 && elapsedMinutes > 0) {
      tracking.fees_earned_usd += tracking.notional_usd * pool.feeTvlRatio24h * (elapsedMinutes / 1440);
    }

    // Simulated conversion/impermanent loss for a one-sided below-price band:
    // when price drops below entry, part of the band fills (SOL converted to the
    // falling token). Approximation: filled fraction x drop / 2 of notional.
    if (price && entry && entry > 0 && price < entry) {
      const drop = (entry - price) / entry;
      const bandWidth = Math.abs(RANGE_LOWER_PCT[position.range_recommendation] ?? -0.9);
      const filledFraction = Math.min(1, drop / bandWidth);
      tracking.il_usd = tracking.notional_usd * filledFraction * (drop / 2);
    } else {
      tracking.il_usd = 0;
    }

    tracking.net_usd = tracking.fees_earned_usd - tracking.il_usd;
    const wasInRange = tracking.in_range === 1;
    tracking.in_range = inRange ? 1 : 0;
    if (!inRange && wasInRange) tracking.oor_since = timestamp;
    if (inRange) tracking.oor_since = null;
    tracking.last_cycle_at = timestamp;
    tracking.data_status = price ? "OK" : "PRICE_MISSING";
    this.repo.updateTracking(tracking);

    const netPct = tracking.notional_usd > 0 ? (tracking.net_usd / tracking.notional_usd) * 100 : 0;
    this.repo.appendHistory({
      positionId: position.id,
      timestamp,
      feesEarnedUsd: tracking.fees_earned_usd,
      ilUsd: tracking.il_usd,
      netUsd: tracking.net_usd,
      netPct,
      inRange,
      currentPrice: price
    });

    logger.info(
      {
        positionId: position.id,
        pair: position.pair,
        feesEarnedUsd: round2(tracking.fees_earned_usd),
        ilUsd: round2(tracking.il_usd),
        netUsd: round2(tracking.net_usd),
        inRange
      },
      "net-PnL cycle updated position (simulated)"
    );

    return toStatus(position, tracking, direction);
  }
}

function toStatus(position: OpenPaperPosition, tracking: PositionTrackingRow | undefined, direction: "UP" | "DOWN" | undefined): PositionNetStatus {
  const notional = tracking?.notional_usd ?? config.positions.paperNotionalUsd;
  const netUsd = tracking?.net_usd ?? 0;
  const oorSince = tracking?.oor_since ?? undefined;
  return {
    positionId: position.id,
    pair: position.pair,
    poolAddress: position.pool_address,
    strategy: position.strategy,
    notionalUsd: notional,
    feesEarnedUsd: tracking?.fees_earned_usd ?? 0,
    ilUsd: tracking?.il_usd ?? 0,
    netUsd,
    netPct: notional > 0 ? (netUsd / notional) * 100 : 0,
    inRange: (tracking?.in_range ?? 1) === 1,
    oorDirection: direction,
    oorSince,
    oorMinutes: oorSince ? Math.max(0, Math.round((Date.now() - Date.parse(oorSince)) / 60_000)) : undefined,
    dataStatus: tracking?.data_status ?? "UNTRACKED"
  };
}

function elapsedMinutesSince(lastIso: string | null, nowIsoValue: string): number {
  if (!lastIso) return 0;
  const last = Date.parse(lastIso);
  const now = Date.parse(nowIsoValue);
  if (!Number.isFinite(last) || !Number.isFinite(now) || now <= last) return 0;
  return (now - last) / 60_000;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
