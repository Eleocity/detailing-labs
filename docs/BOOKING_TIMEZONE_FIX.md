# Booking wizard timezone fix

## Symptom

UI slot labels didn't match the stored `appointmentDate` / Urable Job start
in America/Chicago — verified against two real bookings:

| Booking          | UI label         | DB ISO                     | Instant in CT |
| ----------------- | ----------------- | --------------------------- | ------------- |
| FA-MTQNVH4J-0TA   | ~9:00 AM Sep 7    | `2026-09-07T16:00:00.000Z` | 11:00 AM CT   |
| FA-MTQNS203-SRQ   | 10:00 AM Sep 9    | `2026-09-09T17:00:00.000Z` | 12:00 PM CT   |

Pattern: **+2 hours** vs. the labeled Chicago wall time.

## Root cause

`client/src/pages/Booking.tsx`'s submit handler built the appointment
instant like this:

```ts
const dt = new Date(`${data.appointmentDate}T${data.appointmentTime}:00`);
```

A datetime string with no `Z`/offset is parsed by JS as **local time of
whoever's running the code** — the customer's or tester's browser, not
Forma's business timezone (America/Chicago). Whoever produced the two
example bookings had a browser set to Pacific time: Pacific is exactly 2
hours behind Chicago, which is exactly the drift observed (9:00 AM
interpreted as Pacific → stored as 16:00 UTC → redisplayed as 11:00 AM
Chicago).

The same category of bug existed in three more places, all bridging a
locally-constructed `Date` through `.toISOString()` (UTC) instead of
reading it back via local fields — safe for US-timezone browsers (UTC is
always ahead of US local time, so the calendar day never shifts back), but
wrong for any browser timezone ahead of UTC:

- `getAvailableDates()` — anchored "today" to the browser's own `new Date()`
  rather than Chicago's calendar date.
- The "Earliest" button and the calendar grid cells — both derived their
  `appointmentDate` string via `d.toISOString().split("T")[0]`.

Confirmation-side display had a related, separate bug: both
`BookingConfirmation.tsx` and `bookingConfirmationEmail`
(`server/email.ts`) formatted the (now-correct) UTC instant with
`toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` and no explicit
`timeZone`. In the browser that shows the *viewer's* local time (fine if
they're in Chicago, wrong otherwise); server-side (Node on Railway) it uses
the *server process's* timezone, typically UTC — meaning the confirmation
email likely showed UTC time, not Chicago time, regardless of this bug.

`formatDateLabel` and the other `new Date(isoDate + "T12:00:00")` display
helpers were audited and found **safe as-is** — local-noon-in,
local-format-out is self-consistent regardless of timezone, since noon
never crosses a calendar-day boundary in practice. Left unchanged.

Urable Job creation (`server/urable.ts` / `UrableApiBookingProvider`) was
**not touched** — it already just reads `.getTime()` off the submitted
`appointmentDate`, so it inherits the fix automatically once the upstream
value is correct, per the original bug report's own diagnosis.

## Fix

New shared module `shared/bookingTimeZone.ts` (shared rather than kept
local to `Booking.tsx` so it can be unit tested — this repo's test runner
only covers `server/**/*.test.ts`; see `server/bookingTimeZone.test.ts`):

- `chicagoWallTimeToUtcDate(isoDate, timeValue)` — the core fix. Converts a
  wall-clock date + time to the UTC instant it represents in
  America/Chicago, independent of the caller's own timezone. DST-aware
  (uses the real Chicago offset for that specific date — CDT or CST — via
  `Intl.DateTimeFormat`, not a hardcoded one) using a standard
  "guess-and-correct" technique: treat the wall-clock time as if it were
  already UTC, see what wall-clock time that guess actually renders as in
  Chicago, then shift by the difference.
- `chicagoTodayAsLocalDate()` — today's calendar date as understood in
  Chicago, not the browser's own timezone.
- `toDateKey(date)` — "YYYY-MM-DD" from a Date's own local fields, never
  via `toISOString()`.

`Booking.tsx` now uses these at every point that used to go through
`new Date(...)` + `toISOString()`/no-offset parsing. `BookingConfirmation.tsx`
and `bookingConfirmationEmail` now pass `timeZone: "America/Chicago"`
explicitly and append "CT" to the displayed time, so the appointment always
reads the same regardless of who's viewing it or where the server runs.

## Verification

- **Unit tests** (`server/bookingTimeZone.test.ts`, 10 cases): the exact
  two real bookings from the bug report (asserting both the correct value
  and that it's *not* the previously-wrong value), a January (CST) case,
  and both 2026 US DST transition boundaries (spring-forward Mar 8,
  fall-back Nov 1).
- **Email test** (`server/email.test.ts`): `bookingConfirmationEmail` shows
  "9:00 AM CT" for a 14:00 UTC input regardless of the test runner's own
  timezone.
- **Live browser, end-to-end**: ran the actual dev server and drove the
  real `/book` wizard with Playwright, browser timezone forced to
  `America/Los_Angeles` (Pacific) — the exact scenario from the bug
  report. Selected "Mon, Sep 7 · 9:00 AM" (the same date/time as
  FA-MTQNVH4J-0TA) and submitted. The captured network request showed
  `"appointmentDate":"2026-09-07T14:00:00.000Z"` (correct — previously
  would have been `16:00:00.000Z`), and the confirmation page displayed
  "Monday, September 7, 2026 at 9:00 AM CT". Test booking/customer rows
  were deleted from the dev database afterward.

## Required outcome — status

1. ✅ Slot labeled 9:00 AM on date D → instant = 09:00 America/Chicago on D.
2. ✅ Duration end times stay consistent (derived from the now-correct base
   instant + a duration in minutes — timezone-agnostic arithmetic).
3. ✅ Confirmation page, confirmation email, and Urable Job start all read
   from the same corrected `appointmentDate` / explicit Chicago formatting.
4. Branch: `fix/booking-timezone` off `rebrand/forma-auto-spa`.
5. ✅ Urable Create Job path untouched; no Virtual Shop changes.
