import type TelegramBot from "node-telegram-bot-api";
import { LioOperatorAgent } from "../agents/lio-operator.agent.js";
import { ManagementCycle } from "../positions/management-cycle.js";
import { formatTroubleshootReport } from "./troubleshoot.js";
import { TopicRouter } from "./topic-router.js";

export class CommandHandler {
  private readonly router: TopicRouter;

  constructor(
    bot: TelegramBot,
    private readonly lio: LioOperatorAgent,
    private readonly management: ManagementCycle = new ManagementCycle()
  ) {
    this.router = new TopicRouter(bot);
  }

  register(bot: TelegramBot): void {
    bot.onText(/^\/start$/, async (msg) => {
      await this.handle(msg.chat.id, "/start", () => this.router.sendToTopic("OPERATOR", this.lio.startMessage(), msg.chat.id));
    });

    bot.onText(/^\/status$/, async (msg) => {
      await this.handle(msg.chat.id, "/status", () => this.router.sendToTopic("SYSTEM", this.lio.status(), msg.chat.id));
    });

    bot.onText(/^\/ping$/, async (msg) => {
      await this.handle(msg.chat.id, "/ping", () => this.router.sendToTopic("SYSTEM", this.lio.ping(), msg.chat.id));
    });

    bot.onText(/^\/ping_all$/, async (msg) => {
      await this.handle(msg.chat.id, "/ping_all", () => this.router.sendToTopic("SYSTEM", this.lio.pingAll(), msg.chat.id));
    });

    bot.onText(/^\/modelcheck$/, async (msg) => {
      await this.handle(msg.chat.id, "/modelcheck", () => this.router.sendToTopic("SYSTEM", this.lio.modelcheck(), msg.chat.id));
    });

    bot.onText(/^\/topiccheck$/, async (msg) => {
      await this.handle(msg.chat.id, "/topiccheck", () => this.router.sendToTopic("SYSTEM", this.lio.topiccheck(), msg.chat.id));
    });

    bot.onText(/^\/health$/, async (msg) => {
      await this.handle(msg.chat.id, "/health", () => this.router.sendToTopic("SYSTEM", this.lio.pingAll(), msg.chat.id));
    });

    bot.onText(/^\/doctor$/, async (msg) => {
      await this.handle(msg.chat.id, "/doctor", () => this.router.sendToTopic("SYSTEM", this.lio.pingAll(), msg.chat.id));
    });

    bot.onText(/^\/telegramcheck$/, async (msg) => {
      await this.handle(msg.chat.id, "/telegramcheck", () => this.router.sendToTopic("SYSTEM", this.lio.topiccheck(), msg.chat.id));
    });

    bot.onText(/^\/deepseekcheck$/, async (msg) => {
      await this.handle(msg.chat.id, "/deepseekcheck", () => this.router.sendToTopic("SYSTEM", this.lio.modelcheck(), msg.chat.id));
    });

    bot.onText(/^\/claudecheck$/, async (msg) => {
      await this.handle(msg.chat.id, "/claudecheck", () => this.router.sendToTopic("SYSTEM", this.lio.modelcheck(), msg.chat.id));
    });

    bot.onText(/^\/hermescheck$/, async (msg) => {
      await this.handle(msg.chat.id, "/hermescheck", () => this.router.sendToTopic("SYSTEM", this.lio.pingAll(), msg.chat.id));
    });

    bot.onText(/^\/meteora_check$/, async (msg) => {
      await this.handle(msg.chat.id, "/meteora_check", () => this.router.sendToTopic("SYSTEM", "📡 System Status\nMeteora: READY\nMeteora API: configured but NOT_CONNECTED_IN_DUMMY_WORKFLOW\nReal scan is not enabled yet.", msg.chat.id));
    });

    bot.onText(/^\/envcheck$/, async (msg) => {
      await this.handle(msg.chat.id, "/envcheck", () => this.router.sendToTopic("SYSTEM", this.lio.envcheck(), msg.chat.id));
    });

    bot.onText(/^\/troubleshoot$/, async (msg) => {
      await this.handle(msg.chat.id, "/troubleshoot", () => this.router.sendToTopic("TROUBLESHOOT", this.lio.troubleshoot(), msg.chat.id));
    });

    bot.onText(/^\/scan_test$/, async (msg) => {
      await this.handle(msg.chat.id, "/scan_test", async () => {
        await this.router.sendToTopic("OPERATOR", "Operator Update\nAgent: Lio\nModel: DeepSeek\nStatus: /scan_test received. Calling Cala dummy screening.", msg.chat.id);
        await this.router.sendToTopic("SCREENING", this.lio.screeningResultMessage(), msg.chat.id);
        await this.router.sendToTopic("OPERATOR", "Operator Update\nAgent: Lio\nStatus: Cala dummy screening posted to 🔎 Screening.", msg.chat.id);
      });
    });

    bot.onText(/^\/workflow_test$/, async (msg) => {
      await this.handle(msg.chat.id, "/workflow_test", async () => {
        const workflow = this.lio.workflowMessages();
        await this.router.sendToTopic("OPERATOR", workflow.operatorStart, msg.chat.id);
        if (workflow.screening) await this.router.sendToTopic("SCREENING", workflow.screening, msg.chat.id);
        if (workflow.analyst) await this.router.sendToTopic("ANALYST", workflow.analyst, msg.chat.id);
        if (workflow.result) await this.router.sendToTopic("RESULT", workflow.result, msg.chat.id);
        if (workflow.troubleshoot) await this.router.sendToTopic("TROUBLESHOOT", workflow.troubleshoot, msg.chat.id);
        await this.router.sendToTopic("OPERATOR", workflow.operatorSummary, msg.chat.id);
      });
    });

    bot.onText(/^\/scan_now$/, async (msg) => {
      await this.handle(msg.chat.id, "/scan_now", async () => {
        await this.router.sendToTopic("OPERATOR", "Operator Update\nAgent: Lio\nStatus: /scan_now received. Real Meteora scan is not enabled yet; use /workflow_test for dummy routing.", msg.chat.id);
        await this.router.sendToTopic("SCREENING", this.lio.screeningResultMessage(), msg.chat.id);
        const workflow = this.lio.workflowMessages();
        if (workflow.analyst) await this.router.sendToTopic("ANALYST", workflow.analyst, msg.chat.id);
        if (workflow.result) await this.router.sendToTopic("RESULT", workflow.result, msg.chat.id);
      });
    });

    bot.onText(/^\/top_pools$/, async (msg) => {
      await this.handle(msg.chat.id, "/top_pools", () => this.router.sendToTopic("RESULT", "📊 Final DLMM Result\n\nTop pools are not connected yet. Use /workflow_test for dummy output.", msg.chat.id));
    });

    bot.onText(/^\/watchlist$/, async (msg) => {
      await this.handle(msg.chat.id, "/watchlist", () => this.router.sendToTopic("RESULT", "📊 Final DLMM Result\n\nWatchlist is not connected yet. Use /workflow_test for dummy output.", msg.chat.id));
    });

    bot.onText(/^\/paper_on$/, async (msg) => {
      await this.handle(msg.chat.id, "/paper_on", () => this.router.sendToTopic("OPERATOR", "Operator Update\nAgent: Lio\nStatus: Paper trading flag should be enabled through PAPER_TRADING=true.", msg.chat.id));
    });

    bot.onText(/^\/paper_off$/, async (msg) => {
      await this.handle(msg.chat.id, "/paper_off", () => this.router.sendToTopic("OPERATOR", "Operator Update\nAgent: Lio\nStatus: Paper trading flag should be disabled through PAPER_TRADING=false.", msg.chat.id));
    });

    bot.onText(/^\/performance$/, async (msg) => {
      await this.handle(msg.chat.id, "/performance", () => this.router.sendToTopic("RESULT", "📊 Final DLMM Result\n\nPaper performance is not connected yet.", msg.chat.id));
    });

    bot.onText(/^\/trade_log$/, async (msg) => {
      await this.handle(msg.chat.id, "/trade_log", () => this.router.sendToTopic("TRADE_LOG", this.lio.tradeLog(), msg.chat.id));
    });

    bot.onText(/^\/trade_summary$/, async (msg) => {
      await this.handle(msg.chat.id, "/trade_summary", () => this.router.sendToTopic("TRADE_LOG", this.lio.tradeSummary(), msg.chat.id));
    });

    bot.onText(/^\/trade_log_test$/, async (msg) => {
      await this.handle(msg.chat.id, "/trade_log_test", () => this.router.sendToTopic("TRADE_LOG", this.lio.tradeLogTest(), msg.chat.id));
    });

    bot.onText(/^\/evilpanda_strategy$/, async (msg) => {
      await this.handle(msg.chat.id, "/evilpanda_strategy", () => this.router.sendToTopic("SYSTEM", this.lio.evilPandaStrategy(), msg.chat.id));
    });

    bot.onText(/^\/positions_net$/, async (msg) => {
      await this.handle(msg.chat.id, "/positions_net", () => this.router.sendToTopic("TRADE_LOG", this.management.positionsNetMessage(), msg.chat.id));
    });

    bot.onText(/^\/killswitch_status$/, async (msg) => {
      await this.handle(msg.chat.id, "/killswitch_status", () => this.router.sendToTopic("SYSTEM", this.management.killSwitchStatus(), msg.chat.id));
    });

    bot.onText(/^\/killswitch_reset$/, async (msg) => {
      await this.handle(msg.chat.id, "/killswitch_reset", () => this.router.sendToTopic("SYSTEM", this.management.killSwitchReset(), msg.chat.id));
    });

    bot.onText(/^\/execution_mode$/, async (msg) => {
      await this.handle(msg.chat.id, "/execution_mode", () => this.router.sendToTopic("ENTRY", this.lio.entryStatus(), msg.chat.id));
    });

    bot.onText(/^\/set_mode(?:\s+(\S+))?$/, async (msg) => {
      await this.handle(msg.chat.id, "/set_mode", () => this.router.sendToTopic("ENTRY", `${this.lio.entryStatus()}\n\nRequested mode: ${msg.text?.split(/\s+/)[1] ?? "missing"}\nMode changes are placeholders in this topic architecture pass.`, msg.chat.id));
    });

    bot.onText(/^\/entry_plans$/, async (msg) => this.handle(msg.chat.id, "/entry_plans", () => this.router.sendToTopic("ENTRY", this.lio.entryStatus(), msg.chat.id)));
    bot.onText(/^\/approve_entry(?:\s+\S+)?$/, async (msg) => this.handle(msg.chat.id, "/approve_entry", () => this.router.sendToTopic("ENTRY", "Entry Status\nApproval command received.\nReal execution remains disabled.", msg.chat.id)));
    bot.onText(/^\/reject_entry(?:\s+\S+)?$/, async (msg) => this.handle(msg.chat.id, "/reject_entry", () => this.router.sendToTopic("ENTRY", "Entry Status\nReject command received.\nNo real execution occurred.", msg.chat.id)));
    bot.onText(/^\/positions$/, async (msg) => this.handle(msg.chat.id, "/positions", () => this.router.sendToTopic("ENTRY", "Entry Status\nNo real or paper positions connected in this topic pass.", msg.chat.id)));
    bot.onText(/^\/emergency_stop$/, async (msg) => {
      await this.handle(msg.chat.id, "/emergency_stop", async () => {
        await this.router.sendToTopic("ENTRY", "Entry Status\nEmergency stop command received.\nReal execution is disabled.", msg.chat.id);
        await this.router.sendToTopic("SYSTEM", "📡 System Status\nEmergency stop noted.\nAuto entry disabled.", msg.chat.id);
      });
    });
    bot.onText(/^\/resume_execution$/, async (msg) => {
      await this.handle(msg.chat.id, "/resume_execution", async () => {
        await this.router.sendToTopic("ENTRY", "Entry Status\nResume execution command received.\nReal execution remains disabled.", msg.chat.id);
        await this.router.sendToTopic("SYSTEM", "📡 System Status\nResume execution noted.\nAuto entry disabled.", msg.chat.id);
      });
    });
  }

  private async handle(chatId: number, command: string, action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (error) {
      const report = formatTroubleshootReport({
        command,
        agent: "Lio",
        step: "command handler",
        error,
        suggestedFix: "Check TELEGRAM_CHAT_ID, topic IDs, bot admin permissions, env values, and dependency installation."
      });
      await this.router.sendToTopic("TROUBLESHOOT", report, chatId);
      await this.router.sendToTopic("OPERATOR", `Operator Update\nAgent: Lio\nStatus: Command failed\nCommand: ${command}\nSee 🛠 Troubleshoot.`, chatId);
    }
  }
}
