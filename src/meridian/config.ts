import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { meridianSafePresets, type MeridianRiskPreset, type MeridianSafePreset } from "./presets.js";

export const MERIDIAN_SAFE_CONFIG_PATH = path.resolve("config", "meridian-safe.config.json");

const schema = z.object({
  enabled: z.boolean().default(true),
  preset: z.enum(["safe", "moderate", "degen"]).default("moderate"),
  dryRun: z.literal(true).default(true),
  liveExecutionEnabled: z.literal(false).default(false),
  telegramGatewayAgent: z.literal("Lio").default("Lio"),
  agents: z.object({
    lio: z.object({ profile: z.string().default("telegram-lio"), modelRole: z.string().default("operator") }),
    cala: z.object({ profile: z.string().default("telegram-cala"), modelRole: z.string().default("screening") }),
    konlin: z.object({ profile: z.string().default("telegram-konlin"), modelRole: z.string().default("analyst") })
  }),
  screening: z.object({
    strategy: z.enum(["SPOT", "CURVE", "BID_ASK"]),
    timeframe: z.enum(["5m", "30m", "4h", "24h"]),
    minTvl: z.number().nonnegative(),
    minVolume24h: z.number().nonnegative(),
    minFeeTvlRatio24h: z.number().nonnegative(),
    minPoolAgeHours: z.number().nonnegative(),
    alertScoreThreshold: z.number().min(0).max(100),
    maxClaudePoolCount: z.number().int().min(1).max(5),
    maxAlertsPerScan: z.number().int().min(1).max(5),
    screeningIntervalMinutes: z.number().int().positive(),
    managementIntervalMinutes: z.number().int().positive(),
    tokenRiskMode: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"])
  }),
  notes: z.array(z.string()).default([])
});

export type MeridianSafeConfig = z.infer<typeof schema>;

export function buildMeridianConfig(presetName: MeridianRiskPreset = "moderate"): MeridianSafeConfig {
  const preset = meridianSafePresets[presetName];
  return {
    enabled: true,
    preset: preset.preset,
    dryRun: true,
    liveExecutionEnabled: false,
    telegramGatewayAgent: "Lio",
    agents: {
      lio: { profile: "telegram-lio", modelRole: "operator" },
      cala: { profile: "telegram-cala", modelRole: "screening" },
      konlin: { profile: "telegram-konlin", modelRole: "analyst" }
    },
    screening: presetToScreening(preset),
    notes: [
      "Inspired by Meridian config patterns, but wallet/private-key/live execution are intentionally disabled.",
      "Lio is the main gateway; Cala posts screening output and Konlin posts analyst output when their Telegram tokens are configured."
    ]
  };
}

export function loadMeridianConfig(): MeridianSafeConfig {
  if (!fs.existsSync(MERIDIAN_SAFE_CONFIG_PATH)) return buildMeridianConfig();
  const raw = JSON.parse(fs.readFileSync(MERIDIAN_SAFE_CONFIG_PATH, "utf8"));
  return schema.parse(raw);
}

export function saveMeridianConfig(config: MeridianSafeConfig): void {
  fs.mkdirSync(path.dirname(MERIDIAN_SAFE_CONFIG_PATH), { recursive: true });
  fs.writeFileSync(MERIDIAN_SAFE_CONFIG_PATH, `${JSON.stringify(schema.parse(config), null, 2)}\n`, "utf8");
}

export function applyMeridianPreset(presetName: MeridianRiskPreset): MeridianSafeConfig {
  const next = buildMeridianConfig(presetName);
  saveMeridianConfig(next);
  return next;
}

function presetToScreening(preset: MeridianSafePreset): MeridianSafeConfig["screening"] {
  return {
    strategy: preset.strategy,
    timeframe: preset.timeframe,
    minTvl: preset.minTvl,
    minVolume24h: preset.minVolume24h,
    minFeeTvlRatio24h: preset.minFeeTvlRatio24h,
    minPoolAgeHours: preset.minPoolAgeHours,
    alertScoreThreshold: preset.alertScoreThreshold,
    maxClaudePoolCount: preset.maxClaudePoolCount,
    maxAlertsPerScan: preset.maxAlertsPerScan,
    screeningIntervalMinutes: preset.screeningIntervalMinutes,
    managementIntervalMinutes: preset.managementIntervalMinutes,
    tokenRiskMode: preset.tokenRiskMode
  };
}
