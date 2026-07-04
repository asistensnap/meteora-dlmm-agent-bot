import TelegramBot from "node-telegram-bot-api";
import { LioOperatorAgent } from "../agents/lio-operator.agent.js";
import { config, getTelegramStatus } from "../config.js";
import { ManagementCycle } from "../positions/management-cycle.js";
import { logger } from "../utils/logger.js";
import { CommandHandler } from "./command-handler.js";

export function createTelegramBot(lio: LioOperatorAgent, management?: ManagementCycle): TelegramBot | null {
  if (!config.telegram.lioBotToken) return null;
  const bot = new TelegramBot(config.telegram.lioBotToken, { polling: true });
  new CommandHandler(bot, lio, management).register(bot);

  const status = getTelegramStatus();
  if (status !== "configured") {
    // Polling still works for direct replies; configured chat ID is only needed for proactive reports.
    logger.warn({ status }, "Telegram proactive report target is not configured");
  }

  return bot;
}
