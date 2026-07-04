import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { loadMeridianConfig } from "./meridian/config.js";

dotenv.config();

const hermesEnv = path.join(process.env.LOCALAPPDATA ?? "", "hermes", ".env");
loadEnvFallback(hermesEnv);

const hermesProfileEnv = path.join(process.env.LOCALAPPDATA ?? "", "hermes", "profiles", "telegram-lio", ".env");
loadEnvFallback(hermesProfileEnv);

const envBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  AGENT_OPERATOR_NAME: z.string().default("Lio"),
  AGENT_SCREENING_NAME: z.string().default("Cala"),
  AGENT_ANALYST_NAME: z.string().default("Konlin"),
  LIO_TELEGRAM_BOT_USERNAME: z.string().default("@Liocala_bot"),
  CALA_TELEGRAM_BOT_USERNAME: z.string().default("@Calalio_bot"),
  KONLIN_TELEGRAM_BOT_USERNAME: z.string().default("@KOnlin_bot"),
  LIO_TELEGRAM_BOT_TOKEN: z.string().optional(),
  CALA_TELEGRAM_BOT_TOKEN: z.string().optional(),
  KONLIN_TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_GROUP_CHAT_ID: z.string().optional(),
  TELEGRAM_ALLOWED_USERS: z.string().optional(),
  TELEGRAM_GROUP_ALLOWED_CHATS: z.string().optional(),
  TELEGRAM_HOME_CHANNEL: z.string().optional(),
  OPERATOR_TOPIC_ID: z.string().optional(),
  SCREENING_TOPIC_ID: z.string().optional(),
  ANALYST_TOPIC_ID: z.string().optional(),
  SYSTEM_TOPIC_ID: z.string().optional(),
  RESULT_TOPIC_ID: z.string().optional(),
  ENTRY_TOPIC_ID: z.string().optional(),
  TRADE_LOG_TOPIC_ID: z.string().optional(),
  TROUBLESHOOT_TOPIC_ID: z.string().optional(),
  TELEGRAM_GATEWAY_AGENT: z.string().default("Lio"),
  AGENT_OPERATOR_PROVIDER: z.string().default("deepseek"),
  AGENT_SCREENING_PROVIDER: z.string().default("deepseek"),
  AGENT_ANALYST_PROVIDER: z.string().default("anthropic"),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_OPERATOR_MODEL: z.string().default("deepseek-chat"),
  DEEPSEEK_SCREENING_MODEL: z.string().default("deepseek-chat"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_API_KEY: z.string().optional(),
  CLAUDE_ANALYST_MODEL: z.string().optional(),
  CLAUDE_MODEL: z.string().optional(),
  METEORA_API_BASE_URL: z.string().url().default("https://dlmm-api.meteora.ag"),
  DATABASE_PATH: z.string().default("./data/meteora-dlmm.sqlite"),
  EXECUTION_MODE: z.enum(["SCANNER_ONLY", "PAPER_TRADING", "SEMI_AUTO", "AUTO", "FULL_AUTO_SMALL"]).default("SCANNER_ONLY"),
  PAPER_TRADING: envBoolean.default(true),
  SCAN_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
  MIN_TVL: z.coerce.number().positive().default(20_000),
  MIN_VOLUME_24H: z.coerce.number().positive().default(50_000),
  MIN_FEE_TVL_RATIO_24H: z.coerce.number().positive().default(0.005),
  MIN_POOL_AGE_HOURS: z.coerce.number().nonnegative().default(12),
  ALERT_SCORE_THRESHOLD: z.coerce.number().min(0).max(100).default(70),
  CLAUDE_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(100).default(70),
  MAX_CLAUDE_POOL_COUNT: z.coerce.number().int().min(1).max(5).default(5),
  MAX_ALERTS_PER_SCAN: z.coerce.number().int().min(1).max(5).default(3),
  DUPLICATE_ALERT_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(30),
  ENABLE_REAL_EXECUTION: envBoolean.default(false),
  EMERGENCY_STOP: envBoolean.default(false),
  RISK_MODE: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"]).default("BALANCED"),
  MAX_DAILY_DRAWDOWN_PCT: z.coerce.number().positive().max(100).default(10),
  PAPER_NOTIONAL_USD: z.coerce.number().positive().default(1000),
  MANAGEMENT_INTERVAL_MINUTES: z.coerce.number().int().positive().optional(),
  MANAGEMENT_CYCLE_ENABLED: envBoolean.default(true),
  WALLET_PUBLIC_ADDRESS: z.string().optional(),
  STRATEGY_PROFILE: z.enum(["EVILPANDA", "HERON", "DEFAULT"]).default("EVILPANDA")
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment config. Fix these values in .env and restart:\n${issues}`);
}

const env = parsed.data;
if (env.TELEGRAM_CHAT_ID?.trim().startsWith("@")) {
  throw new Error("TELEGRAM_CHAT_ID must be numeric/group ID, not bot username.");
}

const effectiveChatId = firstDefined(env.TELEGRAM_CHAT_ID, env.TELEGRAM_ALLOWED_USERS);
const effectiveGroupChatId = firstDefined(env.TELEGRAM_GROUP_CHAT_ID, env.TELEGRAM_GROUP_ALLOWED_CHATS, env.TELEGRAM_HOME_CHANNEL);
const meridianConfig = loadMeridianConfig();

export const config = {
  agents: {
    lio: {
      name: env.AGENT_OPERATOR_NAME,
      username: env.LIO_TELEGRAM_BOT_USERNAME,
      provider: env.AGENT_OPERATOR_PROVIDER,
      model: env.DEEPSEEK_OPERATOR_MODEL,
      temperature: 0.2,
      maxTokens: 900
    },
    cala: {
      name: env.AGENT_SCREENING_NAME,
      username: env.CALA_TELEGRAM_BOT_USERNAME,
      provider: env.AGENT_SCREENING_PROVIDER,
      model: env.DEEPSEEK_SCREENING_MODEL,
      temperature: 0.1,
      maxTokens: 700
    },
    konlin: {
      name: env.AGENT_ANALYST_NAME,
      username: env.KONLIN_TELEGRAM_BOT_USERNAME,
      provider: env.AGENT_ANALYST_PROVIDER,
      model: firstDefined(env.CLAUDE_ANALYST_MODEL, env.CLAUDE_MODEL) ?? "CLAUDE_ANALYST_MODEL_NOT_SET",
      temperature: 0.2,
      maxTokens: 1400
    }
  },
  telegram: {
    lioBotToken: firstDefined(env.LIO_TELEGRAM_BOT_TOKEN, env.TELEGRAM_BOT_TOKEN),
    calaBotToken: firstDefined(env.CALA_TELEGRAM_BOT_TOKEN),
    konlinBotToken: firstDefined(env.KONLIN_TELEGRAM_BOT_TOKEN),
    chatId: isTelegramChatId(effectiveChatId) ? effectiveChatId : undefined,
    groupChatId: isTelegramChatId(effectiveGroupChatId) ? effectiveGroupChatId : undefined,
    rawChatId: effectiveChatId,
    rawGroupChatId: effectiveGroupChatId,
    gatewayAgent: env.TELEGRAM_GATEWAY_AGENT,
    topics: {
      OPERATOR: parseTopicId(env.OPERATOR_TOPIC_ID),
      SCREENING: parseTopicId(env.SCREENING_TOPIC_ID),
      ANALYST: parseTopicId(env.ANALYST_TOPIC_ID),
      SYSTEM: parseTopicId(env.SYSTEM_TOPIC_ID),
      RESULT: parseTopicId(env.RESULT_TOPIC_ID),
      ENTRY: parseTopicId(env.ENTRY_TOPIC_ID),
      TRADE_LOG: parseTopicId(env.TRADE_LOG_TOPIC_ID),
      TROUBLESHOOT: parseTopicId(env.TROUBLESHOOT_TOPIC_ID)
    }
  },
  providers: {
    deepseek: {
      apiKey: firstDefined(env.DEEPSEEK_API_KEY),
      baseUrl: env.DEEPSEEK_BASE_URL,
      operatorModel: env.DEEPSEEK_OPERATOR_MODEL,
      screeningModel: env.DEEPSEEK_SCREENING_MODEL
    },
    anthropic: {
      apiKey: firstDefined(env.ANTHROPIC_API_KEY, env.CLAUDE_API_KEY),
      analystModel: firstDefined(env.CLAUDE_ANALYST_MODEL, env.CLAUDE_MODEL)
    }
  },
  deepseek: {
    apiKey: firstDefined(env.DEEPSEEK_API_KEY),
    baseUrl: env.DEEPSEEK_BASE_URL,
    operatorModel: env.DEEPSEEK_OPERATOR_MODEL,
    screeningModel: env.DEEPSEEK_SCREENING_MODEL
  },
  anthropic: {
    apiKey: firstDefined(env.ANTHROPIC_API_KEY, env.CLAUDE_API_KEY),
    model: firstDefined(env.CLAUDE_ANALYST_MODEL, env.CLAUDE_MODEL) ?? "CLAUDE_ANALYST_MODEL_NOT_SET"
  },
  meteora: {
    apiBaseUrl: env.METEORA_API_BASE_URL
  },
  database: {
    path: env.DATABASE_PATH
  },
  scan: {
    intervalMinutes: hasEnv("SCAN_INTERVAL_MINUTES") ? env.SCAN_INTERVAL_MINUTES : meridianConfig.screening.screeningIntervalMinutes,
    alertScoreThreshold: hasEnv("ALERT_SCORE_THRESHOLD") ? env.ALERT_SCORE_THRESHOLD : meridianConfig.screening.alertScoreThreshold,
    claudeConfidenceThreshold: env.CLAUDE_CONFIDENCE_THRESHOLD,
    maxClaudePoolCount: hasEnv("MAX_CLAUDE_POOL_COUNT") ? env.MAX_CLAUDE_POOL_COUNT : meridianConfig.screening.maxClaudePoolCount,
    maxAlertsPerScan: hasEnv("MAX_ALERTS_PER_SCAN") ? env.MAX_ALERTS_PER_SCAN : meridianConfig.screening.maxAlertsPerScan,
    duplicateAlertCooldownMinutes: env.DUPLICATE_ALERT_COOLDOWN_MINUTES
  },
  risk: {
    minTvl: hasEnv("MIN_TVL") ? env.MIN_TVL : meridianConfig.screening.minTvl,
    minVolume24h: hasEnv("MIN_VOLUME_24H") ? env.MIN_VOLUME_24H : meridianConfig.screening.minVolume24h,
    minFeeTvlRatio24h: hasEnv("MIN_FEE_TVL_RATIO_24H") ? env.MIN_FEE_TVL_RATIO_24H : meridianConfig.screening.minFeeTvlRatio24h,
    minPoolAgeHours: hasEnv("MIN_POOL_AGE_HOURS") ? env.MIN_POOL_AGE_HOURS : meridianConfig.screening.minPoolAgeHours,
    mode: hasEnv("RISK_MODE") ? env.RISK_MODE : meridianConfig.screening.tokenRiskMode
  },
  meridian: meridianConfig,
  strategy: {
    profile: env.STRATEGY_PROFILE
  },
  positions: {
    maxDailyDrawdownPct: env.MAX_DAILY_DRAWDOWN_PCT,
    paperNotionalUsd: env.PAPER_NOTIONAL_USD,
    managementIntervalMinutes: env.MANAGEMENT_INTERVAL_MINUTES ?? meridianConfig.screening.managementIntervalMinutes,
    managementCycleEnabled: env.MANAGEMENT_CYCLE_ENABLED,
    // Public wallet address only (read-only reconciliation); never a private key.
    walletPublicAddress: firstDefined(env.WALLET_PUBLIC_ADDRESS)
  },
  execution: {
    mode: env.EXECUTION_MODE === "PAPER_TRADING" ? "PAPER_TRADING" : "SCANNER_ONLY",
    paperTrading: env.PAPER_TRADING,
    enableRealExecution: false,
    emergencyStop: env.EMERGENCY_STOP,
    walletKeypairPath: undefined,
    semiAutoEnabled: false,
    autoEnabled: false
  }
} as const;

export function getTelegramStatus(): "configured" | "missing_lio_token" | "missing_numeric_chat_id" | "chat_id_is_username" {
  if (!config.telegram.lioBotToken) return "missing_lio_token";
  if (config.telegram.rawChatId?.startsWith("@")) return "chat_id_is_username";
  if (!config.telegram.chatId) return "missing_numeric_chat_id";
  return "configured";
}

export function getProviderStatus(): { deepseek: "configured" | "missing_api_key"; anthropic: "configured" | "missing_api_key" | "missing_model" } {
  return {
    deepseek: config.providers.deepseek.apiKey ? "configured" : "missing_api_key",
    anthropic: !config.providers.anthropic.apiKey
      ? "missing_api_key"
      : config.providers.anthropic.analystModel
        ? "configured"
        : "missing_model"
  };
}

export function isTelegramChatId(value: string | undefined): value is string {
  return Boolean(value && /^-?\d+$/.test(value.trim()));
}

export function parseTopicId(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  return Number(value);
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

function hasEnv(key: string): boolean {
  return Boolean(process.env[key] && process.env[key]?.trim().length);
}

function loadEnvFallback(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const parsedFile = dotenv.parse(fs.readFileSync(filePath));
  for (const [key, value] of Object.entries(parsedFile)) {
    const current = process.env[key];
    if (current === undefined || current.trim().length === 0) {
      process.env[key] = value;
    }
  }
}

export function getClaudeStatus(): "configured" | "missing_api_key" {
  return config.providers.anthropic.apiKey ? "configured" : "missing_api_key";
}
