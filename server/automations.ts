/**
 * Email automation engine for Detailing Labs.
 *
 * Runs on a 15-minute interval inside the Express server process.
 * Each automation type checks a specific DB condition, then fires
 * sendMarketingEmail() if the condition is met and the email hasn't
 * already been sent (checked via emailAutomationLog).
 *
 * Automation types:
 *   appointment_reminder_24h  — 24h before appointmentDate
 *   appointment_reminder_2h   — 2h before appointmentDate
 *   review_request            — 2h after job marked completed
 *   win_back_90d              — customer with no booking in 90 days
 *   coating_anniversary       — 1yr after a ceramic coating booking
 */

import { and, eq, gte, lte, lt, sql, notInArray, inArray, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  bookings, customers,
  emailAutomationLog, emailAutomationSettings,
} from "../drizzle/schema";
import { sendMarketingEmail } from "./email";
import {
  appointmentReminderEmail,
  reviewRequestEmail,
  winBackEmail,
  coatingAnniversaryEmail,
} from "./emailMarketing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Check whether an automation has already been sent for a booking. */
async function alreadySent(
  db: any,
  automationType: string,
  bookingId: number
): Promise<boolean> {
  const rows = await db
    .select({ id: emailAutomationLog.id })
    .from(emailAutomationLog)
    .where(
      and(
        eq(emailAutomationLog.automationType, automationType),
        eq(emailAutomationLog.bookingId, bookingId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** Check whether an automation has already been sent for a customer (no booking). */
async function alreadySentForCustomer(
  db: any,
  automationType: string,
  customerId: number
): Promise<boolean> {
  const rows = await db
    .select({ id: emailAutomationLog.id })
    .from(emailAutomationLog)
    .where(
      and(
        eq(emailAutomationLog.automationType, automationType),
        eq(emailAutomationLog.customerId, customerId),
        // Only check within the last 365 days so win-back can fire again after a year of inactivity
        gte(emailAutomationLog.sentAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** Log a sent automation. */
async function logSent(
  db: any,
  automationType: string,
  email: string,
  bookingId?: number | null,
  customerId?: number | null,
  status = "sent",
  error?: string
): Promise<void> {
  try {
    await db.insert(emailAutomationLog).values({
      automationType,
      bookingId:  bookingId  ?? null,
      customerId: customerId ?? null,
      email,
      status,
      error: error ?? null,
    });
  } catch {
    // Ignore duplicate key — might race if cron fires twice
  }
}

/** Get enabled automation types. */
async function getEnabledTypes(db: any): Promise<Set<string>> {
  const rows = await db
    .select({ type: emailAutomationSettings.type, enabled: emailAutomationSettings.enabled })
    .from(emailAutomationSettings);
  const enabled = new Set<string>();
  for (const r of rows) {
    if (r.enabled) enabled.add(r.type);
  }
  return enabled;
}

// ─── Automation 1: Appointment Reminder 24h ───────────────────────────────────

async function runReminder24h(db: any): Promise<number> {
  const now   = new Date();
  const low   = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const high  = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const candidates = await db
    .select()
    .from(bookings)
    .where(
      and(
        gte(bookings.appointmentDate, low),
        lte(bookings.appointmentDate, high),
        inArray(bookings.status, ["new", "confirmed", "assigned"]),
        sql`${bookings.customerEmail} IS NOT NULL`
      )
    );

  let sent = 0;
  for (const b of candidates) {
    if (!b.customerEmail) continue;
    if (await alreadySent(db, "appointment_reminder_24h", b.id)) continue;

    const { subject, html, text } = appointmentReminderEmail({
      customerFirstName: b.customerFirstName,
      customerEmail:     b.customerEmail,
      bookingNumber:     b.bookingNumber,
      packageName:       b.packageName,
      appointmentDate:   new Date(b.appointmentDate),
      serviceAddress:    b.serviceAddress,
      serviceCity:       b.serviceCity,
      vehicleMake:       b.vehicleMake,
      vehicleModel:      b.vehicleModel,
      vehicleYear:       b.vehicleYear,
      hoursAway:         24,
    });

    const ok = await sendMarketingEmail({ to: b.customerEmail, subject, html, text });
    await logSent(db, "appointment_reminder_24h", b.customerEmail, b.id, b.customerId, ok ? "sent" : "skipped");
    if (ok) sent++;
  }
  return sent;
}

// ─── Automation 2: Appointment Reminder 2h ────────────────────────────────────

async function runReminder2h(db: any): Promise<number> {
  const now  = new Date();
  const low  = new Date(now.getTime() + 90  * 60 * 1000);
  const high = new Date(now.getTime() + 150 * 60 * 1000);

  const candidates = await db
    .select()
    .from(bookings)
    .where(
      and(
        gte(bookings.appointmentDate, low),
        lte(bookings.appointmentDate, high),
        inArray(bookings.status, ["new", "confirmed", "assigned", "en_route"]),
        sql`${bookings.customerEmail} IS NOT NULL`
      )
    );

  let sent = 0;
  for (const b of candidates) {
    if (!b.customerEmail) continue;
    if (await alreadySent(db, "appointment_reminder_2h", b.id)) continue;

    const { subject, html, text } = appointmentReminderEmail({
      customerFirstName: b.customerFirstName,
      customerEmail:     b.customerEmail,
      bookingNumber:     b.bookingNumber,
      packageName:       b.packageName,
      appointmentDate:   new Date(b.appointmentDate),
      serviceAddress:    b.serviceAddress,
      serviceCity:       b.serviceCity,
      vehicleMake:       b.vehicleMake,
      vehicleModel:      b.vehicleModel,
      vehicleYear:       b.vehicleYear,
      hoursAway:         2,
    });

    const ok = await sendMarketingEmail({ to: b.customerEmail, subject, html, text });
    await logSent(db, "appointment_reminder_2h", b.customerEmail, b.id, b.customerId, ok ? "sent" : "skipped");
    if (ok) sent++;
  }
  return sent;
}

// ─── Automation 3: Review Request (2h after completed) ────────────────────────

async function runReviewRequest(db: any): Promise<number> {
  // Find bookings marked completed 1.5–4 hours ago
  const now  = new Date();
  // We don't store completedAt, so we look at bookings where status changed to completed
  // as a proxy: bookings completed in the last ~4 hours with no log entry
  // We use the appointmentDate as a rough proxy — check bookings that ended ~2h ago
  const low  = new Date(now.getTime() - 5  * 60 * 60 * 1000);
  const high = new Date(now.getTime() - 90 * 60 * 1000);

  const candidates = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "completed"),
        gte(bookings.appointmentDate, low),
        lte(bookings.appointmentDate, high),
        sql`${bookings.customerEmail} IS NOT NULL`
      )
    );

  let sent = 0;
  for (const b of candidates) {
    if (!b.customerEmail) continue;
    if (await alreadySent(db, "review_request", b.id)) continue;

    const { subject, html, text } = reviewRequestEmail({
      customerFirstName: b.customerFirstName,
      customerEmail:     b.customerEmail,
      bookingNumber:     b.bookingNumber,
      packageName:       b.packageName,
      vehicleMake:       b.vehicleMake,
      vehicleModel:      b.vehicleModel,
      vehicleYear:       b.vehicleYear,
    });

    const ok = await sendMarketingEmail({ to: b.customerEmail, subject, html, text });
    await logSent(db, "review_request", b.customerEmail, b.id, b.customerId, ok ? "sent" : "skipped");
    if (ok) sent++;
  }
  return sent;
}

// ─── Automation 4: Win-Back (90 days no booking) ──────────────────────────────

async function runWinBack(db: any): Promise<number> {
  // Find customers whose last booking was 88–95 days ago
  const now  = new Date();
  const low  = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000);
  const high = new Date(now.getTime() - 88 * 24 * 60 * 60 * 1000);

  // Get bookings in this window to find customers
  const windowBookings = await db
    .select({
      customerId:    bookings.customerId,
      customerEmail: bookings.customerEmail,
      firstName:     bookings.customerFirstName,
      packageName:   bookings.packageName,
      appointmentDate: bookings.appointmentDate,
      vehicleMake:   bookings.vehicleMake,
      vehicleModel:  bookings.vehicleModel,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.appointmentDate, low),
        lte(bookings.appointmentDate, high),
        sql`${bookings.customerEmail} IS NOT NULL`,
        inArray(bookings.status, ["completed"])
      )
    );

  let sent = 0;
  for (const b of windowBookings) {
    if (!b.customerEmail || !b.customerId) continue;
    if (await alreadySentForCustomer(db, "win_back_90d", b.customerId)) continue;

    // Make sure they haven't booked since
    const recentBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.customerId, b.customerId),
          gte(bookings.appointmentDate, new Date(now.getTime() - 87 * 24 * 60 * 60 * 1000)),
          inArray(bookings.status, ["new","confirmed","assigned","en_route","in_progress","completed"])
        )
      )
      .limit(1);

    if (recentBookings.length > 0) continue; // already has a recent/upcoming booking

    const { subject, html, text } = winBackEmail({
      customerFirstName: b.firstName,
      customerEmail:     b.customerEmail,
      lastServiceName:   b.packageName,
      lastServiceDate:   b.appointmentDate ? new Date(b.appointmentDate) : null,
      vehicleMake:       b.vehicleMake,
      vehicleModel:      b.vehicleModel,
    });

    const ok = await sendMarketingEmail({ to: b.customerEmail, subject, html, text });
    await logSent(db, "win_back_90d", b.customerEmail, null, b.customerId, ok ? "sent" : "skipped");
    if (ok) sent++;
  }
  return sent;
}

// ─── Automation 5: Coating Anniversary ───────────────────────────────────────

async function runCoatingAnniversary(db: any): Promise<number> {
  const now  = new Date();
  const low  = new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000);
  const high = new Date(now.getTime() - 358 * 24 * 60 * 60 * 1000);

  const candidates = await db
    .select()
    .from(bookings)
    .where(
      and(
        gte(bookings.appointmentDate, low),
        lte(bookings.appointmentDate, high),
        or(
          sql`LOWER(${bookings.packageName}) LIKE '%ceramic%'`,
          sql`LOWER(${bookings.packageName}) LIKE '%coating%'`,
          sql`LOWER(${bookings.serviceName}) LIKE '%ceramic%'`
        ),
        eq(bookings.status, "completed"),
        sql`${bookings.customerEmail} IS NOT NULL`
      )
    );

  let sent = 0;
  for (const b of candidates) {
    if (!b.customerEmail) continue;
    if (await alreadySent(db, "coating_anniversary", b.id)) continue;

    const { subject, html, text } = coatingAnniversaryEmail({
      customerFirstName: b.customerFirstName,
      customerEmail:     b.customerEmail,
      bookingNumber:     b.bookingNumber,
      coatingDate:       new Date(b.appointmentDate),
      vehicleMake:       b.vehicleMake,
      vehicleModel:      b.vehicleModel,
      vehicleYear:       b.vehicleYear,
    });

    const ok = await sendMarketingEmail({ to: b.customerEmail, subject, html, text });
    await logSent(db, "coating_anniversary", b.customerEmail, b.id, b.customerId, ok ? "sent" : "skipped");
    if (ok) sent++;
  }
  return sent;
}

// ─── Main runner ──────────────────────────────────────────────────────────────

let _running = false;

export async function runAutomations(): Promise<void> {
  if (_running) return; // prevent overlapping runs
  _running = true;

  try {
    const db = await getDb();
    if (!db) return;

    const enabled = await getEnabledTypes(db);
    const results: Record<string, number> = {};

    if (enabled.has("appointment_reminder_24h")) {
      results.reminder_24h = await runReminder24h(db);
    }
    if (enabled.has("appointment_reminder_2h")) {
      results.reminder_2h = await runReminder2h(db);
    }
    if (enabled.has("review_request")) {
      results.review_request = await runReviewRequest(db);
    }
    if (enabled.has("win_back_90d")) {
      results.win_back = await runWinBack(db);
    }
    if (enabled.has("coating_anniversary")) {
      results.coating_anniversary = await runCoatingAnniversary(db);
    }

    const totalSent = Object.values(results).reduce((a, b) => a + b, 0);
    if (totalSent > 0) {
      console.log("[Automations] Run complete —", JSON.stringify(results));
    }
  } catch (err: any) {
    console.error("[Automations] Run failed:", err?.message);
  } finally {
    _running = false;
  }
}

/** Start the automation scheduler. Runs every 15 minutes. */
export function startAutomationScheduler(): void {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("[Automations] SENDGRID_API_KEY not set — scheduler disabled");
    return;
  }

  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  console.log("[Automations] Scheduler started — runs every 15 minutes");

  // Run once after 60 seconds on startup (let migrations settle)
  setTimeout(() => {
    runAutomations().catch(() => {});
  }, 60_000);

  // Then every 15 minutes
  setInterval(() => {
    runAutomations().catch(() => {});
  }, INTERVAL_MS);
}
