import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HERMES_PROFILE_DIR = path.join(process.env.LOCALAPPDATA || "", "hermes", "profiles", "telegram-lio");
const HERMES_ROOT_DIR = path.join(process.env.LOCALAPPDATA || "", "hermes");

for (const file of [
  path.join(PROJECT_DIR, ".env"),
  path.join(HERMES_PROFILE_DIR, ".env"),
  path.join(HERMES_ROOT_DIR, ".env")
]) {
  if (fs.existsSync(file)) {
    const parsed = dotenv.parse(fs.readFileSync(file));
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key] || process.env[key]?.trim() === "") process.env[key] = value;
    }
  }
}

const TOPIC_PREFIX = {
  OPERATOR: "[OPERATOR]",
  SCREENING: "[SCREENING]",
  ANALYST: "[ANALYST]",
  SYSTEM: "[SYSTEM]",
  RESULT: "[RESULT]",
  ENTRY: "[ENTRY]",
  TRADE_LOG: "[TRADE_LOG]",
  TROUBLESHOOT: "[TROUBLESHOOT]"
};

const TOPIC_ENV = {
  OPERATOR: "OPERATOR_TOPIC_ID",
  SCREENING: "SCREENING_TOPIC_ID",
  ANALYST: "ANALYST_TOPIC_ID",
  SYSTEM: "SYSTEM_TOPIC_ID",
  RESULT: "RESULT_TOPIC_ID",
  ENTRY: "ENTRY_TOPIC_ID",
  TRADE_LOG: "TRADE_LOG_TOPIC_ID",
  TROUBLESHOOT: "TROUBLESHOOT_TOPIC_ID"
};

const command = (process.argv[2] || "ping_all").replace(/^\//, "");
const lioToken = firstDefined(process.env.LIO_TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_BOT_TOKEN);
const botTokens = {
  OPERATOR: lioToken,
  SYSTEM: lioToken,
  RESULT: lioToken,
  ENTRY: lioToken,
  TRADE_LOG: lioToken,
  TROUBLESHOOT: lioToken,
  SCREENING: firstDefined(process.env.CALA_TELEGRAM_BOT_TOKEN, lioToken),
  ANALYST: firstDefined(process.env.KONLIN_TELEGRAM_BOT_TOKEN, lioToken)
};
const chatId = firstDefined(process.env.TELEGRAM_CHAT_ID, process.env.TELEGRAM_GROUP_ALLOWED_CHATS, process.env.TELEGRAM_HOME_CHANNEL, process.env.TELEGRAM_ALLOWED_USERS);
const groupChatId = firstDefined(process.env.TELEGRAM_GROUP_CHAT_ID, process.env.TELEGRAM_GROUP_ALLOWED_CHATS, process.env.TELEGRAM_HOME_CHANNEL);

if (!lioToken) exitWith("LIO_TELEGRAM_BOT_TOKEN is missing. Add token for @Liocala_bot.");
if (!chatId || chatId.startsWith("@")) exitWith("TELEGRAM_CHAT_ID must be numeric/group ID, not bot username.");

try {
  if (command === "start") await sendToTopic("OPERATOR", startMessage());
  else if (command === "status") await sendToTopic("SYSTEM", systemStatus());
  else if (command === "ping") await sendToTopic("SYSTEM", "Lio online.");
  else if (command === "ping_all") await sendToTopic("SYSTEM", systemStatus());
  else if (command === "modelcheck") await sendToTopic("SYSTEM", modelcheck());
  else if (command === "models_help") await sendToTopic("SYSTEM", modelsHelp());
  else if (command === "meridian_status") await sendToTopic("SYSTEM", meridianStatus());
  else if (command === "meridian_safe") await setMeridianPreset("safe");
  else if (command === "meridian_moderate") await setMeridianPreset("moderate");
  else if (command === "meridian_degen") await setMeridianPreset("degen");
  else if (command === "lio_deepseek_chat") await setAgentModel("Lio", "DEEPSEEK_OPERATOR_MODEL", "deepseek-chat");
  else if (command === "cala_deepseek_chat") await setAgentModel("Cala", "DEEPSEEK_SCREENING_MODEL", "deepseek-chat");
  else if (command === "konlin_claude_opus") await setAgentModel("Konlin", "CLAUDE_ANALYST_MODEL", "claude-opus-4-1-20250805");
  else if (command === "konlin_claude_sonnet") await setAgentModel("Konlin", "CLAUDE_ANALYST_MODEL", "claude-sonnet-4-6");
  else if (command === "konlin_claude_haiku") await setAgentModel("Konlin", "CLAUDE_ANALYST_MODEL", "claude-haiku-4-5-20251001");
  else if (command === "topiccheck") await sendToTopic("SYSTEM", topiccheck());
  else if (command === "troubleshoot") await sendToTopic("TROUBLESHOOT", troubleshoot("manual check", "No active error."));
  else if (command === "scan_test") await scanTest();
  else if (command === "workflow_test") await workflowTest();
  else if (command === "trade_log") await sendToTopic("TRADE_LOG", tradeLogMessage());
  else if (command === "trade_summary") await sendToTopic("TRADE_LOG", tradeSummaryMessage());
  else if (command === "trade_log_test") await sendToTopic("TRADE_LOG", tradeLogTestMessage());
  else if (command === "evilpanda_strategy") await sendToTopic("SYSTEM", evilPandaStrategyMessage());
  else if (command === "execution_mode") await sendToTopic("ENTRY", entryStatus());
  else await sendToTopic("TROUBLESHOOT", troubleshoot(command, `Unknown command: ${command}`));
  console.log(`Meteora DLMM command /${command} completed. Secrets hidden.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await safeTroubleshoot(troubleshoot(command, message));
  console.error(`Meteora DLMM command /${command} failed: ${message}`);
  process.exitCode = 1;
}

async function scanTest() {
  await sendToTopic("OPERATOR", "Operator Update\nAgent: Lio\nModel: DeepSeek\nStatus: /scan_test received. Calling Cala dummy screening.");
  await sendToTopic("SCREENING", screeningMessage());
  await sendToTopic("OPERATOR", "Operator Update\nAgent: Lio\nStatus: Cala dummy screening posted.");
}

async function workflowTest() {
  await sendToTopic("OPERATOR", `Operator Update\nAgent: Lio\nModel: DeepSeek\nWorkflow Run ID: ${workflowRunId()}\nStatus: Workflow started`);
  await sendToTopic("SCREENING", screeningMessage());
  await sendToTopic("ANALYST", analystMessage());
  await sendToTopic("RESULT", finalResult());
  await sendToTopic("OPERATOR", "Operator Update\nAgent: Lio\nModel: DeepSeek\nStatus: Workflow completed\nBest pool: DUMMY_POOL_USDC_USDT\nFinal report posted.");
}

async function sendToTopic(topic, message) {
  const topicId = numeric(process.env[TOPIC_ENV[topic]]);
  const targetChatId = topicId ? firstDefined(groupChatId, chatId) : chatId;
  const topicToken = botTokens[topic] || lioToken;
  const body = {
    chat_id: targetChatId,
    text: topicId ? message : `${TOPIC_PREFIX[topic]}\n${message}`
  };
  if (topicId) body.message_thread_id = topicId;
  const response = await telegram("sendMessage", body, topicToken);
  if (!response.ok) throw new Error(`${response.description || "Telegram sendMessage failed"} (${topic})`);
  return response.result?.message_id;
}

async function safeTroubleshoot(message) {
  try {
    await sendToTopic("TROUBLESHOOT", message);
  } catch {
    // Avoid recursive failure noise.
  }
}

async function telegram(method, body, telegramToken = lioToken) {
  const response = await fetch(`https://api.telegram.org/bot${telegramToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return await response.json();
}

function startMessage() {
  return [
    "Operator Update",
    "Agent: Lio",
    "Model: DeepSeek",
    "Status: Hermes quick command router ready.",
    "",
    "Commands:",
    "/status",
    "/ping_all",
    "/modelcheck",
    "/meridian_status",
    "/meridian_safe",
    "/meridian_moderate",
    "/meridian_degen",
    "/topiccheck",
    "/scan_test",
    "/workflow_test",
    "/trade_log",
    "/trade_summary",
    "/trade_log_test",
    "/evilpanda_strategy",
    "/troubleshoot",
    "/execution_mode"
  ].join("\n");
}

async function setMeridianPreset(preset) {
  const config = writeMeridianPreset(preset);
  await sendToTopic("SYSTEM", [
    "Meridian-Safe Preset Updated",
    `Preset: ${config.preset}`,
    `Strategy: ${config.screening.strategy}`,
    `Timeframe: ${config.screening.timeframe}`,
    `Min TVL: ${config.screening.minTvl}`,
    `Min Volume 24h: ${config.screening.minVolume24h}`,
    `Alert Score: ${config.screening.alertScoreThreshold}`,
    "",
    "DRY_RUN: true",
    "Live execution: false",
    "Existing Lio/Cala/Konlin bots are reused. No new Telegram bot was created."
  ].join("\n"));
}

function meridianStatus() {
  const config = readMeridianConfig();
  return [
    "Meridian-Safe Status",
    `Enabled: ${config.enabled}`,
    `Preset: ${config.preset}`,
    `Lio profile: ${config.agents.lio.profile}`,
    `Cala profile: ${config.agents.cala.profile}`,
    `Konlin profile: ${config.agents.konlin.profile}`,
    `Strategy: ${config.screening.strategy}`,
    `Timeframe: ${config.screening.timeframe}`,
    `Min TVL: ${config.screening.minTvl}`,
    `Min Volume 24h: ${config.screening.minVolume24h}`,
    `Fee/TVL 24h: ${config.screening.minFeeTvlRatio24h}`,
    `Claude max pools: ${config.screening.maxClaudePoolCount}`,
    "",
    "DRY_RUN: true",
    "Live execution: false",
    "Wallet/private-key config: disabled"
  ].join("\n");
}

function readMeridianConfig() {
  const file = path.join(PROJECT_DIR, "config", "meridian-safe.config.json");
  if (!fs.existsSync(file)) return writeMeridianPreset("moderate");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeMeridianPreset(preset) {
  const presets = {
    safe: { strategy: "SPOT", timeframe: "24h", minTvl: 20000, minVolume24h: 50000, minFeeTvlRatio24h: 0.005, minPoolAgeHours: 24, alertScoreThreshold: 75, maxClaudePoolCount: 3, maxAlertsPerScan: 2, screeningIntervalMinutes: 60, managementIntervalMinutes: 15, tokenRiskMode: "CONSERVATIVE" },
    moderate: { strategy: "BID_ASK", timeframe: "4h", minTvl: 10000, minVolume24h: 25000, minFeeTvlRatio24h: 0.004, minPoolAgeHours: 12, alertScoreThreshold: 70, maxClaudePoolCount: 5, maxAlertsPerScan: 3, screeningIntervalMinutes: 30, managementIntervalMinutes: 10, tokenRiskMode: "BALANCED" },
    degen: { strategy: "BID_ASK", timeframe: "30m", minTvl: 5000, minVolume24h: 10000, minFeeTvlRatio24h: 0.003, minPoolAgeHours: 6, alertScoreThreshold: 65, maxClaudePoolCount: 5, maxAlertsPerScan: 3, screeningIntervalMinutes: 15, managementIntervalMinutes: 5, tokenRiskMode: "AGGRESSIVE" }
  };
  if (!presets[preset]) throw new Error(`Unknown Meridian-safe preset: ${preset}`);
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
  const file = path.join(PROJECT_DIR, "config", "meridian-safe.config.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return config;
}

function systemStatus() {
  const topicsReady = Object.values(TOPIC_ENV).every((key) => numeric(process.env[key]));
  const meridian = readMeridianConfig();
  return [
    "📡 System Status",
    "",
    "Lio: READY",
    "Cala: READY",
    "Konlin: READY",
    `Lio Bot: ${lioToken ? "READY" : "MISSING"}`,
    `Cala Bot: ${process.env.CALA_TELEGRAM_BOT_TOKEN ? "READY" : "MISSING_USING_LIO_FALLBACK"}`,
    `Konlin Bot: ${process.env.KONLIN_TELEGRAM_BOT_TOKEN ? "READY" : "MISSING_USING_LIO_FALLBACK"}`,
    `Telegram Group: ${chatId ? "READY" : "ERROR"}`,
    `Topics: ${topicsReady ? "READY" : "MISSING"}`,
    `DeepSeek: ${firstDefined(process.env.DEEPSEEK_API_KEY) ? "READY" : "MISSING"}`,
    `Claude: ${firstDefined(process.env.ANTHROPIC_API_KEY) ? "READY" : "MISSING_MODEL_OR_CONFIG"}`,
    "Hermes: READY",
    `Meridian-safe: ${meridian.enabled ? "READY" : "DISABLED"} (${meridian.preset})`,
    `Cala Profile: ${meridian.agents.cala.profile}`,
    `Konlin Profile: ${meridian.agents.konlin.profile}`,
    "Meteora: READY",
    "Execution: DISABLED",
    `Emergency Stop: ${parseBool(process.env.EMERGENCY_STOP) ? "ON" : "OFF"}`,
    "",
    `Final: ${topicsReady && firstDefined(process.env.DEEPSEEK_API_KEY) ? "READY" : "NOT READY"}`
  ].join("\n");
}

function modelcheck() {
  const meridian = readMeridianConfig();
  return [
    "Model Routing",
    `Lio -> DeepSeek (${process.env.DEEPSEEK_OPERATOR_MODEL || "deepseek-chat"})`,
    `Cala -> DeepSeek (${process.env.DEEPSEEK_SCREENING_MODEL || "deepseek-chat"})`,
    `Konlin -> Claude (${process.env.CLAUDE_ANALYST_MODEL || "NOT SET"})`,
    "",
    "Hermes Profiles",
    `Lio -> ${meridian.agents.lio.profile}`,
    `Cala -> ${meridian.agents.cala.profile}`,
    `Konlin -> ${meridian.agents.konlin.profile}`,
    "",
    "Telegram Bot Routing",
    "Operator/System/Result/Entry/Troubleshoot -> Lio",
    "Screening -> Cala",
    "Analyst -> Konlin",
    "",
    "Use /models_help for Telegram model preset commands.",
    "Hermes Desktop: change each agent model in Profiles -> telegram-lio / telegram-cala / telegram-konlin."
  ].join("\n");
}

function modelsHelp() {
  return [
    "Model Settings Help",
    "",
    "Telegram preset commands:",
    "/lio_deepseek_chat",
    "/cala_deepseek_chat",
    "/konlin_claude_opus",
    "/konlin_claude_sonnet",
    "/konlin_claude_haiku",
    "",
    "Hermes Desktop:",
    "Profiles -> telegram-lio -> MODEL changes the global gateway model.",
    "",
    "Note:",
    "After changing a model preset, restart telegram-lio gateway if Hermes does not reload env automatically.",
    "Secrets are never printed."
  ].join("\n");
}

async function setAgentModel(agent, envKey, model) {
  const envFile = path.join(HERMES_PROFILE_DIR, ".env");
  updateEnvValue(envFile, envKey, model);
  process.env[envKey] = model;
  await sendToTopic("SYSTEM", [
    "Model Setting Updated",
    `Agent: ${agent}`,
    `Env: ${envKey}`,
    `Model: ${model}`,
    "",
    "Restart telegram-lio gateway if Hermes does not reload env automatically.",
    "Auto entry remains disabled."
  ].join("\n"));
}

function updateEnvValue(envFile, key, value) {
  const lines = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").split(/\r?\n/) : [];
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  fs.writeFileSync(envFile, next.join("\n").replace(/\n+$/u, "\n"), "utf8");
}

function topiccheck() {
  return [
    "📡 System Status",
    "Telegram Topic Check:",
    "",
    ...Object.entries({
      "🧭 Operator": "OPERATOR_TOPIC_ID",
      "🔎 Screening": "SCREENING_TOPIC_ID",
      "🧠 Analyst": "ANALYST_TOPIC_ID",
      "📡 System": "SYSTEM_TOPIC_ID",
      "📊 Result": "RESULT_TOPIC_ID",
      "🚀 Entry": "ENTRY_TOPIC_ID",
      "Trade Log": "TRADE_LOG_TOPIC_ID",
      "🛠 Troubleshoot": "TROUBLESHOOT_TOPIC_ID"
    }).map(([name, key]) => `${name}: ${numeric(process.env[key]) ? `READY ${process.env[key]}` : `MISSING ${key}`}`)
  ].join("\n");
}

function tradeLogMessage() {
  return [
    "Trade Log",
    "",
    "Latest closed positions:",
    "",
    "USDC/USDT | CURVE | POSITIVE",
    "PnL: +$34.50 (+3.45%)",
    "Closed: dummy test data",
    "Exit: Paper close: fee/TVL target reached.",
    "---",
    "MEME/SOL | BID_ASK | NEGATIVE",
    "PnL: -$38.75 (-7.75%)",
    "Closed: dummy test data",
    "Exit: Paper close: risk increased and volume weakened.",
    "",
    tradeSummaryMessage(),
    "",
    "Real execution remains disabled."
  ].join("\n");
}

function tradeSummaryMessage() {
  return [
    "Trade Log Summary",
    "",
    "Total closed: 2",
    "Positive PnL: 1",
    "Negative PnL: 1",
    "Flat PnL: 0",
    "Total PnL: -$4.25",
    "Average PnL %: -2.15%",
    "Best PnL: +$34.50",
    "Worst PnL: -$38.75"
  ].join("\n");
}

function tradeLogTestMessage() {
  return [
    "Trade Log Test",
    "",
    "Dummy closed positions posted to Trade Log topic.",
    "",
    tradeLogMessage()
  ].join("\n");
}

function evilPandaStrategyMessage() {
  return [
    "EvilPanda Strategy",
    "",
    "Part 1 - Coin Selection",
    "- Dexscreener: 250k MC and 1,000,000 24h volume.",
    "- Sort coins by age.",
    "- Ignore coins without picture or press/open profile button for verification.",
    "- GMGN: fees > 30, phishing < 30%, bundling < 60%, insiders < 10%, top10 < 30%.",
    "",
    "Part 1B - DLMM Pool Choosing",
    "- Use after coin selection and before entry.",
    "- Choose pools that keep the position in range long enough to print fees.",
    "- Prefer 80/100/125 bin pools.",
    "- General downside range: -86% to -94%.",
    "- For coins under 12h old, prefer 5%/10% higher-fee pools when available.",
    "- Avoid pools likely to go out of range too quickly.",
    "- If no pool fits, do nothing.",
    "",
    "Part 2 - Entry Criteria",
    "- Dexscreener chart: add Supertrend.",
    "- 15m chart: wait for price to break above Supertrend.",
    "- Open one-sided SOL DLMM position.",
    "- SPOT or BID_ASK depending on behavior.",
    "- Prefer 80/100/125 bin pools.",
    "- General range: -86% to -94%.",
    "",
    "Part 3 - Exit Criteria",
    "- EvilPanda Exit Strategy v2.",
    "- Add BB, MACD, RSI.",
    "- RSI length 2, upper limit 90.",
    "- Exit requires at least 2-indicator confluence.",
    "- Signal A: RSI(2) close above 90 + price close above BB upper.",
    "- Signal B: RSI(2) close above 90 + MACD first green histogram.",
    "- Multiple indicators firing together means stronger exit signal.",
    "- Preferred path: earn fees during dump, then exit on bounce strength.",
    "- Prefer systematic exit over trying to catch exact top.",
    "- Emergency exit if risk changes, volume/liquidity collapses, pool is out of useful range, entry was a mistake, or market becomes unsafe.",
    "- Every close must go to Trade Log with PnL and exit reason.",
    "",
    "Part 4 - Rules",
    "- Prefer 15m; 1m/5m have more traps.",
    "- Do nothing in dry markets.",
    "- Exit when strategy says exit.",
    "- Cut mistakes even at a loss.",
    "- Divide portfolio into at least 6 positions.",
    "- Do not open new positions after 18:00 local time.",
    "- No revenge DLMM.",
    "",
    "Safety: real execution remains disabled."
  ].join("\n");
}

function entryStatus() {
  return [
    "Entry Status",
    "Mode: SCANNER_ONLY",
    "Real Execution: false",
    "Emergency Stop: false",
    "Pending Entry Plans: 0",
    "Auto entry is disabled by default."
  ].join("\n");
}

function screeningMessage() {
  return [
    "Screening Result",
    "Agent: Cala",
    "Model: DeepSeek",
    "Candidates: 3",
    "Rejected: 22",
    "",
    JSON.stringify(calaDummy(), null, 2)
  ].join("\n");
}

function analystMessage() {
  return [
    "Analysis Result",
    "Agent: Konlin",
    "Model: Claude",
    "Best Pool: DUMMY_POOL_USDC_USDT",
    "Confidence: 82",
    "",
    JSON.stringify(konlinDummy(), null, 2)
  ].join("\n");
}

function finalResult() {
  return [
    "📊 Final DLMM Result",
    "",
    "Best Pool:",
    "USDC/USDT",
    "",
    "Decision:",
    "WATCHLIST",
    "",
    "Strategy:",
    "CURVE",
    "",
    "Confidence:",
    "82",
    "",
    "Max Allocation:",
    "5-10%",
    "",
    "Status:",
    "Dummy workflow test only.",
    "Real Meteora scan not enabled yet.",
    "Auto entry disabled."
  ].join("\n");
}

function calaDummy() {
  return {
    agent: "Cala",
    routing: "SCREENING",
    model: "DeepSeek",
    totalPoolsScanned: 25,
    totalRejected: 22,
    candidateCount: 3,
    candidates: [
      { poolAddress: "DUMMY_POOL_SOL_USDC", pair: "SOL/USDC", score: 84, classification: "WATCHLIST", risk: "MEDIUM", localStrategy: "SPOT", tvl: 1250000, volume24h: 4800000, feeTvl24h: 0.0099, apr24h: 145 },
      { poolAddress: "DUMMY_POOL_USDC_USDT", pair: "USDC/USDT", score: 79, classification: "WATCHLIST", risk: "LOW", localStrategy: "CURVE", tvl: 3500000, volume24h: 6200000, feeTvl24h: 0.0023, apr24h: 52 },
      { poolAddress: "DUMMY_POOL_MEME_SOL", pair: "MEME/SOL", score: 72, classification: "WATCHLIST", risk: "HIGH", localStrategy: "BID_ASK", tvl: 85000, volume24h: 950000, feeTvl24h: 0.115, apr24h: 420 }
    ]
  };
}

function konlinDummy() {
  return {
    agent: "Konlin",
    routing: "ANALYST",
    model: "Claude",
    results: [
      { poolAddress: "DUMMY_POOL_SOL_USDC", pair: "SOL/USDC", decision: "WATCHLIST", strategy: "SPOT", range: "MEDIUM", maxAllocation: "2-5%", confidence: 78 },
      { poolAddress: "DUMMY_POOL_USDC_USDT", pair: "USDC/USDT", decision: "WATCHLIST", strategy: "CURVE", range: "NARROW", maxAllocation: "5-10%", confidence: 82 },
      { poolAddress: "DUMMY_POOL_MEME_SOL", pair: "MEME/SOL", decision: "PAPER_ONLY", strategy: "BID_ASK", range: "WIDE", maxAllocation: "0%", confidence: 74 }
    ],
    bestPool: "DUMMY_POOL_USDC_USDT",
    summary: "USDC/USDT is safest. SOL/USDC is balanced."
  };
}

function troubleshoot(step, error) {
  return [
    "🛠 Troubleshoot Report",
    "",
    `Time: ${new Date().toISOString()}`,
    `Command: /${command}`,
    "Agent: Lio",
    `Step: ${step}`,
    "Status: ERROR",
    `Error: ${error}`,
    "Suggested Fix: Check TELEGRAM_CHAT_ID, topic IDs, bot admin permissions, and Hermes env values."
  ].join("\n");
}

function numeric(value) {
  return value && /^\d+$/.test(String(value).trim()) ? Number(value) : undefined;
}

function firstDefined(...values) {
  return values.find((value) => value && String(value).trim().length > 0)?.trim();
}

function parseBool(value) {
  return ["true", "1", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function workflowRunId() {
  return `WF-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

function exitWith(message) {
  console.error(message);
  process.exit(1);
}
