import dayjs from "dayjs";

export function nowIso(): string {
  return new Date().toISOString();
}

export function ageHoursFrom(createdAt?: string): number {
  if (!createdAt) return 24 * 365;
  const created = dayjs(createdAt);
  if (!created.isValid()) return 0;
  return Math.max(0, dayjs().diff(created, "hour", true));
}
