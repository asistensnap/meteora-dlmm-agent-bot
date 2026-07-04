import { config, getProviderStatus, getTelegramStatus } from "../config.js";
import { systemHealth } from "../health/system-health.js";
import { ModelRouter } from "../model-router.js";
import { evilPandaStrategyPrompt } from "../strategy/evilpanda-strategy.js";
import { topicStatusLines } from "../telegram/topic-manager.js";
import { TradeLogService } from "../trade/trade-log.js";
import { CalaScreeningAgent } from "./cala-screening.agent.js";
import { KonlinAnalystAgent } from "./konlin-analyst.agent.js";

export class LioOperatorAgent {
  constructor(
    private readonly cala = new CalaScreeningAgent(),
    private readonly konlin = new KonlinAnalystAgent(),
    private readonly router = new ModelRouter(),
    private readonly tradeLogs = new TradeLogService()
  ) {}

  startMessage(): string {
    return [
      "Operator Update",
      "Agent: Lio",
      "Model: DeepSeek",
      "Status: Ready for one-group topic workflow.",
      "",
      "Commands:",
      "/status",
      "/ping",
      "/modelcheck",
      "/scan_test",
      "/workflow_test",
      "/topiccheck",
      "/trade_log",
      "/trade_summary",
      "/trade_log_test",
      "/evilpanda_strategy",
      "/positions_net",
      "/killswitch_status",
      "/killswitch_reset",
      "/ping_all",
      "/execution_mode"
    ].join("\n");
  }

  status(): string {
    const providers = getProviderStatus();
    return [
      "System Status",
      "",
      "Lio: READY",
      "Cala: READY",
      "Konlin: READY",
      `DeepSeek: ${providers.deepseek === "configured" ? "READY" : providers.deepseek}`,
      `Claude: ${providers.anthropic === "configured" ? "READY" : providers.anthropic}`,
      `Telegram Chat ID: ${getTelegramStatus()}`,
      `Telegram Topics: ${topicStatusLines().every((line) => line.includes("READY")) ? "READY" : "CHECK_REQUIRED"}`,
      "",
      "Bot Usernames:",
      `Lio: ${config.agents.lio.username}`,
      `Cala: ${config.agents.cala.username}`,
      `Konlin: ${config.agents.konlin.username}`,
      "",
      "Model Routing:",
      this.router.routingStatus(),
      "",
      `Execution Mode: ${config.execution.mode}`,
      `Paper Trading: ${config.execution.paperTrading}`,
      `Real Execution: ${config.execution.enableRealExecution}`,
      `Emergency Stop: ${config.execution.emergencyStop}`
    ].join("\n");
  }

  ping(): string {
    return "Lio online.";
  }

  pingAll(): string {
    return systemHealth();
  }

  modelcheck(): string {
    return this.router.compactStatus();
  }

  topiccheck(): string {
    return ["System Status", "Telegram Topic Check:", "", ...topicStatusLines()].join("\n");
  }

  envcheck(): string {
    return [
      "📡 System Status",
      "",
      `TELEGRAM_CHAT_ID: ${config.telegram.chatId ? "READY" : config.telegram.rawChatId?.startsWith("@") ? "ERROR_USERNAME_NOT_CHAT_ID" : "MISSING"}`,
      `OPERATOR_TOPIC_ID: ${config.telegram.topics.OPERATOR ? "READY" : "MISSING"}`,
      `SCREENING_TOPIC_ID: ${config.telegram.topics.SCREENING ? "READY" : "MISSING"}`,
      `ANALYST_TOPIC_ID: ${config.telegram.topics.ANALYST ? "READY" : "MISSING"}`,
      `SYSTEM_TOPIC_ID: ${config.telegram.topics.SYSTEM ? "READY" : "MISSING"}`,
      `RESULT_TOPIC_ID: ${config.telegram.topics.RESULT ? "READY" : "MISSING"}`,
      `ENTRY_TOPIC_ID: ${config.telegram.topics.ENTRY ? "READY" : "MISSING"}`,
      `TRADE_LOG_TOPIC_ID: ${config.telegram.topics.TRADE_LOG ? "READY" : "MISSING"}`,
      `TROUBLESHOOT_TOPIC_ID: ${config.telegram.topics.TROUBLESHOOT ? "READY" : "MISSING"}`,
      `DEEPSEEK_API_KEY: ${config.providers.deepseek.apiKey ? "READY" : "MISSING"}`,
      `ANTHROPIC_API_KEY: ${config.providers.anthropic.apiKey ? "READY" : "MISSING"}`,
      `CLAUDE_ANALYST_MODEL: ${config.providers.anthropic.analystModel ? "READY" : "MISSING"}`,
      `METEORA_API_BASE_URL: ${config.meteora.apiBaseUrl ? "READY" : "MISSING"}`,
      "Secrets: hidden"
    ].join("\n");
  }

  scanTest(): string {
    return JSON.stringify(this.cala.scanTest(), null, 2);
  }

  screeningResultMessage(): string {
    const cala = this.cala.scanTest();
    return [
      "Screening Result",
      "Agent: Cala",
      "Model: DeepSeek",
      `Candidates: ${cala.candidateCount}`,
      `Rejected: ${cala.totalRejected}`,
      "",
      JSON.stringify(cala, null, 2)
    ].join("\n");
  }

  workflowTest(): string {
    return this.workflowMessages().result;
  }

  workflowMessages(): { operatorStart: string; screening: string; analyst: string; result: string; operatorSummary: string; troubleshoot?: string } {
    const workflowRunId = createWorkflowRunId();
    const cala = this.cala.scanTest();
    const calaValidation = validateCala(cala);
    const operatorStart = [
      "Operator Update",
      "Agent: Lio",
      "Model: DeepSeek",
      `Workflow Run ID: ${workflowRunId}`,
      "Status: Workflow started",
      "Step: Lio received /workflow_test"
    ].join("\n");

    if (!calaValidation.valid) {
      return {
        operatorStart,
        screening: "",
        analyst: "",
        result: "",
        operatorSummary: `Operator Update\nAgent: Lio\nStatus: Workflow failed at Cala validation`,
        troubleshoot: troubleshootMessage("/workflow_test", "Lio", "validate Cala JSON", calaValidation.error)
      };
    }
    if (cala.candidates.length === 0) {
      return {
        operatorStart,
        screening: "Screening Result\nAgent: Cala\nModel: DeepSeek\nCandidates: 0",
        analyst: "",
        result: "Final DLMM Result\n\nNo candidates.\n\nStatus:\nDummy workflow test only.",
        operatorSummary: `Operator Update\nAgent: Lio\nWorkflow Run ID: ${workflowRunId}\nStatus: No candidates; Konlin not called.`
      };
    }

    const konlin = this.konlin.analyzeTest(cala.candidates.slice(0, config.scan.maxClaudePoolCount));
    const konlinValidation = validateKonlin(konlin);
    if (!konlinValidation.valid) {
      return {
        operatorStart,
        screening: this.screeningResultMessage(),
        analyst: "",
        result: "",
        operatorSummary: `Operator Update\nAgent: Lio\nStatus: Workflow failed at Konlin validation`,
        troubleshoot: troubleshootMessage("/workflow_test", "Lio", "validate Konlin JSON", konlinValidation.error)
      };
    }

    const topDecision = konlin.results.find((item) => item.poolAddress === konlin.bestPool) ?? konlin.results[0];
    const screening = [
      "Screening Result",
      "Agent: Cala",
      "Model: DeepSeek",
      `Candidates: ${cala.candidateCount}`,
      `Rejected: ${cala.totalRejected}`,
      "",
      JSON.stringify(cala, null, 2)
    ].join("\n");

    const analyst = [
      "Analysis Result",
      "Agent: Konlin",
      "Model: Claude",
      `Best Pool: ${konlin.bestPool}`,
      `Confidence: ${topDecision?.confidence ?? 0}`,
      "",
      JSON.stringify(konlin, null, 2)
    ].join("\n");

    const result = [
      "📊 Final DLMM Result",
      "",
      "Best Pool:",
      topDecision?.pair ?? "USDC/USDT",
      "",
      "Decision:",
      topDecision?.decision ?? "WATCHLIST",
      "",
      "Strategy:",
      topDecision?.strategy ?? "CURVE",
      "",
      "Confidence:",
      String(topDecision?.confidence ?? 82),
      "",
      "Max Allocation:",
      topDecision?.maxAllocation ?? "5-10%",
      "",
      "Exit Rule:",
      topDecision?.exitRule ?? "Review if peg weakens or fee/TVL drops below threshold.",
      "",
      "Status:",
      "Dummy workflow test only.",
      "Real Meteora scan not enabled yet.",
      "Auto entry disabled."
    ].join("\n");

    const operatorSummary = [
      "Operator Update",
      "Agent: Lio",
      "Model: DeepSeek",
      `Workflow Run ID: ${workflowRunId}`,
      "Status: Workflow completed",
      `Screening candidates: ${cala.candidateCount}`,
      `Best pool: ${konlin.bestPool}`,
      "Final report posted to 📊 Result"
    ].join("\n");

    return { operatorStart, screening, analyst, result, operatorSummary };
  }

  entryStatus(): string {
    return [
      "Entry Status",
      `Mode: ${config.execution.mode}`,
      `Real Execution: ${config.execution.enableRealExecution}`,
      `Emergency Stop: ${config.execution.emergencyStop}`,
      "Pending Entry Plans: 0",
      "Auto entry is disabled by default."
    ].join("\n");
  }

  troubleshoot(): string {
    return troubleshootMessage("/troubleshoot", "Lio", "manual check", "No active error. Use this topic for failed sends, missing env values, model errors, and API errors.");
  }

  tradeLog(): string {
    return this.tradeLogs.latestMessage();
  }

  tradeSummary(): string {
    return this.tradeLogs.summaryMessage();
  }

  tradeLogTest(): string {
    return this.tradeLogs.createDummyClosedTrades();
  }

  evilPandaStrategy(): string {
    return evilPandaStrategyPrompt();
  }
}

function createWorkflowRunId(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `WF-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function validateCala(value: ReturnType<CalaScreeningAgent["scanTest"]>): { valid: true } | { valid: false; error: string } {
  if (value.agent !== "Cala") return { valid: false, error: "Cala JSON has invalid agent." };
  if (value.topic !== "🔎 Screening") return { valid: false, error: "Cala JSON has invalid topic." };
  if (!Array.isArray(value.candidates)) return { valid: false, error: "Cala candidates must be an array." };
  if (value.candidateCount !== value.candidates.length) return { valid: false, error: "Cala candidateCount mismatch." };
  if (value.candidates.length > config.scan.maxClaudePoolCount) return { valid: false, error: "Cala returned too many candidates." };
  for (const candidate of value.candidates) {
    if (!candidate.poolAddress || !candidate.pair || !Number.isFinite(candidate.score)) {
      return { valid: false, error: "Cala candidate has missing critical fields." };
    }
  }
  return { valid: true };
}

function validateKonlin(value: ReturnType<KonlinAnalystAgent["analyzeTest"]>): { valid: true } | { valid: false; error: string } {
  if (value.agent !== "Konlin") return { valid: false, error: "Konlin JSON has invalid agent." };
  if (value.topic !== "🧠 Analyst") return { valid: false, error: "Konlin JSON has invalid topic." };
  if (!Array.isArray(value.results)) return { valid: false, error: "Konlin results must be an array." };
  for (const result of value.results) {
    if (!result.poolAddress || !result.pair || !Number.isFinite(result.confidence)) {
      return { valid: false, error: "Konlin result has missing critical fields." };
    }
  }
  return { valid: true };
}

function troubleshootMessage(command: string, agent: string, step: string, error: string): string {
  return [
    "🛠 Troubleshoot Report",
    "",
    `Time: ${new Date().toISOString()}`,
    `Command: ${command}`,
    `Agent: ${agent}`,
    `Step: ${step}`,
    "Status: ERROR",
    `Error: ${error}`,
    "Suggested Fix: Check topic IDs, environment values, and the latest workflow payload."
  ].join("\n");
}
