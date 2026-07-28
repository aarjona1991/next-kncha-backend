import { POLL_CLOSE_HOURS_BEFORE } from "@/types/models";

/** Effective start used for poll close: startsAt or end of approxDate (UTC). */
export function effectiveEventStart(
  approxDate: string,
  startsAt: string | null,
): Date {
  if (startsAt) return new Date(startsAt);
  const [y, m, d] = approxDate.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 23, 59, 59));
}

export function shouldClosePoll(
  approxDate: string,
  startsAt: string | null,
  now = new Date(),
): boolean {
  const start = effectiveEventStart(approxDate, startsAt);
  const closeAt = new Date(
    start.getTime() - POLL_CLOSE_HOURS_BEFORE * 60 * 60 * 1000,
  );
  return now.getTime() >= closeAt.getTime();
}

export function nowIso() {
  return new Date().toISOString();
}
