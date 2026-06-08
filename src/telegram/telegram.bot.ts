import TelegramBot from "node-telegram-bot-api";
import { LioOperatorAgent } from "../agents/lio-operator.agent.js";
import { config, getTelegramStatus } from "../config.js";
import { CommandHandler } from "./command-handler.js";

export function createTelegramBot(lio: LioOperatorAgent): TelegramBot | null {
  if (!config.telegram.lioBotToken) return null;
  const bot = new TelegramBot(config.telegram.lioBotToken, { polling: true });
  new CommandHandler(bot, lio).register(bot);

  const status = getTelegramStatus();
  if (status !== "configured") {
    // Polling still works for direct replies; configured chat ID is only needed for proactive reports.
    console.warn(`Telegram proactive report target is not configured: ${status}`);
  }

  return bot;
}
