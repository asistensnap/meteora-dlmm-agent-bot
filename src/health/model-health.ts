import { getProviderStatus } from "../config.js";

export function modelHealth(): { deepseek: "READY" | "MISSING"; claude: "READY" | "MISSING" } {
  const status = getProviderStatus();
  return {
    deepseek: status.deepseek === "configured" ? "READY" : "MISSING",
    claude: status.anthropic === "configured" ? "READY" : "MISSING"
  };
}
