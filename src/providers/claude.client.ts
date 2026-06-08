import { config } from "../config.js";

export class ClaudeProviderClient {
  describe(): string {
    return config.providers.anthropic.analystModel ?? "CLAUDE_ANALYST_MODEL not set";
  }
}
