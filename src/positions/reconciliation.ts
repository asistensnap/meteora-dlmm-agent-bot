import { config } from "../config.js";
import { PoolsService } from "../meteora/pools.service.js";
import { logger } from "../utils/logger.js";
import { PositionsRepository } from "./positions.repo.js";

export interface ReconciliationReport {
  timestamp: string;
  walletConfigured: boolean;
  onChainChecked: boolean;
  localOpenCount: number;
  driftNotes: string[];
}

/**
 * Startup position reconciliation (read-only).
 *
 * True on-chain position fetching requires the Meteora DLMM SDK
 * (@meteora-ag/dlmm getPositionsByUserAndLbPair or equivalent), which is NOT
 * installed in this repo — signatures cannot be verified locally, so per the
 * no-invented-APIs guardrail this module does not guess at them.
 * TODO(verify): implement on-chain fetch when the DLMM SDK is added as a
 * dependency and its method signatures can be verified from node_modules.
 *
 * What runs today: local OPEN paper positions are reconciled against the live
 * Meteora API — positions whose pool has disappeared or been blacklisted are
 * reported as drift.
 */
export async function startupReconciliation(
  repo = new PositionsRepository(),
  poolsService = new PoolsService()
): Promise<ReconciliationReport> {
  const timestamp = new Date().toISOString();
  const walletConfigured = Boolean(config.positions.walletPublicAddress);
  const localOpen = repo.openPaperPositions();
  const driftNotes: string[] = [];

  if (!walletConfigured) {
    driftNotes.push("No WALLET_PUBLIC_ADDRESS configured; on-chain reconciliation skipped (scanner mode).");
  } else {
    driftNotes.push("WALLET_PUBLIC_ADDRESS is set, but on-chain position fetch is unavailable without the DLMM SDK (see TODO(verify) in reconciliation.ts).");
  }

  if (localOpen.length > 0) {
    try {
      const pools = await poolsService.getNormalizedPools();
      const byAddress = new Map(pools.map((pool) => [pool.poolAddress, pool]));
      for (const position of localOpen) {
        const pool = byAddress.get(position.pool_address);
        if (!pool) {
          driftNotes.push(`Position #${position.id} (${position.pair}): pool ${position.pool_address} not found in Meteora API listing.`);
        } else if (pool.isBlacklisted) {
          driftNotes.push(`Position #${position.id} (${position.pair}): pool is now blacklisted.`);
        }
      }
    } catch (error) {
      driftNotes.push("Meteora API unavailable during reconciliation; local positions could not be verified.");
      logger.warn({ err: error }, "reconciliation pool fetch failed");
    }
  }

  const report: ReconciliationReport = {
    timestamp,
    walletConfigured,
    onChainChecked: false,
    localOpenCount: localOpen.length,
    driftNotes
  };
  logger.info({ localOpenCount: report.localOpenCount, driftCount: driftNotes.length }, "startup reconciliation complete (read-only)");
  return report;
}

export function formatReconciliationReport(report: ReconciliationReport): string {
  return [
    "📡 Startup Reconciliation (read-only)",
    "",
    `Time: ${report.timestamp}`,
    `Local OPEN paper positions: ${report.localOpenCount}`,
    `On-chain check: ${report.onChainChecked ? "done" : "not available (no DLMM SDK; scanner mode)"}`,
    "",
    "Findings:",
    ...(report.driftNotes.length ? report.driftNotes.map((note) => `- ${note}`) : ["- No drift detected."])
  ].join("\n");
}
