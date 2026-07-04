import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { KillSwitchService } from "./kill-switch.js";
import { NetPnlTracker, type PositionNetStatus } from "./position-tracker.js";

export type AlertSender = (topic: "ENTRY" | "SYSTEM" | "TRADE_LOG", message: string) => Promise<unknown>;

/**
 * Periodic management cycle for scanner/dry-run mode: updates simulated net
 * PnL for open paper positions, raises out-of-range alerts, and evaluates the
 * daily kill-switch. Overlap-guarded; never performs any on-chain action.
 */
export class ManagementCycle {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly tracker = new NetPnlTracker(),
    private readonly killSwitch = new KillSwitchService()
  ) {}

  start(sendAlert?: AlertSender): void {
    if (!config.positions.managementCycleEnabled) {
      logger.info("management cycle disabled via MANAGEMENT_CYCLE_ENABLED=false");
      return;
    }
    const intervalMs = config.positions.managementIntervalMinutes * 60_000;
    this.timer = setInterval(() => void this.tick(sendAlert), intervalMs);
    logger.info({ intervalMinutes: config.positions.managementIntervalMinutes }, "management cycle started (simulated net-PnL, OOR alerts, kill-switch)");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async tick(sendAlert?: AlertSender): Promise<void> {
    if (this.running) {
      logger.warn("management cycle tick skipped; previous tick still running");
      return;
    }
    this.running = true;
    try {
      const report = await this.tracker.runCycle();

      for (const oor of report.newOorAlerts) {
        const message = [
          "⚠️ OUT-OF-RANGE ALERT (simulated)",
          "",
          `Position: #${oor.positionId} ${oor.pair}`,
          `Direction: price left range ${oor.direction === "UP" ? "upward (above entry band)" : "downward (below band floor)"}`,
          `Out of range since: ${oor.oorSince}`,
          "",
          "OOR = stopped position, not a neutral state.",
          "No on-chain action taken (scanner mode)."
        ].join("\n");
        logger.warn({ positionId: oor.positionId, direction: oor.direction }, "position out of range");
        if (sendAlert) await sendAlert("ENTRY", message);
      }

      const evaluation = this.killSwitch.evaluate();
      if (evaluation.justEngaged && sendAlert) {
        await sendAlert("SYSTEM", [
          "🛑 DAILY KILL-SWITCH ENGAGED (simulated)",
          "",
          evaluation.reason ?? "Daily drawdown threshold exceeded.",
          "",
          "New positions are blocked.",
          "Recommendation: CLOSE-ALL open positions (manual review required).",
          "Reset with /killswitch_reset after review.",
          "No on-chain action taken (scanner mode)."
        ].join("\n"));
      }
    } catch (error) {
      logger.error({ err: error }, "management cycle tick failed");
    } finally {
      this.running = false;
    }
  }

  positionsNetMessage(): string {
    const statuses = this.tracker.latestStatuses();
    if (statuses.length === 0) {
      return [
        "Net PnL Positions",
        "",
        "No OPEN paper positions tracked.",
        "Net PnL tracking is simulated in scanner mode (fees est minus IL est)."
      ].join("\n");
    }
    return [
      "Net PnL Positions (simulated)",
      "",
      ...statuses.map(formatStatus),
      "",
      "Net = fees earned (est) - impermanent/conversion loss (est).",
      "Fee count alone is not profit.",
      this.killSwitch.isEngaged() ? "🛑 Kill-switch ENGAGED: new positions blocked." : "Kill-switch armed."
    ].join("\n");
  }

  killSwitchStatus(): string {
    return this.killSwitch.status();
  }

  killSwitchReset(): string {
    return this.killSwitch.reset();
  }

  /** True when opening new (paper) positions is currently allowed. */
  canOpenPositions(): boolean {
    return !this.killSwitch.isEngaged();
  }
}

function formatStatus(status: PositionNetStatus): string {
  const oor = status.inRange
    ? "IN_RANGE"
    : `OUT_OF_RANGE${status.oorMinutes !== undefined ? ` for ${status.oorMinutes}m` : ""}`;
  return [
    `#${status.positionId} ${status.pair} [${status.strategy}]`,
    `  Fees est: $${status.feesEarnedUsd.toFixed(2)} | IL est: $${status.ilUsd.toFixed(2)} | Net: $${status.netUsd.toFixed(2)} (${status.netPct.toFixed(2)}%)`,
    `  Range: ${oor}${status.dataStatus !== "OK" ? ` | Data: ${status.dataStatus}` : ""}`
  ].join("\n");
}
