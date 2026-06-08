import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const preset = process.argv[2] || "moderate";
const presets = {
  safe: {
    strategy: "SPOT",
    timeframe: "24h",
    minTvl: 20000,
    minVolume24h: 50000,
    minFeeTvlRatio24h: 0.005,
    minPoolAgeHours: 24,
    alertScoreThreshold: 75,
    maxClaudePoolCount: 3,
    maxAlertsPerScan: 2,
    screeningIntervalMinutes: 60,
    managementIntervalMinutes: 15,
    tokenRiskMode: "CONSERVATIVE"
  },
  moderate: {
    strategy: "BID_ASK",
    timeframe: "4h",
    minTvl: 10000,
    minVolume24h: 25000,
    minFeeTvlRatio24h: 0.004,
    minPoolAgeHours: 12,
    alertScoreThreshold: 70,
    maxClaudePoolCount: 5,
    maxAlertsPerScan: 3,
    screeningIntervalMinutes: 30,
    managementIntervalMinutes: 10,
    tokenRiskMode: "BALANCED"
  },
  degen: {
    strategy: "BID_ASK",
    timeframe: "30m",
    minTvl: 5000,
    minVolume24h: 10000,
    minFeeTvlRatio24h: 0.003,
    minPoolAgeHours: 6,
    alertScoreThreshold: 65,
    maxClaudePoolCount: 5,
    maxAlertsPerScan: 3,
    screeningIntervalMinutes: 15,
    managementIntervalMinutes: 5,
    tokenRiskMode: "AGGRESSIVE"
  }
};

if (!presets[preset]) {
  console.error(`Unknown preset: ${preset}. Use safe, moderate, or degen.`);
  process.exit(1);
}

const config = {
  enabled: true,
  preset,
  dryRun: true,
  liveExecutionEnabled: false,
  telegramGatewayAgent: "Lio",
  agents: {
    lio: { profile: "telegram-lio", modelRole: "operator" },
    cala: { profile: "telegram-cala", modelRole: "screening" },
    konlin: { profile: "telegram-konlin", modelRole: "analyst" }
  },
  screening: presets[preset],
  notes: [
    "Meridian-safe configuration imported from Meridian concepts.",
    "Wallet/private-key/live execution are disabled in this Meteora DLMM project.",
    "Existing Lio/Cala/Konlin bots are reused; no new Telegram bot is required."
  ]
};

const file = resolve("config", "meridian-safe.config.json");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`Meridian-safe config written: ${file}`);
console.log("DRY_RUN=true, liveExecutionEnabled=false. No wallet/private-key config was created.");
