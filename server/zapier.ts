/**
 * Zapier webhook integration for booking request notifications.
 *
 * Required Railway env var:
 *   ZAPIER_BOOKING_WEBHOOK_URL — your Zapier "Catch Hook" trigger URL
 *
 * Set up in Zapier:
 *   1. Create Zap → Trigger: Webhooks by Zapier → Catch Hook
 *   2. Copy the webhook URL → set as ZAPIER_BOOKING_WEBHOOK_URL in Railway
 *   3. Action: Send email / SMS / Slack / whatever you want for notifications
 *   4. Use the payload fields below in your Zapier action templates
 */

export interface ZapierBookingPayload {
  // Event metadata
  event:               "booking.request.submitted";
  submitted_at:        string;  // ISO 8601
  booking_number:      string;

  // Customer
  customer_name:       string;
  customer_email:      string;
  customer_phone:      string;

  // Vehicle
  vehicle_year:        number | null;
  vehicle_make:        string;
  vehicle_model:       string;
  vehicle_color:       string;
  vehicle_size:        string;   // "sedan" | "suv" | "large"
  vehicle_condition:   string;

  // Service
  service_package:     string;
  add_ons:             string[];
  service_type:        string;   // "mobile" | "dropoff"
  special_requests:    string;

  // Scheduling
  preferred_date:      string;   // human-readable
  alternate_date:      string;   // human-readable or ""

  // Location
  address:             string;
  city:                string;
  state:               string;
  zip_code:            string;

  // Pricing
  price_estimate:      string;   // "$229.99"
  travel_fee:          string;   // "$0.00"
  total_estimate:      string;   // "$229.99"

  // Referral
  referral_source:     string;

  // Admin links (pre-built deep links into your dashboard)
  admin_review_url:    string;
  admin_approve_url:   string;
  admin_decline_url:   string;
  booking_status:      "pending_review";
}

/**
 * Send a booking request notification to Zapier.
 * Non-blocking — fires and forgets. A failure here never blocks the customer.
 */
export async function notifyZapier(payload: ZapierBookingPayload): Promise<void> {
  const webhookUrl = process.env.ZAPIER_BOOKING_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("[Zapier] ZAPIER_BOOKING_WEBHOOK_URL not set — skipping notification");
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[Zapier] Webhook failed: HTTP ${res.status}`);
      return;
    }

    console.log(`[Zapier] ✅ Booking request ${payload.booking_number} sent to Zapier`);
  } catch (err: any) {
    // Never let Zapier failure crash the booking flow
    console.error("[Zapier] Webhook error:", err?.message);
  }
}
