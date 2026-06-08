import { config } from "../config.js";
import { PoolsService } from "../meteora/pools.service.js";
import { hardRejectReason } from "../risk/risk-filter.js";
import type { ScreeningResult } from "../types.js";
import { nowIso } from "../utils/time.js";
import { isAlertCandidate } from "./filters.js";
import { scorePool } from "./scoring.js";

export class LocalScanner {
  constructor(private readonly poolsService = new PoolsService()) {}

  async scan(): Promise<ScreeningResult> {
    const pools = await this.poolsService.getNormalizedPools();
    const rejectedReasons: Record<string, number> = {};
    const candidates = [];

    for (const pool of pools) {
      const rejectReason = hardRejectReason(pool);
      if (rejectReason) {
        rejectedReasons[rejectReason] = (rejectedReasons[rejectReason] ?? 0) + 1;
        continue;
      }

      const scored = scorePool(pool);
      if (!isAlertCandidate(scored)) {
        rejectedReasons.below_alert_threshold = (rejectedReasons.below_alert_threshold ?? 0) + 1;
        continue;
      }
      candidates.push(scored);
    }

    const top = candidates.sort((a, b) => b.score - a.score).slice(0, config.scan.maxClaudePoolCount);

    return {
      agent: "Screening Agent",
      timestamp: nowIso(),
      totalPoolsScanned: pools.length,
      totalRejected: pools.length - top.length,
      candidateCount: top.length,
      candidates: top,
      rejectedReasons
    };
  }
}
