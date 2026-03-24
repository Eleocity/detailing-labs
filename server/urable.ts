/**
 * Urable API integration
 * Docs: https://api.urable.com
 *
 * Set URABLE_API_KEY in Railway environment variables.
 * Get your key: Urable → Settings → Integrations → API Key
 */

const URABLE_BASE = "https://api.urable.com/api/v1";

async function urableRequest(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  path: string,
  body?: unknown
): Promise<any> {
  const apiKey = process.env.URABLE_API_KEY;
  if (!apiKey) {
    console.warn("[Urable] URABLE_API_KEY not set — skipping sync");
    return null;
  }

  try {
    const res = await fetch(`${URABLE_BASE}${path}`, {
      method,
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`[Urable] ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    return text ? JSON.parse(text) : {};
  } catch (err: any) {
    console.error(`[Urable] Request failed: ${err?.message}`);
    return null;
  }
}

// ── Customers ────────────────────────────────────────────────────────────────

export interface UrableCustomerInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
}

/** Find a customer in Urable by email. Returns Urable customer object or null. */
export async function findUrableCustomerByEmail(email: string): Promise<any> {
  const res = await urableRequest("GET", `/customers?email=${encodeURIComponent(email)}`);
  // Urable returns { data: [...] } or { customers: [...] }
  const list = res?.data ?? res?.customers ?? [];
  return list.length > 0 ? list[0] : null;
}

/** Create a customer in Urable. Returns the created customer object. */
export async function createUrableCustomer(input: UrableCustomerInput): Promise<any> {
  return urableRequest("POST", "/customers", {
    first_name: input.firstName,
    last_name:  input.lastName,
    ...(input.email ? { email: input.email } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.address ? { address: input.address } : {}),
    ...(input.city    ? { city: input.city }    : {}),
    ...(input.state   ? { state: input.state }  : {}),
    ...(input.zip     ? { zip: input.zip }      : {}),
    ...(input.notes   ? { notes: input.notes }  : {}),
  });
}

/** Update an existing Urable customer. */
export async function updateUrableCustomer(urableId: string, input: Partial<UrableCustomerInput>): Promise<any> {
  return urableRequest("PUT", `/customers/${urableId}`, {
    ...(input.firstName ? { first_name: input.firstName } : {}),
    ...(input.lastName  ? { last_name:  input.lastName }  : {}),
    ...(input.email     ? { email: input.email }     : {}),
    ...(input.phone     ? { phone: input.phone }     : {}),
    ...(input.address   ? { address: input.address } : {}),
    ...(input.city      ? { city: input.city }       : {}),
    ...(input.state     ? { state: input.state }     : {}),
    ...(input.zip       ? { zip: input.zip }         : {}),
    ...(input.notes     ? { notes: input.notes }     : {}),
  });
}

/**
 * Find or create a customer in Urable.
 * Returns the Urable customer ID string, or null if API key not set.
 */
export async function syncCustomerToUrable(input: UrableCustomerInput): Promise<string | null> {
  if (!process.env.URABLE_API_KEY) return null;

  // Try to find by email first
  let urableCustomer: any = null;
  if (input.email) {
    urableCustomer = await findUrableCustomerByEmail(input.email);
  }

  if (urableCustomer) {
    const urableId = urableCustomer.id ?? urableCustomer._id ?? urableCustomer.customerId;
    // Update to keep in sync
    await updateUrableCustomer(String(urableId), input);
    console.log(`[Urable] Customer updated: ${urableId}`);
    return String(urableId);
  } else {
    const created = await createUrableCustomer(input);
    const urableId = created?.id ?? created?._id ?? created?.customerId ?? created?.customer?.id;
    if (urableId) {
      console.log(`[Urable] Customer created: ${urableId}`);
      return String(urableId);
    }
    return null;
  }
}

// ── Jobs ─────────────────────────────────────────────────────────────────────
// NOTE: Urable's public API only documents Customers and Items.
// Job endpoints are available but not in public docs.
// These are built based on the Zapier integration's known payload structure.
// Test once URABLE_API_KEY is set — update field names if needed.

export interface UrableJobInput {
  urableCustomerId: string;
  title: string;
  serviceDate: Date;
  address: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
  lineItems: { name: string; price: number; qty: number }[];
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  vehicleColor?: string | null;
  totalAmount: number;
}

/** Create a job in Urable. Returns job ID or null. */
export async function createUrableJob(input: UrableJobInput): Promise<string | null> {
  if (!process.env.URABLE_API_KEY) return null;

  const payload = {
    customer_id: input.urableCustomerId,
    title:       input.title,
    scheduled_date: input.serviceDate.toISOString().split("T")[0],
    scheduled_time: input.serviceDate.toTimeString().slice(0, 5),
    address: input.address,
    ...(input.city  ? { city: input.city }   : {}),
    ...(input.state ? { state: input.state } : {}),
    ...(input.zip   ? { zip: input.zip }     : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    line_items: input.lineItems.map(li => ({
      name:     li.name,
      price:    li.price,
      quantity: li.qty,
    })),
    vehicle: input.vehicleMake ? {
      make:  input.vehicleMake,
      model: input.vehicleModel ?? "",
      year:  input.vehicleYear  ?? null,
      color: input.vehicleColor ?? "",
    } : undefined,
    total: input.totalAmount,
  };

  const res = await urableRequest("POST", "/jobs", payload);
  const jobId = res?.id ?? res?._id ?? res?.jobId ?? res?.job?.id;
  if (jobId) {
    console.log(`[Urable] Job created: ${jobId}`);
    return String(jobId);
  }
  return null;
}

/** Update job status in Urable. */
export async function updateUrableJobStatus(urableJobId: string, status: string): Promise<boolean> {
  const res = await urableRequest("PATCH", `/jobs/${urableJobId}`, { status });
  return res !== null;
}

// ── Items (Services/Packages) ─────────────────────────────────────────────────

export interface UrableItemInput {
  name: string;
  description?: string | null;
  price: number;
  category?: string;
}

/** Push a service/package to Urable as an Item. Returns Urable item ID or null. */
export async function syncItemToUrable(input: UrableItemInput): Promise<string | null> {
  if (!process.env.URABLE_API_KEY) return null;

  // List items to check if it already exists
  const res = await urableRequest("GET", "/items");
  const items: any[] = res?.data ?? res?.items ?? [];
  const existing = items.find((i: any) =>
    (i.name ?? i.title ?? "").toLowerCase() === input.name.toLowerCase()
  );

  if (existing) {
    const id = existing.id ?? existing._id;
    await urableRequest("PUT", `/items/${id}`, {
      name:        input.name,
      description: input.description ?? "",
      price:       input.price,
      category:    input.category ?? "Detailing",
    });
    return String(id);
  }

  const created = await urableRequest("POST", "/items", {
    name:        input.name,
    description: input.description ?? "",
    price:       input.price,
    category:    input.category ?? "Detailing",
  });

  return String(created?.id ?? created?._id ?? "");
}

// ── Webhook handler (Urable → your site) ─────────────────────────────────────

export interface UrableWebhookEvent {
  type: string;       // "job.completed" | "job.paid" | "customer.updated" etc.
  data: any;
}

export function parseUrableWebhook(body: string): UrableWebhookEvent | null {
  try {
    const parsed = JSON.parse(body);
    return { type: parsed.event ?? parsed.type ?? "", data: parsed.data ?? parsed };
  } catch {
    return null;
  }
}
