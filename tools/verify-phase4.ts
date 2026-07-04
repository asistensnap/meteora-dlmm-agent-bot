/* Temporary Phase 4 verification script — run with tsx, then delete. */
import { config } from "../src/config.js";
import { LioOperatorAgent } from "../src/agents/lio-operator.agent.js";
import { initDb, openDb } from "../src/database/db.js";

initDb();
import { KillSwitchService } from "../src/positions/kill-switch.js";
import { ManagementCycle } from "../src/positions/management-cycle.js";
import type { NetPnlTracker, PositionNetStatus } from "../src/positions/position-tracker.js";
import { PositionsRepository } from "../src/positions/positions.repo.js";
import { PaperTradingService } from "../src/paper/paper-trading.js";
import { heronBreakdownWatch } from "../src/strategy/heron-strategy.js";
import { startupReconciliation } from "../src/positions/reconciliation.js";

const failures: string[] = [];
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

// 1. Safety invariants
check("EXECUTION_MODE is SCANNER_ONLY", config.execution.mode === "SCANNER_ONLY", config.execution.mode);
check("enableRealExecution is false", config.execution.enableRealExecution === false);
check("meridian dryRun is true", config.meridian.dryRun === true);
check("strategy profile is HERON (env for this test)", config.strategy.profile === "HERON");

// 2. Dummy workflow carries both strategies
const lio = new LioOperatorAgent();
const workflow = lio.workflowMessages();
check("workflow analyst JSON includes HERON strategyName", workflow.analyst.includes('"strategyName": "HERON Strategy"'));
check("workflow analyst JSON includes durability fields", workflow.analyst.includes('"volume1hActive"') && workflow.analyst.includes('"rangeDurabilityOk"'));
check("workflow analyst JSON includes netCheck hurdle", workflow.analyst.includes('"expectedNetBeatsVaultHurdle"'));
check("workflow analyst JSON includes breakdownWatch", workflow.analyst.includes('"breakdownWatch"'));
check("workflow result exists (dummy, no on-chain)", workflow.result.includes("Dummy workflow test only."));
check("EvilPanda rules prompt renders", lio.evilPandaStrategy().includes("EvilPanda Strategy"));
check("HERON rules prompt renders", lio.heronStrategy().includes("HERON Strategy") && lio.heronStrategy().includes("kill-switch"));

// 3. Seed a paper position + losing net history, then kill-switch must engage
const repo = new PositionsRepository();
const db = openDb();
db.prepare(`
  INSERT INTO paper_positions (entry_timestamp, pool_address, pair, strategy, range_recommendation, score_at_entry, confidence_at_entry, status, notes)
  VALUES (?, 'VERIFY_POOL', 'VERIFY/SOL', 'BID_ASK', 'WIDE', 80, 80, 'OPEN', 'phase 4 verification only')
`).run(new Date(Date.now() - 13 * 3_600_000).toISOString());
const positionId = Number(db.prepare("SELECT last_insert_rowid() AS id").get()!.id);
db.close();

const now = new Date();
repo.initTracking(positionId, 1.0, 1000, now.toISOString());
repo.appendHistory({ positionId, timestamp: new Date(now.getTime() - 60_000).toISOString(), feesEarnedUsd: 0, ilUsd: 0, netUsd: 0, netPct: 0, inRange: true, currentPrice: 1 });
repo.appendHistory({ positionId, timestamp: now.toISOString(), feesEarnedUsd: 10, ilUsd: 160, netUsd: -150, netPct: -15, inRange: false, currentPrice: 0.7 });

const killSwitch = new KillSwitchService(repo);
const evaluation = killSwitch.evaluate();
check("kill-switch engages on simulated -15% daily drawdown", evaluation.engaged && evaluation.justEngaged, `drawdown=${evaluation.dailyDrawdownPct.toFixed(2)}%`);

// 4. Paper trading blocked while engaged
const paper = new PaperTradingService(killSwitch);
const blocked = paper.createPositions(
  [{ poolAddress: "X", pair: "X/SOL", score: 90, classification: "HIGH_PRIORITY", risk: "MEDIUM", localStrategy: "SPOT", tvl: 1, volume24h: 1, fee24h: 1, feeTvl24h: 1, apr24h: 1, binStep: 100, volumeTvlRatio: 1, poolAgeHours: 24, raw: {} }],
  { agent: "Claude Analyst Agent", timestamp: now.toISOString(), results: [{ poolAddress: "X", pair: "X/SOL", decision: "ENTER_SMALL", strategy: "SPOT", range: "MEDIUM", maxAllocation: "2%", mainReason: "t", exitRule: "t", confidence: 99 }], bestPool: "X", safestPool: "X", highestFeeOpportunity: "X", avoidList: [], summary: "t" }
);
check("kill-switch blocks new paper positions", blocked === 0);

// 5. OOR alert path reachable (stubbed tracker) + HERON breakdown flags in alert
const oorStatus: PositionNetStatus = {
  positionId, pair: "VERIFY/SOL", poolAddress: "VERIFY_POOL", strategy: "BID_ASK",
  entryTimestamp: new Date(Date.now() - 13 * 3_600_000).toISOString(),
  notionalUsd: 1000, feesEarnedUsd: 10, ilUsd: 160, netUsd: -150, netPct: -15,
  inRange: false, oorDirection: "DOWN", oorSince: now.toISOString(), oorMinutes: 120, dataStatus: "OK"
};
const trackerStub = {
  runCycle: async () => ({ timestamp: now.toISOString(), positions: [oorStatus], newOorAlerts: [{ positionId, pair: "VERIFY/SOL", direction: "DOWN" as const, oorSince: now.toISOString(), oorMinutes: 0 }], dataMissingCount: 0 }),
  latestStatuses: () => [oorStatus]
} as unknown as NetPnlTracker;
const cycle = new ManagementCycle(trackerStub, killSwitch);
const sent: Array<{ topic: string; message: string }> = [];
await cycle.tick(async (topic, message) => { sent.push({ topic, message }); });
const oorAlert = sent.find((s) => s.message.includes("OUT-OF-RANGE ALERT"));
check("OOR alert emitted to ENTRY topic", Boolean(oorAlert) && oorAlert!.topic === "ENTRY");
check("OOR alert includes direction and since", Boolean(oorAlert?.message.includes("downward")) && Boolean(oorAlert?.message.includes("Out of range since")));
check("OOR alert includes HERON breakdown watch", Boolean(oorAlert?.message.includes("HERON breakdown watch:")));

// 6. HERON breakdown flags from net/OOR/time inputs
const flags = heronBreakdownWatch(oorStatus, oorStatus.entryTimestamp);
check("breakdown watch flags NET_STOP_HIT", flags.includes("NET_STOP_HIT"), flags.join(","));
check("breakdown watch flags STUCK_OUT_OF_RANGE", flags.includes("STUCK_OUT_OF_RANGE"));
check("breakdown watch flags TIME_STOP_HIT (13h held, net negative)", flags.includes("TIME_STOP_HIT"));

// 7. /positions_net message and kill-switch status/reset
const netMessage = cycle.positionsNetMessage();
check("/positions_net shows net = fees - IL", netMessage.includes("Net: $-150.00"), netMessage.split("\n")[2]);
check("/positions_net shows kill-switch engaged", netMessage.includes("Kill-switch ENGAGED"));
console.log("\n--- /positions_net output ---\n" + netMessage + "\n---\n");
const resetMessage = cycle.killSwitchReset();
check("kill-switch manual reset works", resetMessage.includes("reset") && !killSwitch.isEngaged());

// 8. Startup reconciliation (read-only; Meteora API may be unreachable — both outcomes valid)
const reconciliation = await startupReconciliation(repo);
check("reconciliation runs read-only", reconciliation.onChainChecked === false && reconciliation.localOpenCount >= 1, `${reconciliation.driftNotes.length} notes`);

console.log(failures.length === 0 ? "\nALL CHECKS PASSED" : `\n${failures.length} FAILURES: ${failures.join("; ")}`);
process.exit(failures.length === 0 ? 0 : 1);
