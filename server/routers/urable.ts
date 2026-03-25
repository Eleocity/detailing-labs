import { z } from "zod";
import { eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, bookings, packages as pkgsTable, addOns as addOnsTable } from "../../drizzle/schema";
import {
  syncCustomerToUrable, createUrableJob, updateUrableJobStatus,
  syncItemToUrable, parseUrableWebhook,
} from "../urable";

function adminOnly(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED" });
}

export const urableRouter = router({

  // ── Status check ─────────────────────────────────────────────────────────
  status: protectedProcedure.query(async ({ ctx }) => {
    adminOnly(ctx.user.role);
    const apiKey = process.env.URABLE_API_KEY;
    if (!apiKey) return { configured: false, connected: false, error: null };

    // Test the connection by listing customers (lightweight call)
    try {
      const res = await fetch("https://app.urable.com/api/customers?limit=1", {
        headers: {
          "x-api-key": apiKey,
          "Accept": "application/json",
        },
      });
      if (res.ok) {
        return { configured: true, connected: true, error: null };
      } else {
        const text = await res.text().catch(() => "");
        return { configured: true, connected: false, error: `API returned ${res.status}: ${text.slice(0, 100)}` };
      }
    } catch (err: any) {
      return { configured: true, connected: false, error: err?.message ?? "Connection failed" };
    }
  }),

  // ── Probe API URL ────────────────────────────────────────────────────────
  probe: protectedProcedure
    .input(z.object({ baseUrl: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const apiKey = process.env.URABLE_API_KEY;
      if (!apiKey) return { ok: false, error: "URABLE_API_KEY not set" };

      const base = input.baseUrl ?? process.env.URABLE_API_BASE ?? "https://app.urable.com/api";
      // Try all combinations of path + auth header style
      const pathsToTry = ["/customers", "/v1/customers"];
      const authHeaders: { headers: Record<string,string>; name: string }[] = [
        { headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" }, name: "Bearer" },
        { headers: { "x-api-key": apiKey, "Accept": "application/json" }, name: "x-api-key" },
        { headers: { "Authorization": apiKey, "Accept": "application/json" }, name: "raw-auth" },
        { headers: { "api-key": apiKey, "Accept": "application/json" }, name: "api-key" },
      ];
      const results: { url: string; auth: string; status: number; isJson: boolean; preview: string }[] = [];

      for (const path of pathsToTry) {
        for (const auth of authHeaders) {
          const url = `${base}${path}`;
          const authType = auth.name;
          try {
            const res = await fetch(url, { headers: auth.headers });
            const text = await res.text();
            const isJson = !text.trimStart().startsWith("<");
            results.push({ url, auth: authType, status: res.status, isJson, preview: text.slice(0, 120) });
            if (isJson && res.status < 400) break; // found a working combo
          } catch (e: any) {
            results.push({ url, auth: authType, status: 0, isJson: false, preview: e?.message ?? "" });
          }
        }
      }

      const working = results.find(r => r.isJson && r.status < 400);
      return { ok: !!working, workingUrl: working?.url ?? null, workingAuth: (working as any)?.auth ?? null, results };
    }),

  // ── Sync all unsynced customers ───────────────────────────────────────────
  syncAllCustomers: protectedProcedure.mutation(async ({ ctx }) => {
    adminOnly(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!process.env.URABLE_API_KEY)
      throw new TRPCError({ code: "BAD_REQUEST", message: "URABLE_API_KEY not set in Railway variables" });

    const all = await db.select().from(customers).limit(500);
    let synced = 0; let failed = 0;

    for (const c of all) {
      const urableId = await syncCustomerToUrable({
        firstName: c.firstName,
        lastName:  c.lastName,
        email:     c.email,
        phone:     c.phone,
        address:   c.address,
        city:      c.city,
        state:     c.state,
        zip:       c.zip,
        notes:     c.notes,
      });
      if (urableId) {
        await db.update(customers).set({ urableId, urableSyncedAt: new Date() } as any).where(eq(customers.id, c.id));
        synced++;
      } else {
        failed++;
      }
    }
    return { synced, failed, total: all.length };
  }),

  // ── Sync a single customer ────────────────────────────────────────────────
  syncCustomer: protectedProcedure
    .input(z.object({ customerId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [c] = await db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });

      const urableId = await syncCustomerToUrable({
        firstName: c.firstName, lastName: c.lastName,
        email: c.email, phone: c.phone,
        address: c.address, city: c.city, state: c.state, zip: c.zip,
        notes: c.notes,
      });

      if (!urableId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Urable sync failed — check API key and connection" });
      await db.update(customers).set({ urableId, urableSyncedAt: new Date() } as any).where(eq(customers.id, c.id));
      return { urableId };
    }),

  // ── Sync a booking as a job ───────────────────────────────────────────────
  syncBooking: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!process.env.URABLE_API_KEY)
        throw new TRPCError({ code: "BAD_REQUEST", message: "URABLE_API_KEY not set" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

      // Ensure customer exists in Urable first
      let urableCustomerId: string | null = null;
      if (booking.customerId) {
        const [c] = await db.select().from(customers).where(eq(customers.id, booking.customerId)).limit(1);
        if (c) {
          urableCustomerId = (c as any).urableId ?? null;
          if (!urableCustomerId) {
            urableCustomerId = await syncCustomerToUrable({
              firstName: c.firstName, lastName: c.lastName,
              email: c.email, phone: c.phone,
              address: c.address, city: c.city, state: c.state, zip: c.zip,
            });
            if (urableCustomerId) {
              await db.update(customers).set({ urableId: urableCustomerId, urableSyncedAt: new Date() } as any).where(eq(customers.id, c.id));
            }
          }
        }
      }

      // If no customer record, create from booking snapshot
      if (!urableCustomerId) {
        urableCustomerId = await syncCustomerToUrable({
          firstName: booking.customerFirstName,
          lastName:  booking.customerLastName,
          email:     booking.customerEmail,
          phone:     booking.customerPhone,
          city:      booking.serviceCity,
          state:     booking.serviceState,
          zip:       booking.serviceZip,
        });
      }

      if (!urableCustomerId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create customer in Urable" });
      }

      // Build line items
      const lineItems: { name: string; price: number; qty: number }[] = [];
      if (booking.packageName) {
        lineItems.push({ name: booking.packageName, price: Number(booking.subtotal) || 0, qty: 1 });
      }
      if (booking.addOnIds) {
        try {
          const ids: number[] = JSON.parse(booking.addOnIds);
          if (ids.length > 0) lineItems.push({ name: "Add-On Services", price: 0, qty: ids.length });
        } catch {}
      }

      const urableJobId = await createUrableJob({
        urableCustomerId,
        title:        booking.packageName ?? booking.serviceName ?? "Mobile Detailing",
        serviceDate:  new Date(booking.appointmentDate),
        address:      booking.serviceAddress,
        city:         booking.serviceCity,
        state:        booking.serviceState,
        zip:          booking.serviceZip,
        notes:        [booking.notes, booking.gateInstructions].filter(Boolean).join("\n") || null,
        lineItems,
        vehicleMake:  booking.vehicleMake,
        vehicleModel: booking.vehicleModel,
        vehicleYear:  booking.vehicleYear,
        vehicleColor: booking.vehicleColor,
        totalAmount:  Number(booking.totalAmount) || 0,
      });

      if (!urableJobId) {
        // Jobs endpoint may not be public — log and return partial success
        console.warn("[Urable] Job creation returned null — endpoint may need verification");
        return { urableCustomerId, urableJobId: null, warning: "Customer synced. Job sync requires Urable job API access — contact Urable support to enable." };
      }

      await db.update(bookings).set({ urableJobId, urableSyncedAt: new Date() } as any).where(eq(bookings.id, booking.id));
      return { urableCustomerId, urableJobId };
    }),

  // ── Sync all packages as Urable items ─────────────────────────────────────
  syncPackages: protectedProcedure.mutation(async ({ ctx }) => {
    adminOnly(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!process.env.URABLE_API_KEY)
      throw new TRPCError({ code: "BAD_REQUEST", message: "URABLE_API_KEY not set" });

    const pkgs   = await db.select().from(pkgsTable);
    const addons = await db.select().from(addOnsTable);
    let synced = 0; let failed = 0;

    // Pre-fetch existing Urable items once to avoid 11 separate GET calls
    let existingItems: any[] = [];
    try {
      const listRes = await fetch("https://app.urable.com/api/items", {
        headers: { "x-api-key": process.env.URABLE_API_KEY!, "Accept": "application/json" },
      });
      const listJson = await listRes.json() as any;
      console.log("[Urable] items list:", JSON.stringify(listJson)?.slice(0, 400));
      existingItems = listJson?.data ?? listJson?.items ?? (Array.isArray(listJson) ? listJson : []);
    } catch (e: any) {
      console.error("[Urable] Failed to list items:", e?.message);
    }

    // Sync packages
    for (const pkg of pkgs) {
      const itemId = await syncItemToUrable({
        name:        pkg.name,
        description: pkg.description,
        price:       Number(pkg.price),
        category:    "Detailing",
      }, existingItems);
      itemId ? synced++ : failed++;
    }

    // Sync add-ons
    for (const addon of addons) {
      const itemId = await syncItemToUrable({
        name:        addon.name,
        description: addon.description,
        price:       Number(addon.price),
        category:    "Add-On",
      }, existingItems);
      itemId ? synced++ : failed++;
    }

    console.log(`[Urable] Item sync: ${synced} synced, ${failed} failed of ${pkgs.length + addons.length}`);
    return { synced, failed, total: pkgs.length + addons.length, packages: pkgs.length, addons: addons.length };
  }),

  // ── Urable webhook → your site ─────────────────────────────────────────────
  // Configure in Urable: Settings → Webhooks → https://detailinglabswi.com/api/webhooks/urable
  webhook: publicProcedure
    .input(z.object({ body: z.string() }))
    .mutation(async ({ input }) => {
      const event = parseUrableWebhook(input.body);
      if (!event) return { ok: true };

      const db = await getDb();
      if (!db) return { ok: false };

      console.log(`[Urable webhook] Event: ${event.type}`);

      if (event.type === "job.completed" || event.type === "job.status_updated") {
        const urableJobId = String(event.data?.job_id ?? event.data?.id ?? "");
        const newStatus   = event.data?.status ?? "";
        if (urableJobId) {
          const all = await db.select().from(bookings).limit(500);
          const booking = all.find((b: any) => b.urableJobId === urableJobId);
          if (booking) {
            const statusMap: Record<string, string> = {
              completed: "completed", cancelled: "cancelled",
              confirmed: "confirmed", in_progress: "in_progress",
            };
            const mapped = statusMap[newStatus.toLowerCase()];
            if (mapped) {
              await db.update(bookings).set({ status: mapped as any }).where(eq(bookings.id, booking.id));
              console.log(`[Urable webhook] Booking ${booking.bookingNumber} → ${mapped}`);
            }
          }
        }
      }

      if (event.type === "job.paid") {
        const urableJobId = String(event.data?.job_id ?? event.data?.id ?? "");
        if (urableJobId) {
          const all = await db.select().from(bookings).limit(500);
          const booking = all.find((b: any) => b.urableJobId === urableJobId);
          if (booking) {
            await db.update(bookings).set({ paymentStatus: "paid" as any }).where(eq(bookings.id, booking.id));
            console.log(`[Urable webhook] Booking ${booking.bookingNumber} marked paid`);
          }
        }
      }

      if (event.type === "customer.updated" || event.type === "customer.created") {
        const urableId    = String(event.data?.id ?? event.data?.customer_id ?? "");
        const email       = event.data?.email ?? "";
        const firstName   = event.data?.first_name ?? "";
        const lastName    = event.data?.last_name  ?? "";
        const phone       = event.data?.phone ?? "";
        if (urableId && email) {
          const existing = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
          if (existing.length > 0) {
            await db.update(customers).set({
              ...(firstName ? { firstName } : {}),
              ...(lastName  ? { lastName  } : {}),
              ...(phone     ? { phone     } : {}),
              urableId,
              urableSyncedAt: new Date(),
            } as any).where(eq(customers.id, existing[0].id));
            console.log(`[Urable webhook] Customer updated: ${email}`);
          }
        }
      }

      return { ok: true };
    }),
});
