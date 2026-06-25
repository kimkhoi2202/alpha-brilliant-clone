/** Local calendar-date helpers: the unit the daily streak is tracked in. */

export function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's local date as `YYYY-MM-DD`. */
export const today = (): string => dateStr(new Date());

/** Yesterday's local date as `YYYY-MM-DD`. */
export function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
}
