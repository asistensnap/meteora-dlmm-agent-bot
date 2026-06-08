import { config } from "../config.js";
import { ClaudeClient } from "../claude/claude.client.js";
import { CLAUDE_ANALYST_PROMPT } from "../claude/prompts.js";
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

    const raw = await this.claude.analyze(CLAUDE_ANALYST_PROMPT, payload);
    return parseClaudeResult(raw, pools);
  }
}

function parseClaudeResult(raw: string, candidates: ScoredCandidate[]): ClaudeAnalysisResult {
  try {
    const parsed = JSON.parse(stripFence(raw)) as Omit<ClaudeAnalysisResult, "agent" | "timestamp"> & Partial<ClaudeAnalysisResult>;
    if (Array.isArray(parsed.results)) {
      return {
        agent: "Claude Analyst Agent",
        timestamp: parsed.timestamp ?? nowIso(),
        results: parsed.results,
        bestPool: parsed.bestPool ?? "",
        safestPool: parsed.safestPool ?? "",
        highestFeeOpportunity: parsed.highestFeeOpportunity ?? "",
        avoidList: parsed.avoidList ?? [],
        summary: parsed.summary ?? ""
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
