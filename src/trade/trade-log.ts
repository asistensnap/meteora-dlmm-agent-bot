import { Repositories, type TradeLogInput } from "../database/repositories.js";

export class TradeLogService {
  constructor(private readonly repos = new Repositories()) {}

  recordClosedTrade(trade: TradeLogInput): string {
    this.repos.saveTradeLog(trade);
    return this.formatTrade(trade);
  }

  latestMessage(limit = 10): string {
    const rows = this.repos.latestTradeLogs(limit);
    if (rows.length === 0) {
      return [
        "Trade Log",
        "",
        "Closed positions: 0",
        "No closed paper or manual positions logged yet.",
        "",
        "Real execution remains disabled."
      ].join("\n");
    }
    return [
      "Trade Log",
      "",
      `Latest closed positions: ${rows.length}`,
      "",
      ...rows.map(formatRow),
      "",
      this.summaryMessage()
    ].join("\n");
  }

  summaryMessage(): string {
    const summary = this.repos.tradeLogSummary();
    const byStrategy = Array.isArray(summary.byStrategy) ? summary.byStrategy as Array<Record<string, unknown>> : [];
    return [
      "Trade Log Summary",
      "",
      `Total closed: ${num(summary.totalClosed)}`,
      `Positive PnL: ${num(summary.positiveCount)}`,
      `Negative PnL: ${num(summary.negativeCount)}`,
      `Flat PnL: ${num(summary.flatCount)}`,
      `Total PnL: ${money(summary.totalPnlUsd)}`,
      `Average PnL %: ${percent(summary.avgPnlPercent)}`,
      `Best PnL: ${money(summary.bestPnlUsd)}`,
      `Worst PnL: ${money(summary.worstPnlUsd)}`,
      "",
      "By strategy:",
      ...(byStrategy.length ? byStrategy.map((row) => `${String(row.strategy)}: ${num(row.count)} closed, ${money(row.pnlUsd)}`) : ["none"])
    ].join("\n");
  }

  createDummyClosedTrades(): string {
    const now = new Date();
    const trades: TradeLogInput[] = [
      {
        openedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        closedAt: now.toISOString(),
        poolAddress: "DUMMY_POOL_USDC_USDT",
        pair: "USDC/USDT",
        strategy: "CURVE",
        rangeRecommendation: "NARROW",
        entryValueUsd: 1000,
        exitValueUsd: 1034.5,
        pnlUsd: 34.5,
        pnlPercent: 3.45,
        exitReason: "Paper close: fee/TVL target reached.",
        source: "PAPER",
        notes: "Dummy Trade Log test. No real transaction."
      },
      {
        openedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        closedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        poolAddress: "DUMMY_POOL_MEME_SOL",
        pair: "MEME/SOL",
        strategy: "BID_ASK",
        rangeRecommendation: "WIDE",
        entryValueUsd: 500,
        exitValueUsd: 461.25,
        pnlUsd: -38.75,
        pnlPercent: -7.75,
        exitReason: "Paper close: risk increased and volume weakened.",
        source: "PAPER",
        notes: "Dummy Trade Log test. No real transaction."
      }
    ];
    for (const trade of trades) this.repos.saveTradeLog(trade);
    return [
      "Trade Log Test",
      "",
      "Inserted dummy closed positions:",
      ...trades.map((trade) => this.formatTrade(trade)),
      "",
      this.summaryMessage(),
      "",
      "Real execution remains disabled."
    ].join("\n");
  }

  private formatTrade(trade: TradeLogInput): string {
    return [
      `${trade.pair} | ${trade.strategy} | ${trade.pnlUsd >= 0 ? "POSITIVE" : "NEGATIVE"}`,
      `PnL: ${money(trade.pnlUsd)}${trade.pnlPercent === undefined ? "" : ` (${percent(trade.pnlPercent)})`}`,
      `Closed: ${trade.closedAt}`,
      `Exit: ${trade.exitReason}`
    ].join("\n");
  }
}

function formatRow(row: Record<string, unknown>): string {
  return [
    `${String(row.pair)} | ${String(row.strategy)} | ${String(row.pnl_status)}`,
    `PnL: ${money(row.pnl_usd)}${row.pnl_percent === null || row.pnl_percent === undefined ? "" : ` (${percent(row.pnl_percent)})`}`,
    `Closed: ${String(row.closed_at)}`,
    `Exit: ${String(row.exit_reason)}`,
    "---"
  ].join("\n");
}

function money(value: unknown): string {
  const numberValue = Number(value ?? 0);
  if (numberValue > 0) return `+$${numberValue.toFixed(2)}`;
  if (numberValue < 0) return `-$${Math.abs(numberValue).toFixed(2)}`;
  return "$0.00";
}

function percent(value: unknown): string {
  const numberValue = Number(value ?? 0);
  const sign = numberValue > 0 ? "+" : "";
  return `${sign}${numberValue.toFixed(2)}%`;
}

function num(value: unknown): number {
  return Number(value ?? 0);
}
