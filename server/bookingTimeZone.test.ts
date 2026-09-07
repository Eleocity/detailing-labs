import { describe, expect, it } from "vitest";
import {
  chicagoTodayAsLocalDate,
  chicagoWallTimeToUtcDate,
  toDateKey,
} from "../shared/bookingTimeZone";

/**
 * Regression coverage for the booking-wizard timezone bug: a wall-clock
 * time selected in the wizard must always resolve to the UTC instant for
 * that time in America/Chicago, regardless of which timezone the code
 * actually runs in. These tests run in Node's default (UTC) test
 * environment, which wouldn't have caught the original bug (browser-local
 * interpretation) — so each case also asserts the exact expected UTC
 * instant, not just "doesn't equal the naive result", to catch a
 * regression even if the runner's own timezone happens to be Chicago.
 */
describe("chicagoWallTimeToUtcDate", () => {
  it("9:00 AM in September (CDT, UTC-5) resolves to 14:00 UTC", () => {
    const dt = chicagoWallTimeToUtcDate("2026-09-07", "09:00");
    expect(dt.toISOString()).toBe("2026-09-07T14:00:00.000Z");
  });

  it("10:00 AM in September (CDT, UTC-5) resolves to 15:00 UTC", () => {
    const dt = chicagoWallTimeToUtcDate("2026-09-09", "10:00");
    expect(dt.toISOString()).toBe("2026-09-09T15:00:00.000Z");
  });

  it("matches the two real bookings this bug was found from", () => {
    // FA-MTQNVH4J-0TA: labeled ~9:00 AM Sep 7, was wrongly stored as
    // 2026-09-07T16:00:00.000Z (11:00 AM CT) — should be 14:00Z.
    expect(
      chicagoWallTimeToUtcDate("2026-09-07", "09:00").toISOString()
    ).toBe("2026-09-07T14:00:00.000Z");
    expect(
      chicagoWallTimeToUtcDate("2026-09-07", "09:00").toISOString()
    ).not.toBe("2026-09-07T16:00:00.000Z");

    // FA-MTQNS203-SRQ: labeled 10:00 AM Sep 9, was wrongly stored as
    // 2026-09-09T17:00:00.000Z (12:00 PM CT) — should be 15:00Z.
    expect(
      chicagoWallTimeToUtcDate("2026-09-09", "10:00").toISOString()
    ).toBe("2026-09-09T15:00:00.000Z");
    expect(
      chicagoWallTimeToUtcDate("2026-09-09", "10:00").toISOString()
    ).not.toBe("2026-09-09T17:00:00.000Z");
  });

  it("9:00 AM in January (CST, UTC-6) resolves to 15:00 UTC — DST-aware", () => {
    const dt = chicagoWallTimeToUtcDate("2026-01-15", "09:00");
    expect(dt.toISOString()).toBe("2026-01-15T15:00:00.000Z");
  });

  it("handles the spring-forward DST boundary correctly", () => {
    // 2026-03-08 is the US spring-forward date; 3:00 AM local doesn't
    // exist, but a 9:00 AM slot (well after the 2:00 AM transition) should
    // resolve using the new CDT (UTC-5) offset.
    const dt = chicagoWallTimeToUtcDate("2026-03-08", "09:00");
    expect(dt.toISOString()).toBe("2026-03-08T14:00:00.000Z");
  });

  it("handles the fall-back DST boundary correctly", () => {
    // 2026-11-01 is the US fall-back date; a 9:00 AM slot is well after the
    // 2:00 AM transition and should use the new CST (UTC-6) offset.
    const dt = chicagoWallTimeToUtcDate("2026-11-01", "09:00");
    expect(dt.toISOString()).toBe("2026-11-01T15:00:00.000Z");
  });

  it("half-hour slots resolve correctly", () => {
    const dt = chicagoWallTimeToUtcDate("2026-09-07", "14:30");
    expect(dt.toISOString()).toBe("2026-09-07T19:30:00.000Z");
  });
});

describe("toDateKey", () => {
  it("formats a local Date as YYYY-MM-DD using its own local fields", () => {
    expect(toDateKey(new Date(2026, 8, 7))).toBe("2026-09-07");
  });

  it("zero-pads single-digit months and days", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("chicagoTodayAsLocalDate", () => {
  it("returns a Date at local midnight (no time-of-day component)", () => {
    const today = chicagoTodayAsLocalDate();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
  });
});
