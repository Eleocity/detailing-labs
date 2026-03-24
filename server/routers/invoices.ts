import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { invoices, bookings } from "../../drizzle/schema";

function adminOnly(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin only" });
}

export const invoicesRouter = router({

  // ── List all invoices ────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().default(50), offset: z.number().int().default(0) }))
    .query(async ({ ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          bookingId: invoices.bookingId,
          customerId: invoices.customerId,
          lineItems: invoices.lineItems,
          subtotal: invoices.subtotal,
          travelFee: invoices.travelFee,
          taxRate: invoices.taxRate,
          taxAmount: invoices.taxAmount,
          totalAmount: invoices.totalAmount,
          status: invoices.status,
          notes: invoices.notes,
          dueDate: invoices.dueDate,
          paidAt: invoices.paidAt,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
          customerFirstName: bookings.customerFirstName,
          customerLastName:  bookings.customerLastName,
          customerEmail:     bookings.customerEmail,
          customerPhone:     bookings.customerPhone,
          packageName:       bookings.packageName,
          serviceName:       bookings.serviceName,
          serviceAddress:    bookings.serviceAddress,
          serviceCity:       bookings.serviceCity,
          serviceState:      bookings.serviceState,
          appointmentDate:   bookings.appointmentDate,
        })
        .from(invoices)
        .leftJoin(bookings, eq(invoices.bookingId, bookings.id))
        .orderBy(desc(invoices.createdAt))
        .limit(50);
    }),

  // ── Get single invoice ───────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      let booking = null;
      if (invoice.bookingId) {
        const [b] = await db.select().from(bookings).where(eq(bookings.id, invoice.bookingId)).limit(1);
        booking = b ?? null;
      }
      return { invoice, booking };
    }),

  // ── Update status ────────────────────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(z.object({
      id:     z.number().int(),
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "paid") updateData.paidAt = new Date();
      await db.update(invoices).set(updateData as any).where(eq(invoices.id, input.id));
      return { success: true };
    }),

  // ── Update invoice details (travel fee, tax, notes, due date) ────────────
  update: protectedProcedure
    .input(z.object({
      id:         z.number().int(),
      notes:      z.string().optional(),
      dueDate:    z.string().optional(),
      travelFee:  z.number().min(0).optional(),
      taxRate:    z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      const subtotal    = Number(inv.subtotal);
      const travelFee   = input.travelFee  ?? Number(inv.travelFee  ?? 0);
      const taxRate     = input.taxRate    ?? Number(inv.taxRate    ?? 0);
      const taxAmount   = (subtotal + travelFee) * taxRate;
      const totalAmount = subtotal + travelFee + taxAmount;
      await db.update(invoices).set({
        notes:       input.notes   ?? inv.notes,
        dueDate:     input.dueDate ? new Date(input.dueDate) : inv.dueDate,
        travelFee:   travelFee.toFixed(2)   as any,
        taxRate:     taxRate.toFixed(4)     as any,
        taxAmount:   taxAmount.toFixed(2)   as any,
        totalAmount: totalAmount.toFixed(2) as any,
      }).where(eq(invoices.id, input.id));
      return { success: true };
    }),

  // ── Delete invoice ───────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(invoices).where(eq(invoices.id, input.id));
      return { success: true };
    }),
});
