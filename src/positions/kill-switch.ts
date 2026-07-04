import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { nowIso } from "../utils/time.js";
import { PositionsRepository } from "./positions.repo.js";

const KEY_ENGAGED = "killswitch_engaged";
const KEY_ENGAGED_AT = "killswitch_engaged_at";
const KEY_REASON = "killswitch_reason";

export interface KillSwitchEvaluation {
  engaged: boolean;
  justEngaged: boolean;
  dailyNetUsd: number;
  dailyDrawdownPct: number;
  maxDailyDrawdownPct: number;
  baseNotionalUsd: number;
  reason?: string;
}

/**
 * Daily kill-switch (simulated in scanner/dry-run mode). When cumulative net
 * drawdown across positions exceeds maxDailyDrawdownPct, new position opening
 * is blocked, CLOSE-ALL is flagged as a recommendation, and a manual
 * /killswitch_reset is required. It never executes anything on-chain.
 */
export class KillSwitchService {
  constructor(private readonly repo = new PositionsRepository()) {}

  isEngaged(): boolean {
    return this.repo.getSetting(KEY_ENGAGED) === "true";
  }

  status(): string {
    const engaged = this.isEngaged();
    const evaluation = this.evaluateDrawdown();
    return [
      "Kill-Switch Status (simulated, scanner mode)",
      "",
      `State: ${engaged ? "ENGAGED" : "ARMED"}`,
      engaged ? `Engaged at: ${this.repo.getSetting(KEY_ENGAGED_AT) ?? "unknown"}` : "",
      engaged ? `Reason: ${this.repo.getSetting(KEY_REASON) ?? "unknown"}` : "",
      `Today net (est): $${evaluation.dailyNetUsd.toFixed(2)}`,
      `Today drawdown: ${evaluation.dailyDrawdownPct.toFixed(2)}% of $${evaluation.baseNotionalUsd.toFixed(0)} base`,
      `Threshold: ${evaluation.maxDailyDrawdownPct}%`,
      engaged ? "New positions blocked. Recommendation: CLOSE-ALL (manual review). Reset with /killswitch_reset." : "New positions allowed."
    ].filter(Boolean).join("\n");
  }

  /** Evaluate current daily drawdown and engage the switch if the threshold is crossed. */
  evaluate(): KillSwitchEvaluation {
    const evaluation = this.evaluateDrawdown();
    if (evaluation.engaged) return { ...evaluation, justEngaged: false };

    if (evaluation.dailyDrawdownPct >= config.positions.maxDailyDrawdownPct) {
      const reason = `Daily net drawdown ${evaluation.dailyDrawdownPct.toFixed(2)}% >= maxDailyDrawdownPct ${config.positions.maxDailyDrawdownPct}%`;
      this.repo.setSetting(KEY_ENGAGED, "true");
      this.repo.setSetting(KEY_ENGAGED_AT, nowIso());
      this.repo.setSetting(KEY_REASON, reason);
      logger.warn({ dailyNetUsd: evaluation.dailyNetUsd, dailyDrawdownPct: evaluation.dailyDrawdownPct }, "kill-switch ENGAGED (simulated)");
      return { ...evaluation, engaged: true, justEngaged: true, reason };
    }
    return { ...evaluation, justEngaged: false };
  }

  reset(): string {
    if (!this.isEngaged()) return "Kill-switch is not engaged; nothing to reset.";
    this.repo.setSetting(KEY_ENGAGED, "false");
    this.repo.deleteSetting(KEY_REASON);
    logger.info("kill-switch manually reset");
    return "Kill-switch reset. New positions are allowed again. Review what caused the drawdown before resuming.";
  }

  private evaluateDrawdown(): KillSwitchEvaluation {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayStartIso = dayStart.toISOString();

    const openDelta = this.repo.dailyNetDeltaUsd(dayStartIso);
    const closedPnl = this.repo.closedPnlUsdSince(dayStartIso);
    const dailyNetUsd = openDelta + closedPnl;
    const baseNotionalUsd = Math.max(this.repo.totalOpenNotionalUsd(), config.positions.paperNotionalUsd);
    const dailyDrawdownPct = dailyNetUsd < 0 ? (Math.abs(dailyNetUsd) / baseNotionalUsd) * 100 : 0;

    return {
      engaged: this.isEngaged(),
      justEngaged: false,
      dailyNetUsd,
      dailyDrawdownPct,
      maxDailyDrawdownPct: config.positions.maxDailyDrawdownPct,
      baseNotionalUsd
    };
  }
}
