/**
 * Chicago-timezone date/time helpers for the booking wizard.
 *
 * Forma is a Chicago-timezone business — every date/time the booking wizard
 * shows or submits must be anchored to America/Chicago, not the visiting
 * device's own timezone. Without this, a customer/tester whose device is
 * set to e.g. Pacific time has their selected "9:00 AM" silently
 * reinterpreted as 9:00 AM Pacific, then converted to UTC and stored as if
 * it were 11:00 AM Chicago — a real, verified bug (see
 * docs/BOOKING_TIMEZONE_FIX.md for the before/after evidence).
 */

export const BOOKING_TIME_ZONE = "America/Chicago";

/**
 * Today's calendar date as understood in America/Chicago, not the caller's
 * own timezone — returned as a local-midnight Date so it composes with
 * ordinary local-Date calendar arithmetic (getFullYear/getMonth/getDate,
 * direct Date comparisons, etc).
 */
export function chicagoTodayAsLocalDate(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) =>
    Number(parts.find(p => p.type === type)?.value);
  return new Date(get("year"), get("month") - 1, get("day"));
}

/**
 * "YYYY-MM-DD" from a Date's own local fields — never via toISOString(),
 * which reads UTC fields and can land on a different calendar day than the
 * one actually rendered by a local-Date-based calendar grid whenever the
 * caller's timezone is ahead of UTC.
 */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Converts a wall-clock date + time (as selected in the wizard) to the UTC
 * instant it represents in America/Chicago — independent of the caller's
 * own timezone, and DST-aware (uses the real Chicago offset for that
 * specific date, CDT or CST, rather than a hardcoded one). This is the fix
 * for the core bug: `new Date(\`${date}T${time}:00\`)` silently interprets
 * the wall-clock string in the *local* timezone of whoever's running it.
 *
 * Standard "guess and correct" technique: treat the wall-clock time as if
 * it were already UTC, see what wall-clock time that guess actually renders
 * as in Chicago, then shift by the difference. One correction is enough
 * since America/Chicago's UTC offset is always a whole number of hours.
 */
export function chicagoWallTimeToUtcDate(
  isoDate: string,
  timeValue: string
): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (type: string) =>
    Number(parts.find(p => p.type === type)?.value);
  const renderedAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute")
  );

  guess += guess - renderedAsUtc;
  return new Date(guess);
}
