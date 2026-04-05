/**
 * Klaviyo API integration — v2026-01-15
 * Docs: https://developers.klaviyo.com/en/reference/api_overview
 *
 * Required Railway env var:
 *   KLAVIYO_API_KEY  — your Private API key (Klaviyo → Settings → API Keys → Create Private Key)
 *
 * Optional:
 *   KLAVIYO_LIST_ID  — list ID to subscribe customers to on booking (Klaviyo → Lists → pick a list → URL contains the ID)
 *
 * What this does:
 *   - Creates/updates a Klaviyo profile for every customer who books
 *   - Fires events that trigger Klaviyo flows:
 *       "Booking Confirmed"  — triggers booking confirmation + reminder flows
 *       "Job Completed"      — triggers review request + upsell flows
 *       "Invoice Paid"       — triggers receipt + loyalty flows
 *       "Quote Sent"         — triggers quote follow-up flows
 *   - Optionally subscribes customers to a marketing list
 */

const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const API_VERSION  = "2026-01-15";

// ─── Core request helper ─────────────────────────────────────────────────────

async function klaviyoRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<any> {
  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) {
    console.warn("[Klaviyo] KLAVIYO_API_KEY not set — skipping");
    return null;
  }

  const url = `${KLAVIYO_BASE}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Authorization":  `Klaviyo-API-Key ${apiKey}`,
        "Accept":         "application/vnd.api+json",
        "Content-Type":   "application/vnd.api+json",
        "revision":       API_VERSION,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const text = await res.text();

    // 204 No Content is a valid success
    if (res.status === 204) return {};

    let parsed: any;
    try { parsed = text ? JSON.parse(text) : {}; }
    catch {
      console.error(`[Klaviyo] Non-JSON response from ${url}: ${text.slice(0, 200)}`);
      return null;
    }

    if (!res.ok) {
      const errors = parsed?.errors?.map((e: any) => e?.detail ?? e?.title).join(", ");
      console.error(`[Klaviyo] ${method} ${path} → HTTP ${res.status}: ${errors ?? text.slice(0, 200)}`);
      return null;
    }

    return parsed;
  } catch (err: any) {
    console.error(`[Klaviyo] ${method} ${path} threw: ${err?.message}`);
    return null;
  }
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export interface KlaviyoProfileInput {
  email?:       string | null;
  phone?:       string | null;
  firstName?:   string | null;
  lastName?:    string | null;
  city?:        string | null;
  state?:       string | null;
  zip?:         string | null;
  source?:      string | null;
  properties?:  Record<string, any>;
}

/**
 * Create or update a Klaviyo profile.
 * Uses the upsert endpoint — safe to call on every booking.
 * Returns the Klaviyo profile ID or null.
 */
export async function upsertKlaviyoProfile(input: KlaviyoProfileInput): Promise<string | null> {
  if (!process.env.KLAVIYO_API_KEY) return null;
  if (!input.email && !input.phone) {
    console.warn("[Klaviyo] upsertKlaviyoProfile: need at least email or phone");
    return null;
  }

  // Format phone to E.164 if present
  const phone = input.phone
    ? `+1${input.phone.replace(/\D/g, "").slice(-10)}`
    : undefined;

  const payload = {
    data: {
      type: "profile",
      attributes: {
        ...(input.email     ? { email:      input.email }      : {}),
        ...(phone           ? { phone_number: phone }          : {}),
        ...(input.firstName ? { first_name: input.firstName }  : {}),
        ...(input.lastName  ? { last_name:  input.lastName }   : {}),
        location: {
          ...(input.city  ? { city:    input.city  }  : {}),
          ...(input.state ? { region:  input.state }  : {}),
          ...(input.zip   ? { zip:     input.zip   }  : {}),
        },
        properties: {
          source:          input.source ?? "website",
          ...(input.properties ?? {}),
        },
      },
    },
  };

  // Klaviyo upsert endpoint — creates or updates by email/phone
  const res = await klaviyoRequest("POST", "/profile-import/", payload);
  const id = res?.data?.id ?? null;
  if (id) console.log(`[Klaviyo] Profile upserted: ${id} (${input.email ?? input.phone})`);
  return id;
}

// ─── List subscription ────────────────────────────────────────────────────────

/**
 * Subscribe a profile to a Klaviyo list.
 * Uses KLAVIYO_LIST_ID env var. No-op if not set.
 */
export async function subscribeToList(klaviyoProfileId: string): Promise<void> {
  const listId = process.env.KLAVIYO_LIST_ID;
  if (!listId || !process.env.KLAVIYO_API_KEY) return;

  await klaviyoRequest("POST", `/lists/${listId}/relationships/profiles/`, {
    data: [{ type: "profile", id: klaviyoProfileId }],
  });
  console.log(`[Klaviyo] Profile ${klaviyoProfileId} subscribed to list ${listId}`);
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface KlaviyoEventInput {
  eventName:        string;
  email?:           string | null;
  phone?:           string | null;
  klaviyoProfileId?: string | null;
  value?:           number | null;       // revenue value for the event
  properties?:      Record<string, any>; // custom event properties
}

/**
 * Track an event in Klaviyo.
 * Events power Klaviyo flows — booking confirmation, reminders, review requests, etc.
 */
export async function trackKlaviyoEvent(input: KlaviyoEventInput): Promise<void> {
  if (!process.env.KLAVIYO_API_KEY) return;
  if (!input.email && !input.phone && !input.klaviyoProfileId) {
    console.warn(`[Klaviyo] trackEvent "${input.eventName}": no profile identifier`);
    return;
  }

  const phone = input.phone
    ? `+1${input.phone.replace(/\D/g, "").slice(-10)}`
    : undefined;

  const profileAttrs: Record<string, any> = {};
  if (input.email) profileAttrs.email = input.email;
  if (phone)       profileAttrs.phone_number = phone;

  const payload: any = {
    data: {
      type: "event",
      attributes: {
        metric: {
          data: {
            type: "metric",
            attributes: { name: input.eventName },
          },
        },
        profile: {
          data: {
            type: "profile",
            ...(input.klaviyoProfileId
              ? { id: input.klaviyoProfileId }
              : { attributes: profileAttrs }
            ),
          },
        },
        properties:   input.properties ?? {},
        ...(input.value != null ? { value: input.value } : {}),
        time:         new Date().toISOString(),
      },
    },
  };

  const res = await klaviyoRequest("POST", "/events/", payload);
  if (res !== null) {
    console.log(`[Klaviyo] Event tracked: "${input.eventName}" for ${input.email ?? input.phone}`);
  }
}

// ─── High-level helpers used by the bookings router ──────────────────────────

export interface KlaviyoBookingInput {
  // Customer
  firstName:       string;
  lastName:        string;
  email?:          string | null;
  phone?:          string | null;
  city?:           string | null;
  state?:          string | null;
  zip?:            string | null;
  howHeard?:       string | null;
  // Booking details
  bookingNumber:   string;
  packageName?:    string | null;
  appointmentDate: Date;
  serviceAddress:  string;
  totalAmount?:    number | null;
  vehicleYear?:    number | null;
  vehicleMake?:    string | null;
  vehicleModel?:   string | null;
}

/**
 * Called when a booking is created on the website.
 * 1. Upserts the Klaviyo profile
 * 2. Optionally subscribes to marketing list
 * 3. Fires "Booking Confirmed" event — triggers your Klaviyo flow
 *
 * Returns the Klaviyo profile ID for storage.
 */
export async function syncBookingToKlaviyo(input: KlaviyoBookingInput): Promise<string | null> {
  if (!process.env.KLAVIYO_API_KEY) return null;

  try {
    // 1. Upsert profile
    const profileId = await upsertKlaviyoProfile({
      email:     input.email,
      phone:     input.phone,
      firstName: input.firstName,
      lastName:  input.lastName,
      city:      input.city,
      state:     input.state,
      zip:       input.zip,
      source:    input.howHeard ?? "website",
      properties: {
        last_booking_number: input.bookingNumber,
        last_service:        input.packageName ?? "Detailing",
        vehicle:             [input.vehicleYear, input.vehicleMake, input.vehicleModel].filter(Boolean).join(" ") || undefined,
      },
    });

    // 2. Subscribe to list if configured
    if (profileId && process.env.KLAVIYO_LIST_ID) {
      subscribeToList(profileId).catch(() => {});
    }

    // 3. Track "Booking Confirmed" event — this triggers your Klaviyo booking flow
    await trackKlaviyoEvent({
      eventName:        "Booking Confirmed",
      email:            input.email,
      phone:            input.phone,
      klaviyoProfileId: profileId,
      value:            input.totalAmount ?? undefined,
      properties: {
        booking_number:   input.bookingNumber,
        service:          input.packageName ?? "Detailing",
        appointment_date: input.appointmentDate.toISOString(),
        appointment_date_formatted: input.appointmentDate.toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric", year: "numeric",
        }),
        service_address:  input.serviceAddress,
        vehicle:          [input.vehicleYear, input.vehicleMake, input.vehicleModel].filter(Boolean).join(" ") || "Vehicle",
        total_amount:     input.totalAmount ?? 0,
        // These let you personalise Klaviyo email templates
        first_name:       input.firstName,
        last_name:        input.lastName,
        booking_url:      `https://detailinglabswi.com/booking/confirmation/${input.bookingNumber}`,
      },
    });

    console.log(`[Klaviyo] ✅ Booking ${input.bookingNumber} synced — profile: ${profileId ?? "anonymous"}`);
    return profileId;
  } catch (err: any) {
    console.error("[Klaviyo] syncBookingToKlaviyo threw:", err?.message);
    return null;
  }
}

/**
 * Call when a job is marked as completed.
 * Triggers review request + upsell flows in Klaviyo.
 */
export async function trackJobCompleted(input: {
  email?:       string | null;
  phone?:       string | null;
  firstName?:   string | null;
  bookingNumber: string;
  packageName?:  string | null;
  totalAmount?:  number | null;
  vehicleMake?:  string | null;
  vehicleModel?: string | null;
}): Promise<void> {
  await trackKlaviyoEvent({
    eventName: "Job Completed",
    email:     input.email,
    phone:     input.phone,
    value:     input.totalAmount ?? undefined,
    properties: {
      booking_number: input.bookingNumber,
      service:        input.packageName ?? "Detailing",
      vehicle:        [input.vehicleMake, input.vehicleModel].filter(Boolean).join(" ") || "Vehicle",
      first_name:     input.firstName ?? "",
      review_url:     "https://g.page/r/detailing-labs/review", // update with your actual Google review link
    },
  });
}

/**
 * Call when an invoice is marked paid.
 * Triggers receipt confirmation + loyalty flows in Klaviyo.
 */
export async function trackInvoicePaid(input: {
  email?:         string | null;
  phone?:         string | null;
  firstName?:     string | null;
  invoiceNumber:  string;
  bookingNumber?: string | null;
  totalAmount:    number;
  packageName?:   string | null;
}): Promise<void> {
  await trackKlaviyoEvent({
    eventName: "Invoice Paid",
    email:     input.email,
    phone:     input.phone,
    value:     input.totalAmount,
    properties: {
      invoice_number: input.invoiceNumber,
      booking_number: input.bookingNumber ?? "",
      service:        input.packageName ?? "Detailing",
      amount_paid:    input.totalAmount,
      first_name:     input.firstName ?? "",
    },
  });
}

/**
 * Call when a quote/estimate is sent to a customer.
 * Triggers quote follow-up flows in Klaviyo.
 */
export async function trackQuoteSent(input: {
  email?:       string | null;
  phone?:       string | null;
  firstName?:   string | null;
  quoteNumber:  string;
  service?:     string | null;
  totalAmount?: number | null;
}): Promise<void> {
  await trackKlaviyoEvent({
    eventName: "Quote Sent",
    email:     input.email,
    phone:     input.phone,
    value:     input.totalAmount ?? undefined,
    properties: {
      quote_number: input.quoteNumber,
      service:      input.service ?? "Detailing",
      amount:       input.totalAmount ?? 0,
      first_name:   input.firstName ?? "",
    },
  });
}

// ─── Unsubscribe / suppress ───────────────────────────────────────────────────

/**
 * Suppress (unsubscribe) an email address from all Klaviyo marketing.
 * Uses the bulk suppression endpoint — email will no longer receive any
 * Klaviyo flows or campaigns. Transactional emails are unaffected.
 */
export async function suppressKlaviyoEmail(email: string): Promise<boolean> {
  if (!process.env.KLAVIYO_API_KEY) {
    console.warn("[Klaviyo] suppressEmail: KLAVIYO_API_KEY not set");
    return false;
  }

  const res = await klaviyoRequest("POST", "/profile-suppression-bulk-create-jobs/", {
    data: {
      type: "profile-suppression-bulk-create-job",
      attributes: {
        profiles: {
          data: [
            {
              type: "profile",
              attributes: { email },
            },
          ],
        },
      },
    },
  });

  if (res !== null) {
    console.log(`[Klaviyo] Email suppressed: ${email}`);
    return true;
  }
  return false;
}
