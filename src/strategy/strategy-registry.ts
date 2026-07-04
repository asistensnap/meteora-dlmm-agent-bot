import { CLAUDE_ANALYST_PROMPT, EVILPANDA_ANALYST_PROMPT, HERON_ANALYST_PROMPT } from "../claude/prompts.js";
import { EVILPANDA_STRATEGY_NAME, evilPandaStrategyPrompt } from "./evilpanda-strategy.js";
import { HERON_STRATEGY_NAME, heronStrategyPrompt } from "./heron-strategy.js";

export type StrategyProfile = "EVILPANDA" | "HERON" | "DEFAULT";

export interface StrategyEntry {
  profile: StrategyProfile;
  name: string;
  analystPrompt: string;
  rulesPrompt: () => string;
}

const registry: Record<StrategyProfile, StrategyEntry> = {
  DEFAULT: {
    profile: "DEFAULT",
    name: "Default Analyst",
    analystPrompt: CLAUDE_ANALYST_PROMPT,
    rulesPrompt: () => "Default analyst profile (no strategy overlay)."
  },
  EVILPANDA: {
    profile: "EVILPANDA",
    name: EVILPANDA_STRATEGY_NAME,
    analystPrompt: EVILPANDA_ANALYST_PROMPT,
    rulesPrompt: evilPandaStrategyPrompt
  },
  HERON: {
    profile: "HERON",
    name: HERON_STRATEGY_NAME,
    analystPrompt: HERON_ANALYST_PROMPT,
    rulesPrompt: heronStrategyPrompt
  }
};

export function getStrategy(profile: StrategyProfile): StrategyEntry {
  return registry[profile] ?? registry.DEFAULT;
}
