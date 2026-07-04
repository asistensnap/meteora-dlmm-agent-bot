import { LioOperatorAgent } from "./agents/lio-operator.agent.js";
import { getTelegramStatus } from "./config.js";
import { ManagementCycle } from "./positions/management-cycle.js";
import { formatReconciliationReport, startupReconciliation } from "./positions/reconciliation.js";
import { createTelegramBot } from "./telegram/telegram.bot.js";
import { TopicRouter } from "./telegram/topic-router.js";
import { logger } from "./utils/logger.js";

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "uncaught exception");
  process.exitCode = 1;
});

async function main(): Promise<void> {
  const lio = new LioOperatorAgent();

  if (process.argv.includes("--scan-once")) {
    logger.info({ report: lio.workflowTest() }, "dummy workflow test complete");
    return;
  }

  const management = new ManagementCycle();
  const bot = createTelegramBot(lio, management);
  if (!bot) {
    logger.warn({ telegramStatus: getTelegramStatus() }, "Lio Telegram bot not started; configure LIO_TELEGRAM_BOT_TOKEN or existing TELEGRAM_BOT_TOKEN");
    logger.info(lio.startMessage());
    const report = await startupReconciliation();
    logger.info({ report }, "startup reconciliation (no Telegram bot)");
    return;
  }

  bot.on("polling_error", (error) => {
    logger.error({ err: error }, "Telegram polling error");
  });

  const router = new TopicRouter(bot);
  management.start((topic, message) => router.sendToTopic(topic, message));

  try {
    const report = await startupReconciliation();
    if (report.driftNotes.length > 0 || report.localOpenCount > 0) {
      await router.sendToTopic("SYSTEM", formatReconciliationReport(report));
    }
  } catch (error) {
    logger.error({ err: error }, "startup reconciliation failed");
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "shutting down: stopping management cycle and Telegram polling");
    management.stop();
    try {
      await bot.stopPolling();
    } catch (error) {
      logger.error({ err: error }, "error while stopping Telegram polling");
    }
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  logger.info("Lio Telegram bot started for initial dummy workflow commands");
}

main().catch((error) => {
  logger.error({ err: error }, "fatal startup error");
  process.exitCode = 1;
});
