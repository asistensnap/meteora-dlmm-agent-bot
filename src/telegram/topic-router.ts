import type TelegramBot from "node-telegram-bot-api";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { getTopicId, TOPIC_NAMES, type TopicKey } from "./topic-manager.js";

export class TopicRouter {
  constructor(private readonly bot: TelegramBot) {}

  async sendToTopic(topic: TopicKey, message: string, fallbackChatId?: number | string): Promise<number | undefined> {
    const topicId = getTopicId(topic);
    const chatId = topicId ? config.telegram.groupChatId ?? config.telegram.chatId ?? fallbackChatId : config.telegram.chatId ?? fallbackChatId;
    if (!chatId) {
      logger.warn({ topic }, "Cannot send Telegram message because TELEGRAM_CHAT_ID is missing");
      return undefined;
    }

    const text = topicId ? message : `[${topic}]\n${message}`;

    try {
      const sent = await this.bot.sendMessage(chatId, text, topicId ? { message_thread_id: topicId } : undefined);
      if (!topicId) {
        logger.warn({ topic, topicName: TOPIC_NAMES[topic] }, "Telegram topic ID missing; sent to main chat");
        await this.warnMissingTopic(topic, chatId);
      }
      return sent.message_id;
    } catch (error) {
      logger.error({ err: error, topic }, "Failed to send Telegram topic message");
      if (topic !== "TROUBLESHOOT") {
        await this.safeTroubleshoot(`Troubleshoot Report\nTime: ${new Date().toISOString()}\nCommand: topic-send\nAgent: Lio\nStep: sendToTopic(${topic})\nError: ${error instanceof Error ? error.message : String(error)}\nSuggested Fix: Check TELEGRAM_CHAT_ID, topic IDs, and bot group permissions.`, chatId);
      }
      return undefined;
    }
  }

  private async warnMissingTopic(topic: TopicKey, chatId: number | string): Promise<void> {
    if (topic === "TROUBLESHOOT") return;
    const troubleshootId = getTopicId("TROUBLESHOOT");
    if (!troubleshootId) return;
    await this.safeTroubleshoot(
      `Troubleshoot Report\nTime: ${new Date().toISOString()}\nCommand: topic-router\nAgent: Lio\nStep: topic lookup\nError: Missing topic ID for ${topic} (${TOPIC_NAMES[topic]})\nSuggested Fix: Set ${topic}_TOPIC_ID to the topic message_thread_id.`,
      chatId
    );
  }

  private async safeTroubleshoot(message: string, chatId: number | string): Promise<void> {
    const troubleshootId = getTopicId("TROUBLESHOOT");
    try {
      await this.bot.sendMessage(chatId, message, troubleshootId ? { message_thread_id: troubleshootId } : undefined);
    } catch (error) {
      logger.error({ err: error }, "Failed to send troubleshoot warning");
    }
  }
}
