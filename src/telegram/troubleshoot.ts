export interface TroubleshootInput {
  command: string;
  agent: string;
  step: string;
  status?: string;
  error: unknown;
  suggestedFix?: string;
}

export function formatTroubleshootReport(input: TroubleshootInput): string {
  return [
    "🛠 Troubleshoot Report",
    "",
    `Time: ${new Date().toISOString()}`,
    `Command: ${input.command}`,
    `Agent: ${input.agent}`,
    `Step: ${input.step}`,
    `Status: ${input.status ?? "ERROR"}`,
    `Error: ${input.error instanceof Error ? input.error.message : String(input.error)}`,
    `Suggested Fix: ${input.suggestedFix ?? commonSuggestedFix(input.error)}`
  ].join("\n");
}

function commonSuggestedFix(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/TELEGRAM_CHAT_ID/i.test(message)) return "Set TELEGRAM_CHAT_ID to the numeric group ID, not a bot username.";
  if (/topic/i.test(message)) return "Set the missing *_TOPIC_ID value using the topic message_thread_id.";
  if (/403|admin|permission/i.test(message)) return "Ensure the Lio bot is in the group and has permission to post in forum topics.";
  if (/DeepSeek/i.test(message)) return "Set DEEPSEEK_API_KEY and DEEPSEEK_BASE_URL.";
  if (/Claude|Anthropic/i.test(message)) return "Set ANTHROPIC_API_KEY and CLAUDE_ANALYST_MODEL.";
  if (/Meteora/i.test(message)) return "Check METEORA_API_BASE_URL when real scanning is enabled.";
  return "Check TELEGRAM_CHAT_ID, topic IDs, bot permissions, model env values, and Hermes config.";
}
