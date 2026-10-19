export function recentlyRestocked(date: string | Date | null | undefined, now = Date.now()) {
  if (!date) return false;
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) && timestamp <= now && timestamp >= now - 30 * 24 * 60 * 60 * 1000;
}
