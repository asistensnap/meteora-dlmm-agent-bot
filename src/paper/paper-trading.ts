import { config } from "../config.js";
import { openDb } from "../database/db.js";
import { KillSwitchService } from "../positions/kill-switch.js";
import { logger } from "../utils/logger.js";
import type { ClaudeAnalysisResult, ScoredCandidate } from "../types.js";

export class PaperTradingService {
  constructor(private readonly killSwitch = new KillSwitchService()) {}

  createPositions(candidates: ScoredCandidate[], analysis: ClaudeAnalysisResult): number {
    if (!config.execution.paperTrading) return 0;
    if (this.killSwitch.isEngaged()) {
      logger.warn("kill-switch engaged; refusing to open new paper positions");
      return 0;
    }
    const db = openDb();
    let created = 0;
    try {
      const stmt = db.prepare(`
        INSERT INTO paper_positions (
          entry_timestamp, pool_address, pair, strategy, range_recommendation,
          score_at_entry, confidence_at_entry, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
      `);
      const openExists = db.prepare("SELECT 1 FROM paper_positions WHERE pool_address = ? AND status = 'OPEN' LIMIT 1");

      for (const result of analysis.results) {
        const candidate = candidates.find((item) => item.poolAddress === result.poolAddress);
        if (!candidate) continue;
        const actionable = ["ENTER_SMALL", "WATCHLIST"].includes(result.decision);
        if (!actionable || candidate.score < config.scan.alertScoreThreshold || result.confidence < config.scan.claudeConfidenceThreshold) continue;
        // Idempotency guard: never stack a second OPEN paper position on the same pool.
        if (openExists.get(candidate.poolAddress)) continue;
        stmt.run(
          new Date().toISOString(),
          candidate.poolAddress,
          candidate.pair,
          result.strategy,
          result.range,
          candidate.score,
          result.confidence,
          "Version 1 paper position. No real deposit executed."
        );
        created += 1;
      }
    } finally {
      db.close();
    }
    return created;
  }
}
