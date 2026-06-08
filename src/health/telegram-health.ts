import { getTelegramStatus } from "../config.js";
import { missingTopics, topicStatusLines } from "../telegram/topic-manager.js";

export function telegramHealth(): { group: "READY" | "ERROR"; topics: "READY" | "MISSING"; lines: string[] } {
  return {
    group: getTelegramStatus() === "configured" ? "READY" : "ERROR",
    topics: missingTopics().length === 0 ? "READY" : "MISSING",
    lines: topicStatusLines()
  };
}
