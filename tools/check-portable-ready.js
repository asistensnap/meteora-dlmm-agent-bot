import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const hermesRootEnv = path.join(process.env.LOCALAPPDATA || "", "hermes", ".env");
const hermesLioEnv = path.join(process.env.LOCALAPPDATA || "", "hermes", "profiles", "telegram-lio", ".env");
const env = {
  ...readEnv(hermesRootEnv),
  ...readEnv(hermesLioEnv),
  ...readEnv(envPath)
};
const checks = [];

check("Node.js >= 20", Number(process.versions.node.split(".")[0]) >= 20, process.versions.node);
check(".env exists", fs.existsSync(envPath), ".env");
check("package-lock exists", fs.existsSync(path.join(root, "package-lock.json")), "package-lock.json");
check("SQLite data dir exists", fs.existsSync(path.join(root, "data")), "data/");
check("Telegram Lio token", Boolean(env.LIO_TELEGRAM_BOT_TOKEN), "required for Telegram gateway");
check("Telegram chat id", Boolean(env.TELEGRAM_CHAT_ID || env.TELEGRAM_GROUP_CHAT_ID), "numeric private/group id");
check("DeepSeek key", Boolean(env.DEEPSEEK_API_KEY), "required for Lio/Cala real model calls");
check("Anthropic key", Boolean(env.ANTHROPIC_API_KEY), "required for Konlin real Claude calls");
check("Trade Log topic", Boolean(env.TRADE_LOG_TOPIC_ID), "optional but recommended");

const meridianPath = resolveMeridianPath(env);
check("Meridian engine path", fs.existsSync(meridianPath), meridianPath);
check("Meridian package", fs.existsSync(path.join(meridianPath, "package.json")), "package.json");
check("Meridian env", fs.existsSync(path.join(meridianPath, ".env")), ".env");

const meridianEnv = fs.existsSync(path.join(meridianPath, ".env"))
  ? dotenv.parse(fs.readFileSync(path.join(meridianPath, ".env")))
  : {};
check("Meridian OpenRouter key", Boolean(meridianEnv.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY), "required for auto engine");
check("Meridian RPC URL", Boolean(meridianEnv.RPC_URL || env.RPC_URL), "required for live");
check("Meridian Helius key", Boolean(meridianEnv.HELIUS_API_KEY || env.HELIUS_API_KEY), "required for live");
check("Meridian wallet private key", Boolean(meridianEnv.WALLET_PRIVATE_KEY || env.WALLET_PRIVATE_KEY), "required for live only");

console.log("\nPortable readiness check");
console.log("========================");
for (const item of checks) {
  console.log(`${item.pass ? "OK " : "MISS"} ${item.name}: ${item.detail}`);
}

const missing = checks.filter((item) => !item.pass);
console.log("\nResult:", missing.length === 0 ? "READY" : "NOT READY");
if (missing.length) {
  console.log("\nMissing:");
  for (const item of missing) console.log(`- ${item.name}: ${item.detail}`);
}

function check(name, pass, detail) {
  checks.push({ name, pass, detail });
}

function resolveMeridianPath(values) {
  const configured = values.MERIDIAN_ENGINE_PATH || "../meridian-upstream";
  return path.isAbsolute(configured) ? configured : path.resolve(root, configured);
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return dotenv.parse(fs.readFileSync(file));
}
