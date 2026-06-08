import { config } from "../config.js";

const lastAlertByPool = new Map<string, number>();

export function isDuplicateAlert(poolAddress: string, now = Date.now()): boolean {
  const lastAlert = lastAlertByPool.get(poolAddress);
  if (!lastAlert) return false;
  return now - lastAlert < config.scan.duplicateAlertCooldownMinutes * 60_000;
}

export function markAlerted(poolAddress: string, now = Date.now()): void {
  lastAlertByPool.set(poolAddress, now);
}
