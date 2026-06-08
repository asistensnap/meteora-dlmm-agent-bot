import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const PROJECT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..").replace(/^\/([A-Za-z]:)/, "$1");
const HERMES_PROFILE_DIR = path.join(process.env.LOCALAPPDATA || "", "hermes", "profiles", "telegram-lio");
const HERMES_ROOT_DIR = path.join(process.env.LOCALAPPDATA || "", "hermes");

for (const file of [
  path.join(PROJECT_DIR, ".env"),
  path.join(HERMES_PROFILE_DIR, ".env"),
  path.join(HERMES_ROOT_DIR, ".env")
]) {
  if (fs.existsSync(file)) {
    const parsed = dotenv.parse(fs.readFileSync(file));
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key] || process.env[key]?.trim() === "") process.env[key] = value;
    }
  }
}

const token = firstDefined(process.env.LIO_TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_BOT_TOKEN);
const privateChatId = firstDefined(process.env.TELEGRAM_CHAT_ID, "1186081518");
const configuredGroupId = firstDefined(process.env.TELEGRAM_GROUP_CHAT_ID, process.env.TELEGRAM_GROUP_ALLOWED_CHATS);

if (!token) {
  console.error("LIO_TELEGRAM_BOT_TOKEN is missing. Add token for @Liocala_bot.");
  process.exit(1);
}

const summary = {
  getMe: false,
  username: "",
  privateTestMessage: false,
  updates: [],
  groupChatId: configuredGroupId || "",
  createTopicAttempted: false,
  createdTopics: {},
  topicErrors: {}
};

const me = await telegram("getMe");
summary.getMe = Boolean(me.ok);
summary.username = me.result?.username ? `@${me.result.username}` : "";

if (privateChatId && /^-?\d+$/.test(privateChatId)) {
  const sent = await telegram("sendMessage", {
    chat_id: privateChatId,
    text: "[SYSTEM]\nHermes/Lio Telegram direct setup check: READY\nDummy workflow router is installed.\nAuto entry disabled."
  });
  summary.privateTestMessage = Boolean(sent.ok);
  if (!sent.ok) summary.privateTestError = sent.description;
}

const updates = await telegram("getUpdates", { limit: 50, timeout: 0 });
if (updates.ok && Array.isArray(updates.result)) {
  summary.updates = updates.result.map((update) => {
    const message = update.message || update.channel_post || update.edited_message || update.edited_channel_post;
    return {
      chat_id: message?.chat?.id,
      chat_title: message?.chat?.title,
      chat_type: message?.chat?.type,
      is_forum: message?.chat?.is_forum,
      message_thread_id: message?.message_thread_id,
      forum_topic_created_name: message?.forum_topic_created?.name,
      text: message?.text
    };
  }).filter((item) => item.chat_id);
  const detectedGroup = summary.updates.find((item) => String(item.chat_id).startsWith("-100"));
  if (detectedGroup?.chat_id) summary.groupChatId = String(detectedGroup.chat_id);
}

if (summary.groupChatId && String(summary.groupChatId).startsWith("-100")) {
  summary.createTopicAttempted = true;
  for (const name of ["🧭 Operator", "🔎 Screening", "🧠 Analyst", "📡 System", "📊 Result", "🚀 Entry", "🛠 Troubleshoot"]) {
    const result = await telegram("createForumTopic", { chat_id: summary.groupChatId, name });
    if (result.ok) {
      summary.createdTopics[name] = result.result?.message_thread_id;
    } else {
      summary.topicErrors[name] = result.description || "Unknown Telegram error";
    }
  }
}

console.log(JSON.stringify(summary, null, 2));
console.log("");
console.log("Token hidden. Put created message_thread_id values into OPERATOR_TOPIC_ID, SCREENING_TOPIC_ID, ANALYST_TOPIC_ID, SYSTEM_TOPIC_ID, RESULT_TOPIC_ID, ENTRY_TOPIC_ID, and TROUBLESHOOT_TOPIC_ID.");

async function telegram(method, body = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return await response.json();
}

function firstDefined(...values) {
  return values.find((value) => value && String(value).trim().length > 0)?.trim();
}
