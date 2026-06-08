export type MeridianRiskPreset = "safe" | "moderate" | "degen";

export interface MeridianSafePreset {
  preset: MeridianRiskPreset;
  strategy: "SPOT" | "CURVE" | "BID_ASK";
  timeframe: "5m" | "30m" | "4h" | "24h";
  minTvl: number;
  minVolume24h: number;
  minFeeTvlRatio24h: number;
  minPoolAgeHours: number;
  alertScoreThreshold: number;
  maxClaudePoolCount: number;
  maxAlertsPerScan: number;
  screeningIntervalMinutes: number;
  managementIntervalMinutes: number;
  tokenRiskMode: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  dryRun: true;
  liveExecutionEnabled: false;
}

export const meridianSafePresets: Record<MeridianRiskPreset, MeridianSafePreset> = {
  safe: {
    preset: "safe",
    strategy: "SPOT",
    timeframe: "24h",
    minTvl: 20_000,
    minVolume24h: 50_000,
    minFeeTvlRatio24h: 0.005,
    minPoolAgeHours: 24,
    alertScoreThreshold: 75,
    maxClaudePoolCount: 3,
    maxAlertsPerScan: 2,
    screeningIntervalMinutes: 60,
    managementIntervalMinutes: 15,
    tokenRiskMode: "CONSERVATIVE",
    dryRun: true,
    liveExecutionEnabled: false
  },
  moderate: {
    preset: "moderate",
    strategy: "BID_ASK",
    timeframe: "4h",
    minTvl: 10_000,
    minVolume24h: 25_000,
    minFeeTvlRatio24h: 0.004,
    minPoolAgeHours: 12,
    alertScoreThreshold: 70,
    maxClaudePoolCount: 5,
    maxAlertsPerScan: 3,
    screeningIntervalMinutes: 30,
    managementIntervalMinutes: 10,
    tokenRiskMode: "BALANCED",
    dryRun: true,
    liveExecutionEnabled: false
  },
  degen: {
    preset: "degen",
    strategy: "BID_ASK",
    timeframe: "30m",
    minTvl: 5_000,
    minVolume24h: 10_000,
    minFeeTvlRatio24h: 0.003,
    minPoolAgeHours: 6,
    alertScoreThreshold: 65,
    maxClaudePoolCount: 5,
    maxAlertsPerScan: 3,
    screeningIntervalMinutes: 15,
    managementIntervalMinutes: 5,
    tokenRiskMode: "AGGRESSIVE",
    dryRun: true,
    liveExecutionEnabled: false
  }
};

