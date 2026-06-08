import { spawn } from "node:child_process";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });

const mode = process.argv.includes("--live") ? "live" : "dry-run";
const meridianDir = resolveMeridianDir();
if (!fs.existsSync(path.join(meridianDir, "package.json"))) {
  console.error(`Meridian engine not found: ${meridianDir}`);
  process.exit(1);
}

const setupArgs = ["tools/setup-meridian-full-auto.js"];
if (mode === "live") setupArgs.push("--live");
const setup = spawn(process.execPath, setupArgs, { cwd: root, stdio: "inherit", shell: false });
setup.on("exit", (code) => {
  if (code !== 0) process.exit(code ?? 1);
  if (mode === "live") {
    const env = readEnv(path.join(meridianDir, ".env"));
    const missing = ["WALLET_PRIVATE_KEY", "RPC_URL", "OPENROUTER_API_KEY", "HELIUS_API_KEY"].filter((key) => !env[key]);
    if (missing.length) {
      console.error(`LIVE BLOCKED. Missing: ${missing.join(", ")}`);
      process.exit(1);
    }
    if (env.DRY_RUN !== "false") {
      console.error("LIVE BLOCKED. DRY_RUN is not false.");
      process.exit(1);
    }
  }
  const command = mode === "live" ? "start" : "dev";
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", command], { cwd: meridianDir, stdio: "inherit", shell: false });
  child.on("exit", (childCode) => process.exit(childCode ?? 0));
});

function resolveMeridianDir() {
  const configured = normalizeWindowsEnvPath(process.env.MERIDIAN_ENGINE_PATH || "../meridian-upstream");
  return path.isAbsolute(configured) ? configured : path.resolve(root, configured);
}

function normalizeWindowsEnvPath(value) {
  if (process.platform !== "win32") return value;
  return value
    .replace(/^([A-Za-z]):Users\\/, "$1:\\Users\\")
    .replace(/^([A-Za-z]):\\?C:\\/, "C:\\");
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return dotenv.parse(fs.readFileSync(file));
}
