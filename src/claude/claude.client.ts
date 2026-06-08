import axios from "axios";
import { config } from "../config.js";

export class ClaudeClient {
  async analyze(system: string, payload: unknown): Promise<string> {
    if (!config.anthropic.apiKey) {
      throw new Error("Claude API key missing. Set CLAUDE_API_KEY in .env to enable final analysis.");
    }

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: config.anthropic.model,
        system,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
        max_tokens: 1600,
        temperature: 0.2
      },
      {
        timeout: 30_000,
        headers: {
          "content-type": "application/json",
          "x-api-key": config.anthropic.apiKey,
          "anthropic-version": "2023-06-01"
        }
      }
    );

    const content = response.data?.content;
    if (!Array.isArray(content)) return "";
    return content.find((part: { type?: string; text?: string }) => part.type === "text")?.text ?? "";
  }
}
