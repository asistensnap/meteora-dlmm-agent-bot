import { LioOperatorAgent } from "./agents/lio-operator.agent.js";
import { getTelegramStatus } from "./config.js";
import { createTelegramBot } from "./telegram/telegram.bot.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  const lio = new LioOperatorAgent();

  if (process.argv.includes("--scan-once")) {
    logger.info({ report: lio.workflowTest() }, "dummy workflow test complete");
    return;
  }

  const bot = createTelegramBot(lio);
  if (!bot) {
    logger.warn({ telegramStatus: getTelegramStatus() }, "Lio Telegram bot not started; configure LIO_TELEGRAM_BOT_TOKEN or existing TELEGRAM_BOT_TOKEN");
    logger.info(lio.startMessage());
    return;
  }

  logger.info("Lio Telegram bot started for initial dummy workflow commands");
}

main().catch((error) => {
  logger.error({ err: error }, "fatal startup error");
  process.exitCode = 1;
});
