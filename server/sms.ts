/**
 * Shared Twilio SMS helpers — sending (used by appointment reminders and
 * the FormaOps agent's SMS replies) and inbound webhook signature
 * verification (used by the FormaOps agent's SMS webhook). Centralized so
 * there's one send implementation, not a copy per caller.
 */
import twilio from "twilio";
import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { bookings, customers } from "../drizzle/schema";

/**
 * Whether a phone number has an on-file, explicit SMS opt-in. A phone
 * number existing somewhere is never sufficient on its own — Twilio
 * Toll-Free Verification requires every send to trace back to explicit
 * consent (see shared/smsConsent.ts). Checks the durable `customers`
 * record first, falling back to the most recent booking that used this
 * number (guest bookings with no email never create a customer row).
 *
 * Callers that already have a loaded booking row (e.g. appointment
 * reminders) should read `booking.smsConsent` directly instead of calling
 * this — it's cheaper and tied to the exact submission being acted on.
 * This helper is for call sites that only have a phone number in hand.
 */
export async function hasSmsConsent(phone: string): Promise<boolean> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return false;
  const db = await getDb();
  if (!db) return false;

  const [customer] = await db
    .select({ smsConsent: customers.smsConsent })
    .from(customers)
    .where(eq(customers.phone, digits))
    .limit(1);
  if (customer) return !!customer.smsConsent;

  const [booking] = await db
    .select({ smsConsent: bookings.smsConsent })
    .from(bookings)
    .where(eq(bookings.customerPhone, digits))
    .orderBy(desc(bookings.createdAt))
    .limit(1);
  return !!booking?.smsConsent;
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return false;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    }
  );
  return res.ok;
}

/**
 * Verifies an inbound request genuinely came from Twilio, not a forged
 * POST to our public webhook URL — this is the only thing standing
 * between "anyone on the internet" and the FormaOps agent's tools, so a
 * failure here must reject, not warn-and-continue.
 *
 * `publicUrl` must be the EXACT URL Twilio used to sign the request
 * (protocol + host + path, no query string reordering) — built from
 * TWILIO_WEBHOOK_BASE_URL, not inferred from the request, since a
 * reverse proxy/tunnel can make `req.protocol`/`req.host` disagree with
 * what Twilio actually saw. See docs/formaops/DECISIONS.md.
 */
export function verifyTwilioSignature(
  signatureHeader: string | undefined,
  publicUrl: string,
  params: Record<string, unknown>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signatureHeader) return false;
  return twilio.validateRequest(authToken, signatureHeader, publicUrl, params);
}
