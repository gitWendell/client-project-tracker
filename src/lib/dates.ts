/**
 * Date handling for the app.
 *
 * Projects carry *calendar dates*, not instants. Everything is normalised to
 * UTC midnight on the way in and back to `YYYY-MM-DD` on the way out, so a
 * due date never drifts by a day depending on the server's timezone.
 */

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses `YYYY-MM-DD` into a UTC-midnight Date, or returns `null` when the
 * string is malformed or not a real calendar date (e.g. `2026-02-31`).
 */
export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // `Date.UTC` silently rolls over impossible dates (Feb 31 -> Mar 3),
  // so round-trip the parts to confirm the input was a real date.
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealDate ? date : null;
}

/** Formats a Date as `YYYY-MM-DD`, the wire format used by the API. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats `YYYY-MM-DD` for display, e.g. `01 Jun 2026`.
 *
 * Built by hand rather than with `Intl.DateTimeFormat`, whose abbreviations
 * vary by locale and ICU version — "Sept" next to "Jul" in the same column
 * looks like a bug. This is identical everywhere it runs.
 */
export function formatDisplayDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  if (!date) return isoDate;

  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Today's calendar date as `YYYY-MM-DD`, in the viewer's local timezone. */
export function todayIsoDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return toIsoDate(local);
}

/** Whole days from `from` to `to`; negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
