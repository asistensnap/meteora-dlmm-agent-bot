import { openDb } from "./db.js";
import type { ClaudeAnalysisResult, ClaudePoolAnalysis, ScoredCandidate } from "../types.js";

export type TradeLogInput = {
  openedAt?: string;
  closedAt: string;
  poolAddress: string;
  pair: string;
  strategy: string;
  rangeRecommendation?: string;
  entryValueUsd?: number;
  exitValueUsd?: number;
  pnlUsd: number;
  pnlPercent?: number;
  exitReason: string;
  source: "PAPER" | "MANUAL" | "SYSTEM";
  notes?: string;
  rawJson?: unknown;
};

export class Repositories {
  savePoolScans(timestamp: string, candidates: ScoredCandidate[]): void {
    const db = openDb();
    try {
      const stmt = db.prepare(`
        INSERT INTO pool_scans (
          timestamp, pool_address, pair, tvl, volume_24h, fee_24h, fee_tvl_ratio_24h,
          apr_24h, farm_apy, bin_step, pool_created_at, local_strategy, risk_level,
          score, classification, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const tx = db.transaction((rows: ScoredCandidate[]) => {
        for (const row of rows) {
          stmt.run(
            timestamp,
            row.poolAddress,
            row.pair,
            row.tvl,
            row.volume24h,
            row.fee24h,
            row.feeTvl24h,
            row.apr24h,
            row.farmApy ?? null,
            row.binStep,
            row.poolCreatedAt ?? null,
            row.localStrategy,
            row.risk,
            row.score,
            row.classification,
            JSON.stringify(row.raw)
          );
        }
      });
      tx(candidates);
    } finally {
      db.close();
    }
  }

  saveClaudeAnalysis(result: ClaudeAnalysisResult): void {
    const db = openDb();
    try {
      const stmt = db.prepare(`
        INSERT INTO claude_analysis (
          timestamp, pool_address, pair, decision, strategy, range_recommendation,
          max_allocation, main_reason, exit_rule, confidence, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const tx = db.transaction((rows: ClaudePoolAnalysis[]) => {
        for (const row of rows) {
          stmt.run(
            result.timestamp,
            row.poolAddress,
            row.pair,
            row.decision,
            row.strategy,
            row.range,
            row.maxAllocation,
            row.mainReason,
            row.exitRule,
            row.confidence,
            JSON.stringify(result)
          );
        }
      });
      tx(result.results);
    } finally {
      db.close();
    }
  }

  saveAlert(alert: {
    timestamp: string;
    poolAddress: string;
    pair: string;
    alertType: string;
    score: number;
    confidence?: number;
    telegramMessageId?: number;
  }): void {
    const db = openDb();
    try {
      db.prepare(`
        INSERT INTO alerts (timestamp, pool_address, pair, alert_type, score, confidence, telegram_message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        alert.timestamp,
        alert.poolAddress,
        alert.pair,
        alert.alertType,
        alert.score,
        alert.confidence ?? null,
        alert.telegramMessageId ?? null
      );
    } finally {
      db.close();
    }
  }

  latestTopPools(limit = 5): Array<Record<string, unknown>> {
    const db = openDb();
    try {
      return db.prepare("SELECT * FROM pool_scans ORDER BY id DESC LIMIT ?").all(limit) as Array<Record<string, unknown>>;
    } finally {
      db.close();
    }
  }

  latestWatchlist(limit = 5): Array<Record<string, unknown>> {
    const db = openDb();
    try {
      return db.prepare(`
        SELECT * FROM claude_analysis
        WHERE decision IN ('ENTER_SMALL', 'WATCHLIST', 'PAPER_ONLY')
        ORDER BY id DESC LIMIT ?
      `).all(limit) as Array<Record<string, unknown>>;
    } finally {
      db.close();
    }
  }

  paperPerformance(): Array<Record<string, unknown>> {
    const db = openDb();
    try {
      return db.prepare(`
        SELECT
          COALESCE(result_1h, 'UNKNOWN') AS result,
          COUNT(*) AS count
        FROM paper_positions
        GROUP BY COALESCE(result_1h, 'UNKNOWN')
      `).all() as Array<Record<string, unknown>>;
    } finally {
      db.close();
    }
  }

  saveTradeLog(trade: TradeLogInput): void {
    const db = openDb();
    try {
      db.prepare(`
        INSERT INTO trade_logs (
          opened_at, closed_at, pool_address, pair, strategy, range_recommendation,
          entry_value_usd, exit_value_usd, pnl_usd, pnl_percent, pnl_status,
          exit_reason, source, notes, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        trade.openedAt ?? null,
        trade.closedAt,
        trade.poolAddress,
        trade.pair,
        trade.strategy,
        trade.rangeRecommendation ?? null,
        trade.entryValueUsd ?? null,
        trade.exitValueUsd ?? null,
        trade.pnlUsd,
        trade.pnlPercent ?? null,
        pnlStatus(trade.pnlUsd),
        trade.exitReason,
        trade.source,
        trade.notes ?? null,
        JSON.stringify(trade.rawJson ?? trade)
      );
    } finally {
      db.close();
    }
  }

  latestTradeLogs(limit = 10): Array<Record<string, unknown>> {
    const db = openDb();
    try {
      return db.prepare("SELECT * FROM trade_logs ORDER BY closed_at DESC, id DESC LIMIT ?").all(limit) as Array<Record<string, unknown>>;
    } finally {
      db.close();
    }
  }

  tradeLogSummary(): Record<string, unknown> {
    const db = openDb();
    try {
      const summary = db.prepare(`
        SELECT
          COUNT(*) AS totalClosed,
          SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END) AS positiveCount,
          SUM(CASE WHEN pnl_usd < 0 THEN 1 ELSE 0 END) AS negativeCount,
          SUM(CASE WHEN pnl_usd = 0 THEN 1 ELSE 0 END) AS flatCount,
          COALESCE(SUM(pnl_usd), 0) AS totalPnlUsd,
          COALESCE(AVG(pnl_percent), 0) AS avgPnlPercent,
          COALESCE(MAX(pnl_usd), 0) AS bestPnlUsd,
          COALESCE(MIN(pnl_usd), 0) AS worstPnlUsd
        FROM trade_logs
      `).get() as Record<string, unknown>;
      const byStrategy = db.prepare(`
        SELECT strategy, COUNT(*) AS count, COALESCE(SUM(pnl_usd), 0) AS pnlUsd
        FROM trade_logs
        GROUP BY strategy
        ORDER BY pnlUsd DESC
      `).all() as Array<Record<string, unknown>>;
      return { ...summary, byStrategy };
    } finally {
      db.close();
    }
  }
}

function pnlStatus(pnlUsd: number): "POSITIVE" | "NEGATIVE" | "FLAT" {
  if (pnlUsd > 0) return "POSITIVE";
  if (pnlUsd < 0) return "NEGATIVE";
  return "FLAT";
}
