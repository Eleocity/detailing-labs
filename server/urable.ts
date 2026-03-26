/**
 * Urable API integration — built against the documented v1 REST API
 * Docs: https://api.urable.com
 *
 * Public API supports: Customers + Items (vehicles in automotive industry)
 * There is no public Jobs/Bookings endpoint — booking details are written
 * to the customer's notes and the vehicle Item's notes in Urable.
 *
 * Required Railway env var:
 *   URABLE_API_KEY  — your Urable access token (Settings → Developer → Show)
 */

const URABLE_BASE = "https://app.urable.com/api";

// ─── Core request helper ─────────────────────────────────────────────────────

async function urableRequest(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<any> {
  const apiKey = process.env.URABLE_API_KEY;
  if (!apiKey) {
    console.warn("[Urable] URABLE_API_KEY not set — skipping sync");
    return null;
  }

  const url = `${URABLE_BASE}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const text = await res.text();

    if (text.trimStart().startsWith("<!")) {
      console.error(`[Urable] ${method} ${url} returned HTML — check URABLE_API_KEY`);
      return null;
    }

    let parsed: any;
    try { parsed = text ? JSON.parse(text) : {}; }
    catch { console.error(`[Urable] Non-JSON response from ${url}: ${text.slice(0, 200)}`); return null; }

    if (!res.ok) {
      console.error(`[Urable] ${method} ${url} → HTTP ${res.status}:`, JSON.stringify(parsed).slice(0, 300));
      return null;
    }

    if (parsed?.success === false) {
      console.error(`[Urable] ${method} ${url} → success:false`, JSON.stringify(parsed).slice(0, 300));
      return null;
    }

    return parsed;
  } catch (err: any) {
    console.error(`[Urable] ${method} ${url} threw: ${err?.message}`);
    return null;
  }
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface UrableCustomerInput {
  firstName: string;
  lastName:  string;
  email?:    string | null;
  phone?:    string | null;
  address?:  string | null;
  city?:     string | null;
  state?:    string | null;
  zip?:      string | null;
  notes?:    string | null;
  origin?:   string | null;
}

function buildCustomerPayload(input: UrableCustomerInput) {
  return {
    type:      "person",
    firstName: input.firstName,
    lastName:  input.lastName,
    ...(input.phone ? {
      phoneNumbers: [{ label: "Mobile", value: input.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "+1$1") }],
    } : {}),
    ...(input.email ? {
      emails: [{ label: "Home", value: input.email }],
    } : {}),
    ...(input.address ? {
      locations: [{
        label: "Home",
        value: [input.address, input.city, input.state, input.zip].filter(Boolean).join(", "),
      }],
    } : {}),
    ...(input.notes  ? { notes:  input.notes  } : {}),
    ...(input.origin ? { origin: input.origin } : {}),
  };
}

/** Find a customer in Urable by email. */
async function findUrableCustomerByEmail(email: string): Promise<any> {
  const res = await urableRequest("GET", `/v1/customers?email=${encodeURIComponent(email)}`);
  const list: any[] = res?.data ?? [];
  return list.length > 0 ? list[0] : null;
}

/** Create a customer in Urable. Returns the Urable customer object or null. */
async function createUrableCustomer(input: UrableCustomerInput): Promise<any> {
  const res = await urableRequest("POST", "/v1/customers", buildCustomerPayload(input));
  return res?.data ?? null;
}

/** Update an existing Urable customer. */
async function updateUrableCustomer(urableId: string, input: Partial<UrableCustomerInput>): Promise<void> {
  await urableRequest("PATCH", `/v1/customers/${urableId}`, buildCustomerPayload(input as UrableCustomerInput));
}

/**
 * Find or create a customer in Urable.
 * Returns the Urable customer ID string, or null if the API key isn't set or the request fails.
 */
export async function syncCustomerToUrable(input: UrableCustomerInput): Promise<string | null> {
  if (!process.env.URABLE_API_KEY) return null;

  let urableCustomer: any = null;

  // Try to match by email first
  if (input.email) {
    urableCustomer = await findUrableCustomerByEmail(input.email);
  }

  if (urableCustomer) {
    const id = String(urableCustomer._id ?? urableCustomer.id ?? "");
    if (!id) return null;
    await updateUrableCustomer(id, input);
    console.log(`[Urable] Customer updated: ${id} (${input.firstName} ${input.lastName})`);
    return id;
  }

  const created = await createUrableCustomer(input);
  const id = String(created?._id ?? created?.id ?? "");
  if (!id) {
    console.error("[Urable] Customer creation returned no ID");
    return null;
  }

  console.log(`[Urable] Customer created: ${id} (${input.firstName} ${input.lastName})`);
  return id;
}

// ─── Items (Vehicles in automotive industry) ──────────────────────────────────
// In Urable's automotive industry context, an "Item" is a vehicle.

export interface UrableVehicleInput {
  urableCustomerId: string;
  year?:  number | null;
  make?:  string | null;
  model?: string | null;
  color?: string | null;
  vin?:   string | null;
  plate?: string | null;
  notes?: string | null;
}

function vehicleName(input: UrableVehicleInput): string {
  return [input.year, input.make, input.model].filter(Boolean).join(" ") || "Vehicle";
}

/**
 * Create a vehicle (Item) in Urable linked to a customer.
 * Returns the Urable item ID or null.
 */
export async function createUrableVehicle(input: UrableVehicleInput): Promise<string | null> {
  if (!process.env.URABLE_API_KEY) return null;

  const payload: Record<string, any> = {
    customerId: input.urableCustomerId,
    type:       "automotive",
    name:       vehicleName(input),
    ...(input.vin   ? { vins:          [{ label: "VIN",   value: input.vin   }] } : {}),
    ...(input.plate ? { licensePlates: [{ label: "Plate", value: input.plate }] } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };

  const res = await urableRequest("POST", "/v1/items", payload);
  const id = String(res?.data?._id ?? res?.data?.id ?? "");
  if (!id) {
    console.error("[Urable] Vehicle creation returned no ID");
    return null;
  }

  console.log(`[Urable] Vehicle created: ${id} (${vehicleName(input)})`);
  return id;
}

// ─── Booking note ─────────────────────────────────────────────────────────────
// Urable's public API has no jobs endpoint, so we append booking details
// as a note on the customer record. The booking will appear in the customer's
// history in the Urable dashboard.

export interface UrableBookingNoteInput {
  urableCustomerId: string;
  bookingNumber:    string;
  packageName?:     string | null;
  appointmentDate:  Date;
  serviceAddress:   string;
  city?:            string | null;
  state?:           string | null;
  totalAmount?:     number | null;
  vehicleName?:     string | null;
  existingNotes?:   string | null;
}

/**
 * Append a booking summary to the Urable customer's notes field.
 * This makes the booking visible in Urable without needing a jobs API.
 */
export async function appendBookingNoteToUrableCustomer(input: UrableBookingNoteInput): Promise<void> {
  if (!process.env.URABLE_API_KEY) return;

  const dateStr = input.appointmentDate.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  const noteLines = [
    `📅 Booking ${input.bookingNumber}`,
    `Service: ${input.packageName ?? "Detailing"}`,
    `Date: ${dateStr}`,
    `Location: ${[input.serviceAddress, input.city, input.state].filter(Boolean).join(", ")}`,
    ...(input.vehicleName ? [`Vehicle: ${input.vehicleName}`] : []),
    ...(input.totalAmount ? [`Total: $${input.totalAmount.toFixed(2)}`] : []),
  ];

  const newNote = noteLines.join("\n");

  // Prepend new booking note to any existing notes
  const combined = input.existingNotes
    ? `${newNote}\n\n---\n\n${input.existingNotes}`.slice(0, 4000)
    : newNote;

  await urableRequest("PATCH", `/v1/customers/${input.urableCustomerId}`, { notes: combined });
  console.log(`[Urable] Booking note appended to customer ${input.urableCustomerId}`);
}

// ─── Top-level sync called from the bookings router ──────────────────────────

export interface UrableSyncInput {
  // Customer
  firstName:    string;
  lastName:     string;
  email?:       string | null;
  phone?:       string | null;
  city?:        string | null;
  state?:       string | null;
  zip?:         string | null;
  howHeard?:    string | null;
  // Vehicle
  vehicleYear?:  number | null;
  vehicleMake?:  string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  vehicleVin?:   string | null;
  vehiclePlate?: string | null;
  // Booking
  bookingNumber:   string;
  packageName?:    string | null;
  appointmentDate: Date;
  serviceAddress:  string;
  totalAmount?:    number | null;
  notes?:          string | null;
}

/**
 * Full sync: find-or-create customer, create vehicle, append booking note.
 * Returns { urableCustomerId, urableVehicleId } or null values on failure.
 * All failures are non-throwing — logged only.
 */
export async function syncBookingToUrable(input: UrableSyncInput): Promise<{
  urableCustomerId: string | null;
  urableVehicleId:  string | null;
}> {
  if (!process.env.URABLE_API_KEY) return { urableCustomerId: null, urableVehicleId: null };

  try {
    // 1. Find or create customer
    const urableCustomerId = await syncCustomerToUrable({
      firstName: input.firstName,
      lastName:  input.lastName,
      email:     input.email,
      phone:     input.phone,
      city:      input.city,
      state:     input.state,
      zip:       input.zip,
      origin:    input.howHeard ?? "Website",
    });

    if (!urableCustomerId) {
      console.error("[Urable] Could not get customer ID — aborting sync");
      return { urableCustomerId: null, urableVehicleId: null };
    }

    // 2. Create vehicle (Item)
    const vName = [input.vehicleYear, input.vehicleMake, input.vehicleModel].filter(Boolean).join(" ") || null;
    let urableVehicleId: string | null = null;

    if (input.vehicleMake || input.vehicleModel) {
      const vehicleNotes = [
        input.vehicleColor ? `Color: ${input.vehicleColor}` : null,
        input.notes ? `Notes: ${input.notes}` : null,
      ].filter(Boolean).join("\n") || undefined;

      urableVehicleId = await createUrableVehicle({
        urableCustomerId,
        year:  input.vehicleYear,
        make:  input.vehicleMake,
        model: input.vehicleModel,
        color: input.vehicleColor,
        vin:   input.vehicleVin,
        plate: input.vehiclePlate,
        notes: vehicleNotes,
      });
    }

    // 3. Append booking note to customer
    await appendBookingNoteToUrableCustomer({
      urableCustomerId,
      bookingNumber:  input.bookingNumber,
      packageName:    input.packageName,
      appointmentDate: input.appointmentDate,
      serviceAddress:  input.serviceAddress,
      city:            input.city,
      state:           input.state,
      totalAmount:     input.totalAmount,
      vehicleName:     vName,
    });

    console.log(`[Urable] ✅ Booking ${input.bookingNumber} synced — customer: ${urableCustomerId}, vehicle: ${urableVehicleId ?? "none"}`);
    return { urableCustomerId, urableVehicleId };

  } catch (err: any) {
    console.error("[Urable] syncBookingToUrable threw:", err?.message);
    return { urableCustomerId: null, urableVehicleId: null };
  }
}

// ─── Items (Services/Packages) — kept for admin sync panel ───────────────────

export interface UrableItemInput {
  name:         string;
  description?: string | null;
  price:        number;
  category?:    string;
}

/** Push a service/package to Urable as a catalog item. */
export async function syncItemToUrable(
  input: UrableItemInput,
  existingItems?: any[]
): Promise<string | null> {
  if (!process.env.URABLE_API_KEY) return null;

  let items = existingItems;
  if (!items) {
    const res = await urableRequest("GET", "/v1/items");
    items = res?.data ?? (Array.isArray(res) ? res : []);
  }

  const existing = (items ?? []).find(
    (i: any) => (i.name ?? "").toLowerCase() === input.name.toLowerCase()
  );

  if (existing) {
    const id = String(existing._id ?? existing.id ?? "");
    if (!id) return null;
    await urableRequest("PATCH", `/v1/items/${id}`, {
      name:  input.name,
      price: input.price,
      ...(input.description ? { description: input.description } : {}),
    });
    console.log(`[Urable] Item updated: ${input.name} (${id})`);
    return id;
  }

  const res = await urableRequest("POST", "/v1/items", {
    name:  input.name,
    price: input.price,
    ...(input.description ? { description: input.description } : {}),
  });
  const id = String(res?.data?._id ?? res?.data?.id ?? "");
  if (!id) return null;
  console.log(`[Urable] Item created: ${input.name} (${id})`);
  return id;
}

// ─── Webhook helper ───────────────────────────────────────────────────────────

export interface UrableWebhookEvent { type: string; data: any; }

export function parseUrableWebhook(body: string): UrableWebhookEvent | null {
  try {
    const parsed = JSON.parse(body);
    return { type: parsed.event ?? parsed.type ?? "", data: parsed.data ?? parsed };
  } catch { return null; }
}

// Export request helper so the urable router can use it for status checks
export { urableRequest };
