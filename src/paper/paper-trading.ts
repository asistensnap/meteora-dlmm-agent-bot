import { config } from "../config.js";
import { openDb } from "../database/db.js";
import type { ClaudeAnalysisResult, ScoredCandidate } from "../types.js";

export class PaperTradingService {
  createPositions(candidates: ScoredCandidate[], analysis: ClaudeAnalysisResult): number {
    if (!config.execution.paperTrading) return 0;
    const db = openDb();
    const stmt = db.prepare(`
      INSERT INTO paper_positions (
        entry_timestamp, pool_address, pair, strategy, range_recommendation,
        score_at_entry, confidence_at_entry, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
    `);

    let created = 0;
    for (const result of analysis.results) {
      const candidate = candidates.find((item) => item.poolAddress === result.poolAddress);
      if (!candidate) continue;
      const actionable = ["ENTER_SMALL", "WATCHLIST"].includes(result.decision);
      if (!actionable || candidate.score < config.scan.alertScoreThreshold || result.confidence < config.scan.claudeConfidenceThreshold) continue;
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
    db.close();
    return created;
  }
}
