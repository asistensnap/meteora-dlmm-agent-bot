import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["TELEGRAM_BOT_TOKEN", "CLAUDE_API_KEY", "*.apiKey", "*.botToken"],
    censor: "[redacted]"
  }
});
