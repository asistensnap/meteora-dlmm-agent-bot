import type Database from "better-sqlite3";
import { initDb, openDb } from "../database/db.js";

export interface OpenPaperPosition {
  id: number;
  entry_timestamp: string;
  pool_address: string;
  pair: string;
  strategy: string;
  range_recommendation: string;
  status: string;
}

export interface PositionTrackingRow {
  position_id: number;
  entry_price: number | null;
  notional_usd: number;
  fees_earned_usd: number;
  il_usd: number;
  net_usd: number;
  in_range: number;
  oor_since: string | null;
  last_cycle_at: string | null;
  data_status: string;
}

// Full schema (CREATE IF NOT EXISTS) is applied once per process so the
// tracker also works against a database created before Phase 2.
let schemaEnsured = false;

export class PositionsRepository {
  private withDb<T>(work: (db: Database.Database) => T): T {
    if (!schemaEnsured) {
      initDb();
      schemaEnsured = true;
    }
    const db = openDb();
    try {
      return work(db);
    } finally {
      db.close();
    }
  }

  openPaperPositions(): OpenPaperPosition[] {
    return this.withDb((db) =>
      db.prepare("SELECT id, entry_timestamp, pool_address, pair, strategy, range_recommendation, status FROM paper_positions WHERE status = 'OPEN' ORDER BY id").all() as OpenPaperPosition[]
    );
  }

  tracking(positionId: number): PositionTrackingRow | undefined {
    return this.withDb((db) =>
      db.prepare("SELECT * FROM position_tracking WHERE position_id = ?").get(positionId) as PositionTrackingRow | undefined
    );
  }

  allTracking(): PositionTrackingRow[] {
    return this.withDb((db) => db.prepare("SELECT * FROM position_tracking").all() as PositionTrackingRow[]);
  }

  initTracking(positionId: number, entryPrice: number | null, notionalUsd: number, timestamp: string): void {
    this.withDb((db) =>
      db.prepare(`
        INSERT OR IGNORE INTO position_tracking (position_id, entry_price, notional_usd, last_cycle_at)
        VALUES (?, ?, ?, ?)
      `).run(positionId, entryPrice, notionalUsd, timestamp)
    );
  }

  updateTracking(row: PositionTrackingRow): void {
    this.withDb((db) =>
      db.prepare(`
        UPDATE position_tracking SET
          entry_price = ?, notional_usd = ?, fees_earned_usd = ?, il_usd = ?, net_usd = ?,
          in_range = ?, oor_since = ?, last_cycle_at = ?, data_status = ?
        WHERE position_id = ?
      `).run(
        row.entry_price,
        row.notional_usd,
        row.fees_earned_usd,
        row.il_usd,
        row.net_usd,
        row.in_range,
        row.oor_since,
        row.last_cycle_at,
        row.data_status,
        row.position_id
      )
    );
  }

  appendHistory(entry: {
    positionId: number;
    timestamp: string;
    feesEarnedUsd: number;
    ilUsd: number;
    netUsd: number;
    netPct: number;
    inRange: boolean;
    currentPrice?: number;
  }): void {
    this.withDb((db) =>
      db.prepare(`
        INSERT INTO net_pnl_history (position_id, timestamp, fees_earned_usd, il_usd, net_usd, net_pct, in_range, current_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entry.positionId,
        entry.timestamp,
        entry.feesEarnedUsd,
        entry.ilUsd,
        entry.netUsd,
        entry.netPct,
        entry.inRange ? 1 : 0,
        entry.currentPrice ?? null
      )
    );
  }

  /** Net change today per position: latest net_usd minus the earliest net_usd recorded today. */
  dailyNetDeltaUsd(dayStartIso: string): number {
    return this.withDb((db) => {
      const row = db.prepare(`
        SELECT COALESCE(SUM(latest.net_usd - earliest.net_usd), 0) AS delta
        FROM (
          SELECT position_id, net_usd FROM net_pnl_history h
          WHERE timestamp >= ? AND id = (SELECT MAX(id) FROM net_pnl_history WHERE position_id = h.position_id AND timestamp >= ?)
          GROUP BY position_id
        ) latest
        JOIN (
          SELECT position_id, net_usd FROM net_pnl_history h
          WHERE timestamp >= ? AND id = (SELECT MIN(id) FROM net_pnl_history WHERE position_id = h.position_id AND timestamp >= ?)
          GROUP BY position_id
        ) earliest ON earliest.position_id = latest.position_id
      `).get(dayStartIso, dayStartIso, dayStartIso, dayStartIso) as { delta: number };
      return Number(row?.delta ?? 0);
    });
  }

  closedPnlUsdSince(dayStartIso: string): number {
    return this.withDb((db) => {
      const row = db.prepare("SELECT COALESCE(SUM(pnl_usd), 0) AS pnl FROM trade_logs WHERE closed_at >= ?").get(dayStartIso) as { pnl: number };
      return Number(row?.pnl ?? 0);
    });
  }

  totalOpenNotionalUsd(): number {
    return this.withDb((db) => {
      const row = db.prepare(`
        SELECT COALESCE(SUM(t.notional_usd), 0) AS notional
        FROM position_tracking t
        JOIN paper_positions p ON p.id = t.position_id
        WHERE p.status = 'OPEN'
      `).get() as { notional: number };
      return Number(row?.notional ?? 0);
    });
  }

  getSetting(key: string): string | undefined {
    return this.withDb((db) => {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
      return row?.value;
    });
  }

  setSetting(key: string, value: string): void {
    this.withDb((db) =>
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value)
    );
  }

  deleteSetting(key: string): void {
    this.withDb((db) => db.prepare("DELETE FROM settings WHERE key = ?").run(key));
  }
}
