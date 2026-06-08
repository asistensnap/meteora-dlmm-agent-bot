import { config } from "../config.js";
import { ClaudeAnalystAgent } from "./claude-analyst.agent.js";
import { ScreeningAgent } from "./screening.agent.js";
import { Repositories } from "../database/repositories.js";
import { PaperTradingService } from "../paper/paper-trading.js";
import { formatOpportunityAlert } from "../telegram/alert-formatter.js";
import { isDuplicateAlert, markAlerted } from "../utils/dedupe.js";
import { logger } from "../utils/logger.js";
import type { BotMode, ClaudeAnalysisResult, ScanWorkflowResult, ScoredCandidate } from "../types.js";

export class OperatorAgent {
  private mode: BotMode = config.execution.mode === "PAPER_TRADING" ? "paper_trading" : "scanner_only";
  private paused = false;
  private lastScanTime = "never";
  private lastCandidateCount = 0;
  private lastAlertCount = 0;

  constructor(
    private readonly screening = new ScreeningAgent(),
    private readonly claude = new ClaudeAnalystAgent(),
    private readonly repos = new Repositories(),
    private readonly paper = new PaperTradingService()
  ) {}

  status(): string {
    return [
      "Meteora DLMM Agent Status",
      "",
      `State: ${this.paused ? "paused" : "running"}`,
      `Execution mode: ${this.mode}`,
      `Paper trading: ${config.execution.paperTrading ? "on" : "off"}`,
      `Last scan: ${this.lastScanTime}`,
      `Last candidates: ${this.lastCandidateCount}`,
      `Last alerts: ${this.lastAlertCount}`,
      "Real deposits: disabled in version 1"
    ].join("\n");
  }

  pause(): string {
    this.paused = true;
    this.mode = "paused";
    return "Scheduled scans paused.";
  }

  resume(): string {
    this.paused = false;
    this.mode = config.execution.paperTrading ? "paper_trading" : "scanner_only";
    return "Scheduled scans resumed.";
  }

  setMode(input: string): string {
    if (input === "scanner_only") {
      this.paused = false;
      this.mode = "scanner_only";
      return "Mode set to scanner_only.";
    }
    if (input === "paper_trading") {
      this.paused = false;
      this.mode = "paper_trading";
      return "Mode set to paper_trading.";
    }
    if (input === "semi_auto") return "SEMI_AUTO is planned but disabled in version 1 for safety.";
    if (input === "auto") return "AUTO is disabled in version 1 for safety.";
    return "Usage: /set_mode scanner_only | paper_trading | semi_auto | auto";
  }

  settings(): string {
    return [
      "Safe Settings",
      "",
      `Meteora API: ${config.meteora.apiBaseUrl}`,
      `Database path: ${config.database.path}`,
      `Scan interval minutes: ${config.scan.intervalMinutes}`,
      `Min TVL: ${config.risk.minTvl}`,
      `Min volume 24h: ${config.risk.minVolume24h}`,
      `Min fee/TVL 24h: ${config.risk.minFeeTvlRatio24h}`,
      `Max Claude pool count: ${config.scan.maxClaudePoolCount}`,
      `Paper trading: ${config.execution.paperTrading}`,
      "Secrets: hidden"
    ].join("\n");
  }

  async runScan(sendAlert?: (message: string) => Promise<number | undefined>): Promise<ScanWorkflowResult> {
    if (this.paused) {
      logger.info("scan skipped because bot is paused");
      return {
        screening: {
          agent: "Screening Agent",
          timestamp: new Date().toISOString(),
          totalPoolsScanned: 0,
          totalRejected: 0,
          candidateCount: 0,
          candidates: [],
          rejectedReasons: { paused: 1 }
        },
        analysis: null,
        alertedCount: 0
      };
    }

    const screening = await this.screening.run();
    this.lastScanTime = screening.timestamp;
    this.lastCandidateCount = screening.candidateCount;
    this.repos.savePoolScans(screening.timestamp, screening.candidates);

    if (screening.candidates.length === 0) {
      this.lastAlertCount = 0;
      return { screening, analysis: null, alertedCount: 0 };
    }

    const freshCandidates = screening.candidates.filter((candidate) => !isDuplicateAlert(candidate.poolAddress));
    if (freshCandidates.length === 0) {
      this.lastAlertCount = 0;
      return { screening, analysis: null, alertedCount: 0 };
    }

    const analysis = await this.claude.analyze(this.mode.toUpperCase(), freshCandidates);
    this.repos.saveClaudeAnalysis(analysis);
    this.paper.createPositions(freshCandidates, analysis);
    const alertedCount = await this.sendAlerts(freshCandidates, analysis, sendAlert);
    this.lastAlertCount = alertedCount;
    return { screening, analysis, alertedCount };
  }

  topPools(): string {
    const rows = this.repos.latestTopPools(5);
    return rows.length
      ? rows.map((row, index) => `#${index + 1} ${row.pair} score=${row.score} strategy=${row.local_strategy} risk=${row.risk_level}`).join("\n")
      : "No pool scans stored yet.";
  }

  watchlist(): string {
    const rows = this.repos.latestWatchlist(5);
    return rows.length
      ? rows.map((row, index) => `#${index + 1} ${row.pair} decision=${row.decision} strategy=${row.strategy} confidence=${row.confidence}`).join("\n")
      : "No Claude watchlist records yet.";
  }

  performance(): string {
    const rows = this.repos.paperPerformance();
    if (rows.length === 0) return "No paper trading performance yet.";
    return rows.map((row) => `${row.result}: ${row.count}`).join("\n");
  }

  private async sendAlerts(
    candidates: ScoredCandidate[],
    analysis: ClaudeAnalysisResult,
    sendAlert?: (message: string) => Promise<number | undefined>
  ): Promise<number> {
    if (!sendAlert) return 0;
    let count = 0;
    for (const candidate of candidates) {
      if (count >= config.scan.maxAlertsPerScan) break;
      const result = analysis.results.find((item) => item.poolAddress === candidate.poolAddress);
      if (!result || result.confidence < config.scan.claudeConfidenceThreshold || result.decision === "AVOID") continue;
      const messageId = await sendAlert(formatOpportunityAlert(candidate, result, count + 1, this.mode));
      markAlerted(candidate.poolAddress);
      this.repos.saveAlert({
        timestamp: new Date().toISOString(),
        poolAddress: candidate.poolAddress,
        pair: candidate.pair,
        alertType: result.decision,
        score: candidate.score,
        confidence: result.confidence,
        telegramMessageId: messageId
      });
      count += 1;
    }
    return count;
  }
}
