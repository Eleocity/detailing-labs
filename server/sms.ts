/**
 * Shared Twilio SMS helpers — sending (used by appointment reminders and
 * the FormaOps agent's SMS replies) and inbound webhook signature
 * verification (used by the FormaOps agent's SMS webhook). Centralized so
 * there's one send implementation, not a copy per caller.
 */
import twilio from "twilio";

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
