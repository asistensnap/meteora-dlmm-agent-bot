import { config } from "../config.js";
import { ClaudeClient } from "../claude/claude.client.js";
import { getStrategy } from "../strategy/strategy-registry.js";
import type { ClaudeAnalysisResult, ScoredCandidate } from "../types.js";
import { nowIso } from "../utils/time.js";

export class ClaudeAnalystAgent {
  constructor(private readonly claude = new ClaudeClient()) {}

  async analyze(mode: string, candidates: ScoredCandidate[]): Promise<ClaudeAnalysisResult> {
    const pools = candidates.slice(0, config.scan.maxClaudePoolCount);
    const payload = {
      timestamp: nowIso(),
      mode,
      candidateCount: pools.length,
      pools: pools.map((pool) => ({
        poolAddress: pool.poolAddress,
        pair: pool.pair,
        score: pool.score,
        classification: pool.classification,
        risk: pool.risk,
        localStrategy: pool.localStrategy,
        tvl: pool.tvl,
        volume24h: pool.volume24h,
        fee24h: pool.fee24h,
        feeTvl24h: pool.feeTvl24h,
        apr24h: pool.apr24h,
        binStep: pool.binStep,
        volumeTvlRatio: pool.volumeTvlRatio,
        poolAgeHours: pool.poolAgeHours
      }))
    };

    const raw = await this.claude.analyze(getStrategy(config.strategy.profile).analystPrompt, payload);
    return parseClaudeResult(raw, pools);
  }
}

const VALID_DECISIONS = new Set(["ENTER_SMALL", "WATCHLIST", "PAPER_ONLY", "AVOID"]);
const VALID_STRATEGIES = new Set(["CURVE", "SPOT", "BID_ASK", "AVOID"]);
const VALID_RANGES = new Set(["NARROW", "MEDIUM", "WIDE", "NONE"]);

function parseClaudeResult(raw: string, candidates: ScoredCandidate[]): ClaudeAnalysisResult {
  try {
    const parsed = JSON.parse(stripFence(raw)) as Omit<ClaudeAnalysisResult, "agent" | "timestamp"> & Partial<ClaudeAnalysisResult>;
    if (Array.isArray(parsed.results)) {
      const results = parsed.results
        .filter((item) => item && typeof item.poolAddress === "string" && item.poolAddress && typeof item.pair === "string" && item.pair)
        .map((item) => ({
          poolAddress: item.poolAddress,
          pair: item.pair,
          decision: VALID_DECISIONS.has(item.decision) ? item.decision : "PAPER_ONLY",
          strategy: VALID_STRATEGIES.has(item.strategy) ? item.strategy : "AVOID",
          range: VALID_RANGES.has(item.range) ? item.range : "NONE",
          maxAllocation: typeof item.maxAllocation === "string" ? item.maxAllocation : "0%",
          mainReason: typeof item.mainReason === "string" ? item.mainReason : "No reason provided by analyst output.",
          exitRule: typeof item.exitRule === "string" ? item.exitRule : "Review manually; analyst output omitted an exit rule.",
          confidence: Number.isFinite(item.confidence) ? item.confidence : 0
        }));
      return {
        agent: "Claude Analyst Agent",
        timestamp: parsed.timestamp ?? nowIso(),
        results,
        bestPool: typeof parsed.bestPool === "string" ? parsed.bestPool : "",
        safestPool: typeof parsed.safestPool === "string" ? parsed.safestPool : "",
        highestFeeOpportunity: typeof parsed.highestFeeOpportunity === "string" ? parsed.highestFeeOpportunity : "",
        avoidList: Array.isArray(parsed.avoidList) ? parsed.avoidList.filter((item): item is string => typeof item === "string") : [],
        summary: typeof parsed.summary === "string" ? parsed.summary : ""
      };
    }
  } catch {
    // Safe fallback keeps the workflow useful when Claude returns non-JSON.
  }

  return {
    agent: "Claude Analyst Agent",
    timestamp: nowIso(),
    results: candidates.map((candidate) => ({
      poolAddress: candidate.poolAddress,
      pair: candidate.pair,
      decision: candidate.score >= 85 ? "WATCHLIST" : "PAPER_ONLY",
      strategy: candidate.localStrategy,
      range: candidate.localStrategy === "CURVE" ? "NARROW" : candidate.localStrategy === "BID_ASK" ? "WIDE" : "MEDIUM",
      maxAllocation: candidate.localStrategy === "BID_ASK" ? "0.5-2%" : candidate.localStrategy === "CURVE" ? "5-10%" : "2-5%",
      mainReason: "Fallback result because Claude output was unavailable or not valid JSON.",
      exitRule: "Exit paper position if TVL, volume, or fee/TVL deteriorates.",
      confidence: Math.min(candidate.score, 75)
    })),
    bestPool: candidates[0]?.poolAddress ?? "",
    safestPool: candidates.find((candidate) => candidate.risk === "LOW")?.poolAddress ?? candidates[0]?.poolAddress ?? "",
    highestFeeOpportunity: [...candidates].sort((a, b) => b.feeTvl24h - a.feeTvl24h)[0]?.poolAddress ?? "",
    avoidList: [],
    summary: "Fallback compact analysis."
  };
}

function stripFence(value: string): string {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}
