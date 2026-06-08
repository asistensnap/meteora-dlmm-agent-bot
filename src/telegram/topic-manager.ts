import { config } from "../config.js";

export const TOPIC_NAMES = {
  OPERATOR: "🧭 Operator",
  SCREENING: "🔎 Screening",
  ANALYST: "🧠 Analyst",
  SYSTEM: "📡 System",
  RESULT: "📊 Result",
  ENTRY: "🚀 Entry",
  TRADE_LOG: "Trade Log",
  TROUBLESHOOT: "🛠 Troubleshoot"
} as const;

export type TopicKey = keyof typeof TOPIC_NAMES;

export const SUPPORTED_TOPICS = Object.keys(TOPIC_NAMES) as TopicKey[];

export function getTopicId(topic: TopicKey): number | undefined {
  return config.telegram.topics[topic];
}

export function topicStatusLines(): string[] {
  return SUPPORTED_TOPICS.map((topic) => {
    const id = getTopicId(topic);
    return `${TOPIC_NAMES[topic]} (${topic}): ${id ? `READY message_thread_id=${id}` : "MISSING"}`;
  });
}

export function missingTopics(): TopicKey[] {
  return SUPPORTED_TOPICS.filter((topic) => !getTopicId(topic));
}
