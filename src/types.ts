export type BotMode = "scanner_only" | "paper_trading" | "paused";
export type LocalStrategy = "CURVE" | "SPOT" | "BID_ASK" | "AVOID";
export type CandidateClassification = "HIGH_PRIORITY" | "WATCHLIST" | "PAPER_ONLY" | "IGNORE";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ClaudeDecision = "ENTER_SMALL" | "WATCHLIST" | "PAPER_ONLY" | "AVOID";
export type RangeRecommendation = "NARROW" | "MEDIUM" | "WIDE" | "NONE";
export type PaperResult = "GOOD" | "NEUTRAL" | "BAD" | "UNKNOWN";

export interface NormalizedPool {
  poolAddress: string;
  pair: string;
  tokenX?: string;
  tokenY?: string;
  tvl: number;
  volume5m?: number;
  volume30m?: number;
  volume1h?: number;
  volume4h?: number;
  volume24h: number;
  fee5m?: number;
  fee30m?: number;
  fee1h?: number;
  fee4h?: number;
  fee24h: number;
  feeTvlRatio1h?: number;
  feeTvlRatio4h?: number;
  feeTvlRatio24h: number;
  apr1h?: number;
  apr4h?: number;
  apr24h?: number;
  farmApy?: number;
  feePct?: number;
  binStep?: number;
  poolCreatedAt?: string;
  poolAgeHours: number;
  isBlacklisted: boolean;
  raw: unknown;
}

export interface ScoredCandidate {
  poolAddress: string;
  pair: string;
  score: number;
  classification: CandidateClassification;
  risk: RiskLevel;
  localStrategy: LocalStrategy;
  tvl: number;
  volume24h: number;
  fee24h: number;
  feeTvl24h: number;
  apr24h: number;
  farmApy?: number;
  binStep: number;
  volumeTvlRatio: number;
  poolAgeHours: number;
  poolCreatedAt?: string;
  raw: unknown;
}

export interface ScreeningResult {
  agent: "Screening Agent";
  timestamp: string;
  totalPoolsScanned: number;
  totalRejected: number;
  candidateCount: number;
  candidates: ScoredCandidate[];
  rejectedReasons: Record<string, number>;
}

export interface ClaudePoolAnalysis {
  poolAddress: string;
  pair: string;
  decision: ClaudeDecision;
  strategy: LocalStrategy;
  range: RangeRecommendation;
  maxAllocation: string;
  mainReason: string;
  exitRule: string;
  confidence: number;
}

export interface ClaudeAnalysisResult {
  agent: "Claude Analyst Agent";
  timestamp: string;
  results: ClaudePoolAnalysis[];
  bestPool: string;
  safestPool: string;
  highestFeeOpportunity: string;
  avoidList: string[];
  summary: string;
}

export interface ScanWorkflowResult {
  screening: ScreeningResult;
  analysis: ClaudeAnalysisResult | null;
  alertedCount: number;
}
