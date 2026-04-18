import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, gte, lte, like, or, sql } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sendEmail, bookingConfirmationEmail } from "../email";
import { syncBookingToUrable } from "../urable";
import { syncBookingToKlaviyo, trackJobCompleted } from "../klaviyo";
import {
  bookings, customers, vehicles, services, packages, addOns,
  bookingAssignments, bookingStatusHistory, invoices, notifications, employees, siteContent
} from "../../drizzle/schema";
// notifyOwner removed — Manus notification service not available on Railway.
// New bookings are visible in the Admin → Bookings dashboard.

function generateBookingNumber(): string {
  const prefix = "DL";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateInvoiceNumber(): string {
  const prefix = "INV";
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}`;
}

export const bookingsRouter = router({
  // ── Public: Get services, packages, add-ons for booking form ────────────
  getServices: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select().from(services).where(eq(services.isActive, true)).orderBy(services.sortOrder);
  }),

  getPackages: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select().from(packages).where(eq(packages.isActive, true)).orderBy(packages.sortOrder);
  }),

  getAddOns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select().from(addOns).where(eq(addOns.isActive, true)).orderBy(addOns.sortOrder);
  }),

  // ── Public: Create booking ───────────────────────────────────────────────
  create: publicProcedure
    .input(
      z.object({
        customerFirstName: z.string().min(1),
        customerLastName: z.string().min(1),
        customerEmail: z.string().optional(),
        customerPhone: z.string().min(10),
        vehicleMake: z.string().min(1),
        vehicleModel: z.string().min(1),
        vehicleYear: z.number().int().min(1900).max(2030),
        vehicleColor: z.string().optional(),
        vehicleType: z.string().optional(),
        vehicleLicensePlate: z.string().optional(),
        serviceId: z.number().int().optional(),
        packageId: z.number().int().optional(),
        addOnIds: z.array(z.number().int()).optional(),
        serviceName: z.string().optional(),
        packageName: z.string().optional(),
        appointmentDate: z.string(), // ISO string
        duration: z.number().int().optional(),
        serviceAddress: z.string().min(5),
        serviceCity: z.string().optional(),
        serviceState: z.string().optional(),
        serviceZip: z.string().optional(),
        gateInstructions: z.string().optional(),
        subtotal: z.number().optional(),
        travelFee: z.number().optional(),
        taxAmount: z.number().optional(),
        totalAmount: z.number().optional(),
        notes: z.string().optional(),
        howHeard: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const bookingNumber = generateBookingNumber();
      const appointmentDate = new Date(input.appointmentDate);

      // Calculate end time
      const duration = input.duration ?? 180;
      const endTime = new Date(appointmentDate.getTime() + duration * 60000);

      await db.insert(bookings).values({
        bookingNumber,
        customerFirstName: input.customerFirstName,
        customerLastName: input.customerLastName,
        customerEmail: input.customerEmail || null,
        customerPhone: input.customerPhone,
        vehicleMake: input.vehicleMake,
        vehicleModel: input.vehicleModel,
        vehicleYear: input.vehicleYear,
        vehicleColor: input.vehicleColor || null,
        vehicleType: input.vehicleType || null,
        vehicleLicensePlate: input.vehicleLicensePlate || null,
        serviceId: input.serviceId || null,
        packageId: input.packageId || null,
        addOnIds: input.addOnIds ? JSON.stringify(input.addOnIds) : null,
        serviceName: input.serviceName || null,
        packageName: input.packageName || null,
        appointmentDate,
        appointmentEndTime: endTime,
        duration,
        serviceAddress: input.serviceAddress,
        serviceCity: input.serviceCity || null,
        serviceState: input.serviceState || null,
        serviceZip: input.serviceZip || null,
        gateInstructions: input.gateInstructions || null,
        subtotal: input.subtotal?.toFixed(2) as any,
        travelFee: (input.travelFee ?? 0).toFixed(2) as any,
        taxAmount: (input.taxAmount ?? 0).toFixed(2) as any,
        totalAmount: input.totalAmount?.toFixed(2) as any,
        notes: input.notes || null,
        alternateDate: input.alternateDate ? new Date(input.alternateDate) : null,
        vehicleConditionNotes: input.vehicleConditionNotes || null,
        serviceType: input.serviceType || "mobile",
        howHeard: input.howHeard || null,
        status: "pending_review",
        paymentStatus: "unpaid",
        source: "website",
      });

      // Find the inserted booking
      const [newBooking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.bookingNumber, bookingNumber))
        .limit(1);

      // Upsert customer record
      if (input.customerEmail) {
        const existing = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, input.customerEmail))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(customers).values({
            firstName: input.customerFirstName,
            lastName: input.customerLastName,
            email: input.customerEmail,
            phone: input.customerPhone,
            city: input.serviceCity || null,
            state: input.serviceState || null,
            zip: input.serviceZip || null,
            source: input.howHeard || "website",
            crmStatus: "booked",
          });
        }
      }

      // Owner notification: visible in Admin → Bookings dashboard.
      // (Manus push notification service not used on Railway)

      // Send confirmation email to customer
      if (input.customerEmail && newBooking) {
        const { data: contactRows } = await (async () => {
          try {
            const rows = await db.select().from(siteContent).where(eq(siteContent.section, "contact")).limit(20);
            return { data: rows };
          } catch { return { data: [] }; }
        })();
        const phone = contactRows.find((r: any) => r.key === "phone")?.value || "(262) 260-9474";
        const emailContent = bookingConfirmationEmail({
          bookingNumber,
          customerFirstName: input.customerFirstName,
          customerLastName:  input.customerLastName,
          packageName:       input.packageName ?? null,
          appointmentDate:   new Date(input.appointmentDate),
          serviceAddress:    input.serviceAddress,
          serviceCity:       input.serviceCity ?? null,
          serviceState:      input.serviceState ?? null,
          totalAmount:       input.totalAmount?.toString() ?? null,
          phone,
        });
        sendEmail({ to: input.customerEmail, ...emailContent }).catch((e: any) =>
          console.error("[Email] Confirmation failed:", e?.message)
        );
      }

      // Auto-sync to Urable (non-blocking)
      if (process.env.URABLE_API_KEY && newBooking) {
        syncBookingToUrable({
          firstName:       input.customerFirstName,
          lastName:        input.customerLastName,
          email:           input.customerEmail,
          phone:           input.customerPhone,
          city:            input.serviceCity,
          state:           input.serviceState,
          zip:             input.serviceZip,
          howHeard:        input.howHeard,
          vehicleYear:     input.vehicleYear ?? null,
          vehicleMake:     input.vehicleMake,
          vehicleModel:    input.vehicleModel,
          vehicleColor:    input.vehicleColor ?? null,
          vehiclePlate:    input.vehicleLicensePlate ?? null,
          bookingNumber,
          packageName:     input.packageName ?? null,
          appointmentDate: new Date(input.appointmentDate),
          serviceAddress:  input.serviceAddress,
          totalAmount:     input.totalAmount ?? null,
          notes:           input.notes ?? null,
        }).then(({ urableCustomerId, urableVehicleId }) => {
          if (urableCustomerId && newBooking?.customerId) {
            db.update(customers)
              .set({ urableId: urableCustomerId, urableSyncedAt: new Date() } as any)
              .where(eq(customers.id, newBooking.customerId))
              .catch(() => {});
          }
          if (urableVehicleId && newBooking?.id) {
            db.update(bookings)
              .set({ urableJobId: urableVehicleId, urableSyncedAt: new Date() } as any)
              .where(eq(bookings.id, newBooking.id))
              .catch(() => {});
          }
        }).catch((e: any) => {
          console.error("[Urable] Non-blocking sync failed:", e?.message);
        });
      }

      // Auto-sync to Klaviyo (non-blocking)
      if (process.env.KLAVIYO_API_KEY && newBooking) {
        syncBookingToKlaviyo({
          firstName:       input.customerFirstName,
          lastName:        input.customerLastName,
          email:           input.customerEmail,
          phone:           input.customerPhone,
          city:            input.serviceCity,
          state:           input.serviceState,
          zip:             input.serviceZip,
          howHeard:        input.howHeard,
          vehicleYear:     input.vehicleYear ?? null,
          vehicleMake:     input.vehicleMake,
          vehicleModel:    input.vehicleModel,
          bookingNumber,
          packageName:     input.packageName ?? null,
          appointmentDate: new Date(input.appointmentDate),
          serviceAddress:  input.serviceAddress,
          totalAmount:     input.totalAmount ?? null,
        }).catch((e: any) => {
          console.error("[Klaviyo] Booking sync failed:", e?.message);
        });
      }

      // ── Fire Zapier webhook (non-blocking) ─────────────────────────────────
      if (newBooking) {
        const { notifyZapier } = await import("../zapier");
        const apt = new Date(input.appointmentDate);
        const altApt = input.alternateDate ? new Date(input.alternateDate) : null;
        const BASE = "https://detailinglabswi.com";

        notifyZapier({
          event:            "booking.request.submitted",
          submitted_at:     new Date().toISOString(),
          booking_number:   bookingNumber,
          customer_name:    `${input.customerFirstName} ${input.customerLastName}`,
          customer_email:   input.customerEmail ?? "",
          customer_phone:   input.customerPhone ?? "",
          vehicle_year:     input.vehicleYear ?? null,
          vehicle_make:     input.vehicleMake ?? "",
          vehicle_model:    input.vehicleModel ?? "",
          vehicle_color:    input.vehicleColor ?? "",
          vehicle_condition: input.vehicleConditionNotes ?? "",
          service_package:  input.packageName ?? "Mobile Detailing",
          add_ons:          input.addOnIds ?? [],
          service_type:     input.serviceType ?? "mobile",
          special_requests: input.notes ?? "",
          preferred_date:   apt.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }),
          alternate_date:   altApt ? altApt.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }) : "",
          address:          input.serviceAddress,
          city:             input.serviceCity ?? "",
          state:            input.serviceState ?? "",
          zip_code:         input.serviceZip ?? "",
          price_estimate:   `$${(input.subtotal ?? 0).toFixed(2)}`,
          travel_fee:       `$${(input.travelFee ?? 0).toFixed(2)}`,
          total_estimate:   `$${(input.totalAmount ?? 0).toFixed(2)}`,
          referral_source:  input.howHeard ?? "",
          admin_review_url: `${BASE}/admin/bookings/${newBooking.id}`,
          admin_approve_url: `${BASE}/admin/bookings/${newBooking.id}?action=approve`,
          admin_decline_url: `${BASE}/admin/bookings/${newBooking.id}?action=decline`,
          booking_status:   "pending_review",
        }).catch(() => {});
      }

      // ── Send pending review email to customer ────────────────────────────
      if (newBooking && input.customerEmail) {
        const { bookingRequestReceivedEmail } = await import("../emailMarketing");
        const { sendEmail } = await import("../email");
        const apt = new Date(input.appointmentDate);
        const altApt = input.alternateDate ? new Date(input.alternateDate) : null;
        const emailContent = bookingRequestReceivedEmail({
          customerFirstName: input.customerFirstName,
          customerEmail:     input.customerEmail,
          bookingNumber,
          packageName:       input.packageName,
          preferredDate:     apt.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }),
          alternateDate:     altApt ? altApt.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }) : null,
          serviceAddress:    input.serviceAddress,
          vehicleMake:       input.vehicleMake,
          vehicleModel:      input.vehicleModel,
          vehicleYear:       input.vehicleYear,
          totalEstimate:     input.totalAmount ?? null,
        });
        sendEmail({ to: input.customerEmail, ...emailContent }).catch(() => {});
      }

      // ── Send internal notification to business email ──────────────────────
      if (newBooking) {
        const { sendEmail } = await import("../email");
        const internalTo = process.env.INTERNAL_NOTIFY_EMAIL
                        || process.env.CONTACT_EMAIL
                        || "hello@detailinglabswi.com";
        const apt = new Date(input.appointmentDate);
        const vehicle = [input.vehicleYear, input.vehicleMake, input.vehicleModel].filter(Boolean).join(" ") || "Unknown vehicle";
        const adminUrl = `https://detailinglabswi.com/admin/bookings/${newBooking.id}`;

        sendEmail({
          to:      internalTo,
          subject: `📋 New Booking Request — ${bookingNumber} | ${input.customerFirstName} ${input.customerLastName}`,
          html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#d0d0f0">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:#1e1a00;border:1px solid #ca8a04;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center">
      <span style="color:#fbbf24;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase">⏳ New Booking Request Pending Review</span>
    </div>

    <div style="background:#0e0e1c;border:1px solid #1c1c30;border-radius:12px;padding:20px;margin-bottom:16px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;width:130px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a2e">Booking #</td><td style="padding:8px 0;color:#d0d0f0;font-family:monospace;border-bottom:1px solid #1a1a2e">${bookingNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a2e">Customer</td><td style="padding:8px 0;color:#d0d0f0;border-bottom:1px solid #1a1a2e">${input.customerFirstName} ${input.customerLastName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a2e">Phone</td><td style="padding:8px 0;border-bottom:1px solid #1a1a2e"><a href="tel:${(input.customerPhone ?? "").replace(/\D/g,"")}" style="color:#a78bfa;text-decoration:none">${input.customerPhone ?? "—"}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a2e">Email</td><td style="padding:8px 0;border-bottom:1px solid #1a1a2e"><a href="mailto:${input.customerEmail ?? ""}" style="color:#a78bfa;text-decoration:none">${input.customerEmail ?? "—"}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a2e">Vehicle</td><td style="padding:8px 0;color:#d0d0f0;border-bottom:1px solid #1a1a2e">${vehicle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a2e">Service</td><td style="padding:8px 0;color:#d0d0f0;border-bottom:1px solid #1a1a2e">${input.packageName ?? "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a2e">Date</td><td style="padding:8px 0;color:#d0d0f0;border-bottom:1px solid #1a1a2e">${apt.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}</td></tr>
        <tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a2e">Location</td><td style="padding:8px 0;color:#d0d0f0;border-bottom:1px solid #1a1a2e">${input.serviceAddress}${input.serviceCity ? `, ${input.serviceCity}` : ""}${input.serviceState ? `, ${input.serviceState}` : ""}</td></tr>
        ${input.totalAmount ? `<tr><td style="padding:8px 0;color:#6b6b9a;font-size:12px;text-transform:uppercase;letter-spacing:1px">Total</td><td style="padding:8px 0;color:#a78bfa;font-weight:700;font-size:16px">$${Number(input.totalAmount).toFixed(2)}</td></tr>` : ""}
      </table>
    </div>

    ${input.notes ? `<div style="background:#0e0e1c;border:1px solid #1c1c30;border-left:3px solid #7c3aed;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:16px"><p style="margin:0 0 4px;color:#6b6b9a;font-size:11px;text-transform:uppercase;letter-spacing:1px">Special Requests</p><p style="margin:0;color:#c0c0e0;font-size:13px">${input.notes}</p></div>` : ""}

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:12px">
      <tr>
        <td style="padding-right:6px">
          <a href="${adminUrl}?action=approve" style="display:block;text-align:center;padding:14px;background:#16a34a;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px">
            ✓ Approve
          </a>
        </td>
        <td style="padding-left:6px">
          <a href="${adminUrl}?action=decline" style="display:block;text-align:center;padding:14px;background:#dc2626;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px">
            ✕ Decline
          </a>
        </td>
      </tr>
    </table>

    <a href="${adminUrl}" style="display:block;text-align:center;padding:12px;background:#0e0e1c;border:1px solid #1c1c30;color:#a78bfa;font-size:13px;text-decoration:none;border-radius:10px">
      View Full Booking in Admin →
    </a>

    <p style="margin:20px 0 0;color:#3a3a5a;font-size:11px;text-align:center">Detailing Labs · Internal Notification · Do not reply</p>
  </div>
</body></html>`,
          text: `New Booking Request — ${bookingNumber}

Customer: ${input.customerFirstName} ${input.customerLastName}
Phone: ${input.customerPhone ?? "—"}
Email: ${input.customerEmail ?? "—"}
Vehicle: ${vehicle}
Service: ${input.packageName ?? "—"}
Date: ${apt.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}
Location: ${input.serviceAddress}${input.serviceCity ? `, ${input.serviceCity}` : ""}
${input.totalAmount ? `Total: $${Number(input.totalAmount).toFixed(2)}
` : ""}${input.notes ? `Notes: ${input.notes}
` : ""}
Review: ${adminUrl}`,
        }).catch(() => {});
      }

      return { bookingNumber, bookingId: newBooking?.id };
    }),

  // ── Public: Get booking by number ────────────────────────────────────────
  getByNumber: publicProcedure
    .input(z.object({ bookingNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.bookingNumber, input.bookingNumber))
        .limit(1);
      return booking ?? null;
    }),

  // ── Admin: List all bookings ─────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().int().default(50),
        offset: z.number().int().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      if (input.status && input.status !== "all") {
        conditions.push(eq(bookings.status, input.status as any));
      }
      if (input.dateFrom) {
        conditions.push(gte(bookings.appointmentDate, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        conditions.push(lte(bookings.appointmentDate, new Date(input.dateTo)));
      }
      if (input.search) {
        const s = `%${input.search}%`;
        conditions.push(
          or(
            like(bookings.customerFirstName, s),
            like(bookings.customerLastName, s),
            like(bookings.customerEmail, s),
            like(bookings.customerPhone, s),
            like(bookings.bookingNumber, s),
            like(bookings.serviceAddress, s)
          )
        );
      }

      const query = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(bookings)
        .where(query)
        .orderBy(desc(bookings.appointmentDate))
        .limit(input.limit)
        .offset(input.offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(query);

      return { bookings: rows, total: Number(count) };
    }),

  // ── Admin: Get single booking ────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "employee") throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.id)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      // Get assignments
      const assignments = await db
        .select({ assignment: bookingAssignments, employee: employees })
        .from(bookingAssignments)
        .leftJoin(employees, eq(bookingAssignments.employeeId, employees.id))
        .where(eq(bookingAssignments.bookingId, input.id));

      return { booking, assignments };
    }),

  // ── Admin: Update booking status ─────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["pending_review", "new", "confirmed", "assigned", "en_route", "in_progress", "completed", "cancelled", "no_show", "declined"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "employee") throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [current] = await db.select().from(bookings).where(eq(bookings.id, input.id)).limit(1);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      await db.update(bookings).set({ status: input.status }).where(eq(bookings.id, input.id));

      await db.insert(bookingStatusHistory).values({
        bookingId: input.id,
        fromStatus: current.status,
        toStatus: input.status,
        changedBy: ctx.user.id,
        notes: input.notes || null,
      });

      // Auto-create invoice when booking is marked completed
      if (input.status === "completed") {
        const existingInv = await db.select().from(invoices).where(eq(invoices.bookingId, input.id)).limit(1);
        if (existingInv.length === 0) {
          const lineItems: { name: string; qty: number; price: number }[] = [];
          if (current.packageName) lineItems.push({ name: current.packageName, qty: 1, price: Number(current.subtotal) || 0 });
          if (Number(current.travelFee) > 0) lineItems.push({ name: "Travel Fee", qty: 1, price: Number(current.travelFee) });
          const subtotal    = Number(current.subtotal)  || 0;
          const travelFee   = Number(current.travelFee) || 0;
          const taxAmount   = Number(current.taxAmount) || 0;
          const totalAmount = subtotal + travelFee + taxAmount;
          const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
          await db.insert(invoices).values({
            invoiceNumber: invNum,
            bookingId: input.id,
            customerId: current.customerId ?? undefined,
            lineItems: JSON.stringify(lineItems),
            subtotal: subtotal.toFixed(2)   as any,
            travelFee: travelFee.toFixed(2) as any,
            taxAmount: taxAmount.toFixed(2) as any,
            totalAmount: totalAmount.toFixed(2) as any,
            status: "draft",
          }).catch(() => {}); // ignore duplicate errors
        }
      }

      // Track Job Completed event in Klaviyo (triggers review request flow)
      if (input.status === "completed" && process.env.KLAVIYO_API_KEY) {
        trackJobCompleted({
          email:         current.customerEmail,
          phone:         current.customerPhone,
          firstName:     current.customerFirstName,
          bookingNumber: current.bookingNumber,
          packageName:   current.packageName,
          totalAmount:   current.totalAmount ? Number(current.totalAmount) : null,
          vehicleMake:   current.vehicleMake,
          vehicleModel:  current.vehicleModel,
        }).catch(() => {});
      }

      return { success: true };
    }),

  // ── Admin: Approve booking request ───────────────────────────────────────
  approve: protectedProcedure
    .input(z.object({
      id:            z.number().int(),
      confirmedDate: z.string().optional(), // if different from requested date
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.id)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      if (booking.status !== "pending_review") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot approve booking with status: ${booking.status}` });
      }

      const confirmedDate = input.confirmedDate
        ? new Date(input.confirmedDate)
        : new Date(booking.appointmentDate);

      await db.update(bookings).set({
        status:      "confirmed" as any,
        reviewedAt:  new Date(),
        reviewedBy:  ctx.user.id,
        ...(input.confirmedDate ? { appointmentDate: confirmedDate } : {}),
      }).where(eq(bookings.id, input.id));

      await db.insert(bookingStatusHistory).values({
        bookingId:  input.id,
        fromStatus: "pending_review",
        toStatus:   "confirmed",
        changedBy:  ctx.user.id,
        notes:      "Approved by admin",
      });

      // Send confirmation email to customer
      if (booking.customerEmail) {
        const { bookingApprovedEmail } = await import("../emailMarketing");
        const { sendEmail } = await import("../email");
        const emailContent = bookingApprovedEmail({
          customerFirstName: booking.customerFirstName,
          customerEmail:     booking.customerEmail,
          bookingNumber:     booking.bookingNumber,
          packageName:       booking.packageName,
          confirmedDate:     confirmedDate.toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit",
          }),
          serviceAddress:    booking.serviceAddress,
          vehicleMake:       booking.vehicleMake,
          vehicleModel:      booking.vehicleModel,
          vehicleYear:       booking.vehicleYear,
          totalAmount:       booking.totalAmount ? Number(booking.totalAmount) : null,
        });
        sendEmail({ to: booking.customerEmail, ...emailContent }).catch(() => {});
      }

      console.log(`[Booking] ✅ Approved: ${booking.bookingNumber} by user ${ctx.user.id}`);
      return { success: true, bookingNumber: booking.bookingNumber };
    }),

  // ── Admin: Decline booking request ───────────────────────────────────────
  decline: protectedProcedure
    .input(z.object({
      id:            z.number().int(),
      declineReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.id)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      await db.update(bookings).set({
        status:        "declined" as any,
        reviewedAt:    new Date(),
        reviewedBy:    ctx.user.id,
        declineReason: input.declineReason || null,
      }).where(eq(bookings.id, input.id));

      await db.insert(bookingStatusHistory).values({
        bookingId:  input.id,
        fromStatus: booking.status,
        toStatus:   "declined",
        changedBy:  ctx.user.id,
        notes:      input.declineReason || "Declined by admin",
      });

      // Send decline email to customer
      if (booking.customerEmail) {
        const { bookingDeclinedEmail } = await import("../emailMarketing");
        const { sendEmail } = await import("../email");
        const emailContent = bookingDeclinedEmail({
          customerFirstName: booking.customerFirstName,
          customerEmail:     booking.customerEmail,
          bookingNumber:     booking.bookingNumber,
          declineReason:     input.declineReason,
        });
        sendEmail({ to: booking.customerEmail, ...emailContent }).catch(() => {});
      }

      console.log(`[Booking] ❌ Declined: ${booking.bookingNumber} by user ${ctx.user.id}`);
      return { success: true, bookingNumber: booking.bookingNumber };
    }),

  // ── Admin: Update booking (full edit) ────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        internalNotes: z.string().optional(),
        paymentStatus: z.enum(["unpaid", "deposit_paid", "paid", "refunded"]).optional(),
        appointmentDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updateData: Record<string, any> = {};
      if (input.internalNotes !== undefined) updateData.internalNotes = input.internalNotes;
      if (input.paymentStatus !== undefined) updateData.paymentStatus = input.paymentStatus;
      if (input.appointmentDate !== undefined) updateData.appointmentDate = new Date(input.appointmentDate);

      await db.update(bookings).set(updateData).where(eq(bookings.id, input.id));
      return { success: true };
    }),

  // ── Admin: Assign employee ────────────────────────────────────────────────
  assignEmployee: protectedProcedure
    .input(z.object({ bookingId: z.number().int(), employeeId: z.number().int(), isPrimary: z.boolean().default(true) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Remove existing assignment for this employee if exists
      await db
        .delete(bookingAssignments)
        .where(and(eq(bookingAssignments.bookingId, input.bookingId), eq(bookingAssignments.employeeId, input.employeeId)));

      await db.insert(bookingAssignments).values({
        bookingId: input.bookingId,
        employeeId: input.employeeId,
        isPrimary: input.isPrimary,
      });

      // Update booking status to assigned
      await db.update(bookings).set({ status: "assigned" }).where(eq(bookings.id, input.bookingId));

      return { success: true };
    }),

  // ── Admin: Generate invoice ───────────────────────────────────────────────
  generateInvoice: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      // Check if invoice already exists
      const existing = await db.select().from(invoices).where(eq(invoices.bookingId, input.bookingId)).limit(1);
      if (existing.length > 0) return { invoiceId: existing[0].id, invoiceNumber: existing[0].invoiceNumber };

      const lineItems = [];
      if (booking.packageName) {
        lineItems.push({ name: booking.packageName, qty: 1, price: Number(booking.subtotal) || 0 });
      } else if (booking.serviceName) {
        lineItems.push({ name: booking.serviceName, qty: 1, price: Number(booking.subtotal) || 0 });
      }
      if (Number(booking.travelFee) > 0) {
        lineItems.push({ name: "Travel Fee", qty: 1, price: Number(booking.travelFee) });
      }

      const invoiceNumber = generateInvoiceNumber();
      const subtotal = Number(booking.subtotal) || 0;
      const travelFee = Number(booking.travelFee) || 0;
      const taxAmount = Number(booking.taxAmount) || 0;
      const totalAmount = subtotal + travelFee + taxAmount;

      await db.insert(invoices).values({
        invoiceNumber,
        bookingId: input.bookingId,
        customerId: booking.customerId,
        lineItems: JSON.stringify(lineItems),
        subtotal: subtotal.toFixed(2) as any,
        travelFee: travelFee.toFixed(2) as any,
        taxAmount: taxAmount.toFixed(2) as any,
        totalAmount: totalAmount.toFixed(2) as any,
        status: "draft",
      });

      const [newInvoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber)).limit(1);
      return { invoiceId: newInvoice?.id, invoiceNumber };
    }),

  // ── Admin: Today's schedule ───────────────────────────────────────────────
  todaySchedule: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "employee") throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return db
      .select()
      .from(bookings)
      .where(and(gte(bookings.appointmentDate, start), lte(bookings.appointmentDate, end)))
      .orderBy(bookings.appointmentDate);
  }),

  // ── Admin: Dashboard stats ────────────────────────────────────────────────
  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [pendingReviewCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status as any, "pending_review"));
    const [newCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status as any, "new"));
    const [confirmedCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "confirmed"));
    const [completedCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "completed"));
    const [totalCustomers] = await db.select({ count: sql<number>`count(*)` }).from(customers);

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const [todayCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings)
      .where(and(gte(bookings.appointmentDate, start), lte(bookings.appointmentDate, end)));

    return {
      pendingReview: Number(pendingReviewCount.count),
      newBookings: Number(newCount.count),
      confirmedBookings: Number(confirmedCount.count),
      completedBookings: Number(completedCount.count),
      totalCustomers: Number(totalCustomers.count),
      todayAppointments: Number(todayCount.count),
    };
  }),

  // ── Customer Portal: bookings by email (public — email is the "key") ─────────
  listByEmail: publicProcedure
    .input(z.object({ email: z.string().email(), limit: z.number().int().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(bookings)
        .where(eq(bookings.customerEmail, input.email.toLowerCase().trim()))
        .orderBy(desc(bookings.appointmentDate))
        .limit(input.limit);
    }),
});
