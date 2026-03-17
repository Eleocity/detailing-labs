import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, gte, lte, like, or, sql } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  bookings, customers, vehicles, services, packages, addOns,
  bookingAssignments, bookingStatusHistory, invoices, notifications, employees
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
        customerEmail: z.string().email().optional().or(z.literal("")),
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
        howHeard: input.howHeard || null,
        status: "new",
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
          .select()
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
        status: z.enum(["new", "confirmed", "assigned", "en_route", "in_progress", "completed", "cancelled", "no_show"]),
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

      return { success: true };
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

    const [newCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "new"));
    const [confirmedCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "confirmed"));
    const [completedCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "completed"));
    const [totalCustomers] = await db.select({ count: sql<number>`count(*)` }).from(customers);

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const [todayCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings)
      .where(and(gte(bookings.appointmentDate, start), lte(bookings.appointmentDate, end)));

    return {
      newBookings: Number(newCount.count),
      confirmedBookings: Number(confirmedCount.count),
      completedBookings: Number(completedCount.count),
      totalCustomers: Number(totalCustomers.count),
      todayAppointments: Number(todayCount.count),
    };
  }),
});
