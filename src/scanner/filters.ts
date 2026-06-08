import { config } from "../config.js";
import type { ScoredCandidate } from "../types.js";

export function isAlertCandidate(candidate: ScoredCandidate): boolean {
  return candidate.score >= config.scan.alertScoreThreshold && candidate.localStrategy !== "AVOID";
}
