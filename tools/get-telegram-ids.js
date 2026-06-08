import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envFiles = [
  path.join(cwd, ".env"),
  path.join(process.env.LOCALAPPDATA ?? "", "hermes", "profiles", "telegram-lio", ".env"),
  path.join(process.env.LOCALAPPDATA ?? "", "hermes", ".env")
];

for (const file of envFiles) {
  if (fs.existsSync(file)) dotenv.config({ path: file, override: false });
}

const token = process.env.LIO_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("Missing LIO_TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN. The token is not printed by this tool.");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
if (!response.ok) {
  console.error(`Telegram getUpdates failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const body = await response.json();
const updates = Array.isArray(body.result) ? body.result.slice(-20) : [];

console.log("Recent Telegram updates (token hidden):");
console.log("");

for (const update of updates) {
  const message = update.message || update.channel_post || update.edited_message || update.edited_channel_post;
  if (!message) continue;
  const chat = message.chat || {};
  const topicName = message.forum_topic_created?.name;
  console.log(JSON.stringify({
    update_id: update.update_id,
    chat_id: chat.id,
    chat_title: chat.title,
    chat_type: chat.type,
    message_thread_id: message.message_thread_id,
    forum_topic_created_name: topicName,
    text: message.text
  }, null, 2));
  console.log("");
}

console.log("Use these values:");
console.log("- TELEGRAM_CHAT_ID = chat_id for your one Telegram group, usually -100xxxxxxxxxx");
console.log("- OPERATOR_TOPIC_ID = message_thread_id for 🧭 Operator");
console.log("- SCREENING_TOPIC_ID = message_thread_id for 🔎 Screening");
console.log("- ANALYST_TOPIC_ID = message_thread_id for 🧠 Analyst");
console.log("- SYSTEM_TOPIC_ID = message_thread_id for 📡 System");
console.log("- RESULT_TOPIC_ID = message_thread_id for 📊 Result");
console.log("- ENTRY_TOPIC_ID = message_thread_id for 🚀 Entry");
console.log("- TROUBLESHOOT_TOPIC_ID = message_thread_id for 🛠 Troubleshoot");
console.log("");
console.log("Bot usernames like @Liocala_bot are not chat IDs.");
