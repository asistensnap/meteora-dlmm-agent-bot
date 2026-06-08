import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(PROJECT_DIR, ".env") });
const MERIDIAN_DIR = resolveMeridianDir();
const PROJECT_ENV = path.join(PROJECT_DIR, ".env");
const HERMES_LIO_ENV = path.join(process.env.LOCALAPPDATA || "", "hermes", "profiles", "telegram-lio", ".env");
const HERMES_ROOT_ENV = path.join(process.env.LOCALAPPDATA || "", "hermes", ".env");
const MERIDIAN_ENV = path.join(MERIDIAN_DIR, ".env");
const MERIDIAN_CONFIG = path.join(MERIDIAN_DIR, "user-config.json");

const mode = process.argv.includes("--live") ? "live" : "dry-run";
const existingMeridianEnv = readEnv(MERIDIAN_ENV);
const merged = {
  ...readEnv(HERMES_ROOT_ENV),
  ...readEnv(HERMES_LIO_ENV),
  ...readEnv(PROJECT_ENV),
  ...existingMeridianEnv
};

const requiredForLive = ["WALLET_PRIVATE_KEY", "RPC_URL", "OPENROUTER_API_KEY", "HELIUS_API_KEY"];
const missingLive = requiredForLive.filter((key) => !nonEmpty(merged[key]));
const liveReady = missingLive.length === 0;
const dryRun = mode === "live" && liveReady ? "false" : "true";

writeEnv(MERIDIAN_ENV, {
  WALLET_PRIVATE_KEY: existingMeridianEnv.WALLET_PRIVATE_KEY || "",
  RPC_URL: first(merged.RPC_URL, ""),
  OPENROUTER_API_KEY: first(merged.OPENROUTER_API_KEY, ""),
  HELIUS_API_KEY: first(merged.HELIUS_API_KEY, ""),
  LPAGENT_API_KEY: first(merged.LPAGENT_API_KEY, ""),
  TELEGRAM_BOT_TOKEN: first(merged.LIO_TELEGRAM_BOT_TOKEN, merged.TELEGRAM_BOT_TOKEN, ""),
  TELEGRAM_CHAT_ID: first(merged.TELEGRAM_GROUP_CHAT_ID, "-1003955269762"),
  TELEGRAM_ALLOWED_USER_IDS: first(merged.TELEGRAM_ALLOWED_USERS, "1186081518"),
  DRY_RUN: dryRun,
  LOG_LEVEL: "info",
  ALLOW_SELF_UPDATE: "false"
});

const userConfig = {
  preset: "evilpanda-full-auto-small",
  dryRun: dryRun === "true",
  deployAmountSol: 0.1,
  maxDeployAmount: 0.15,
  maxPositions: 1,
  minSolToOpen: 0.2,
  gasReserve: 0.08,
  positionSizePct: 0.1,
  strategy: "bid_ask",
  minBinsBelow: 35,
  maxBinsBelow: 69,
  defaultBinsBelow: 69,
  timeframe: "30m",
  category: "trending",
  excludeHighSupplyConcentration: true,
  minTvl: 10000,
  maxTvl: 150000,
  minVolume: 1000000,
  minOrganic: 60,
  minQuoteOrganic: 60,
  minHolders: 300,
  minMcap: 250000,
  maxMcap: 10000000,
  minBinStep: 80,
  maxBinStep: 125,
  minFeeActiveTvlRatio: 0.15,
  minTokenFeesSol: 30,
  useDiscordSignals: false,
  discordSignalMode: "merge",
  avoidPvpSymbols: true,
  blockPvpSymbols: false,
  maxBotHoldersPct: 30,
  maxTop10Pct: 30,
  minTokenAgeHours: null,
  maxTokenAgeHours: null,
  minClaimAmount: 5,
  autoSwapAfterClaim: false,
  outOfRangeBinsToClose: 10,
  outOfRangeWaitMinutes: 30,
  minVolumeToRebalance: 1000,
  stopLossPct: -20,
  takeProfitPct: 5,
  minFeePerTvl24h: 7,
  minAgeBeforeYieldCheck: 60,
  trailingTakeProfit: true,
  trailingTriggerPct: 3,
  trailingDropPct: 1.5,
  pnlSanityMaxDiffPct: 5,
  solMode: true,
  managementIntervalMin: 10,
  screeningIntervalMin: 30,
  healthCheckIntervalMin: 60,
  temperature: 0.2,
  maxTokens: 4096,
  maxSteps: 20,
  managementModel: first(merged.OPENROUTER_MANAGEMENT_MODEL, "anthropic/claude-sonnet-4"),
  screeningModel: first(merged.OPENROUTER_SCREENING_MODEL, "deepseek/deepseek-chat"),
  generalModel: first(merged.OPENROUTER_GENERAL_MODEL, "deepseek/deepseek-chat"),
  chartIndicators: {
    enabled: true,
    entryPreset: "supertrend_break",
    exitPreset: "evilpanda_exit_v2",
    rsiLength: 2,
    intervals: ["15_MINUTE"],
    candles: 298,
    rsiOversold: 30,
    rsiOverbought: 90,
    requireAllIntervals: false
  },
  telegramChatId: first(merged.TELEGRAM_GROUP_CHAT_ID, "-1003955269762"),
  evilPandaStrategy: {
    enabled: true,
    coinSelection: "Dexscreener >=250k MC, >=1M 24h volume; GMGN fees >30, phishing <30%, bundling <60%, insiders <10%, top10 <30%.",
    poolChoosing: "Prefer 80/100/125 bin pools; -86% to -94% range; very new coins prefer 5%/10% fee pools when available.",
    entry: "15m Supertrend break above before one-sided SOL DLMM.",
    exit: "RSI(2)>90 plus BB upper close, or RSI(2)>90 plus MACD first green histogram; emergency cut on invalidation."
  }
};

fs.writeFileSync(MERIDIAN_CONFIG, `${JSON.stringify(userConfig, null, 2)}\n`, "utf8");

console.log(`Meridian config written: ${MERIDIAN_CONFIG}`);
console.log(`Meridian env written: ${MERIDIAN_ENV}`);
console.log(`Requested mode: ${mode}`);
console.log(`Effective DRY_RUN: ${dryRun}`);
if (!liveReady) console.log(`Live mode blocked until these exist locally: ${missingLive.join(", ")}`);
console.log("Secrets hidden.");

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return dotenv.parse(fs.readFileSync(file));
}

function writeEnv(file, updates) {
  const current = readEnv(file);
  const next = { ...current, ...updates };
  const lines = Object.entries(next).map(([key, value]) => `${key}=${value ?? ""}`);
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
}

function first(...values) {
  return values.find(nonEmpty) || "";
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveMeridianDir() {
  const configured = normalizeWindowsEnvPath(process.env.MERIDIAN_ENGINE_PATH || "../meridian-upstream");
  return path.isAbsolute(configured) ? configured : path.resolve(PROJECT_DIR, configured);
}

function normalizeWindowsEnvPath(value) {
  if (process.platform !== "win32") return value;
  return value
    .replace(/^([A-Za-z]):Users\\/, "$1:\\Users\\")
    .replace(/^([A-Za-z]):\\?C:\\/, "C:\\");
}
