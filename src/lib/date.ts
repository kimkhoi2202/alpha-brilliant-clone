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

/** Monday-based start of the week containing `d`, as `YYYY-MM-DD`. */
export function weekStart(d: Date = new Date()): string {
  const x = new Date(d);
  const dayFromMonday = (x.getDay() + 6) % 7; // Sun=6 … Mon=0
  x.setDate(x.getDate() - dayFromMonday);
  return dateStr(x);
}

/** The last `n` local dates (oldest first), inclusive of today. */
export function lastNDays(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    out.push(dateStr(d));
  }
  return out;
}

/** Whole days remaining until the week rolls over (Sun → 0). */
export function daysLeftInWeek(d: Date = new Date()): number {
  return 6 - ((d.getDay() + 6) % 7);
}
