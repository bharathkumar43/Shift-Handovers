/**
 * Converts a `YYYY-MM-DD` path/query segment to a `Date` for Prisma `@db.Date` / PostgreSQL `DATE`.
 *
 * `new Date("2026-04-17")` is parsed as **UTC midnight**, which in many time zones becomes the
 * **previous calendar day** when converted for storage — so saves and loads could use different
 * dates and a refresh would appear to "lose" the draft.
 *
 * Using **noon UTC** keeps the calendar day stable across common server/client time zones.
 */
export function dateParamToDbDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return new Date(dateStr);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return new Date(dateStr);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}
