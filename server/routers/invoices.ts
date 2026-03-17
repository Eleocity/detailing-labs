import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { invoices, bookings } from "../../drizzle/schema";

function adminOnly(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin only" });
}

export const invoicesRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().default(50), offset: z.number().int().default(0) }))
    .query(async ({ ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Join bookings so we can show customer name without a separate query
      const rows = await db
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
          customerLastName: bookings.customerLastName,
          packageName: bookings.packageName,
          serviceName: bookings.serviceName,
        })
        .from(invoices)
        .leftJoin(bookings, eq(invoices.bookingId, bookings.id))
        .orderBy(desc(invoices.createdAt))
        .limit(50);

      return rows;
    }),

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

  getByNumber: publicProcedure
    .input(z.object({ invoiceNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, input.invoiceNumber)).limit(1);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      let booking = null;
      if (invoice.bookingId) {
        const [b] = await db.select().from(bookings).where(eq(bookings.id, invoice.bookingId)).limit(1);
        booking = b ?? null;
      }
      return { invoice, booking };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["draft","sent","paid","overdue","cancelled"]) }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "paid") updateData.paidAt = new Date();
      await db.update(invoices).set(updateData as any).where(eq(invoices.id, input.id));
      return { success: true };
    }),
});
