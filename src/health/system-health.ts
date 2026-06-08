import { config } from "../config.js";
import { agentHealth } from "./agent-health.js";
import { modelHealth } from "./model-health.js";
import { telegramHealth } from "./telegram-health.js";

export function systemHealth(): string {
  const agents = agentHealth();
  const models = modelHealth();
  const telegram = telegramHealth();
  const meteora = config.meteora.apiBaseUrl ? "READY" : "ERROR";
  const execution = config.execution.enableRealExecution ? "ENABLED" : "DISABLED";
  const emergencyStop = config.execution.emergencyStop ? "ON" : "OFF";
  const ready =
    agents.lio === "READY" &&
    agents.cala === "READY" &&
    agents.konlin === "READY" &&
    telegram.group === "READY" &&
    telegram.topics === "READY" &&
    models.deepseek === "READY" &&
    models.claude === "READY" &&
    agents.hermes === "READY" &&
    meteora === "READY" &&
    execution === "DISABLED";

  return [
    "📡 System Status",
    "",
    `Lio: ${agents.lio}`,
    `Cala: ${agents.cala}`,
    `Konlin: ${agents.konlin}`,
    `Telegram Group: ${telegram.group}`,
    `Topics: ${telegram.topics}`,
    `DeepSeek: ${models.deepseek}`,
    `Claude: ${models.claude}`,
    `Hermes: ${agents.hermes}`,
    `Meteora: ${meteora}`,
    `Execution: ${execution}`,
    `Emergency Stop: ${emergencyStop}`,
    "",
    `Final: ${ready ? "READY" : "NOT READY"}`,
    "",
    "Topic Details:",
    ...telegram.lines
  ].join("\n");
}
