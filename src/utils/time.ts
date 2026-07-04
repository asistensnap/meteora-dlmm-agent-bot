import dayjs from "dayjs";

export function nowIso(): string {
  return new Date().toISOString();
}

// Pools without a creation timestamp are treated as old (passes min-age gates).
// An unparseable timestamp must behave the same as a missing one, not as age 0.
const UNKNOWN_AGE_HOURS = 24 * 365;

export function ageHoursFrom(createdAt?: string): number {
  if (!createdAt) return UNKNOWN_AGE_HOURS;
  const created = dayjs(createdAt);
  if (!created.isValid()) return UNKNOWN_AGE_HOURS;
  return Math.max(0, dayjs().diff(created, "hour", true));
}
