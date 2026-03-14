import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { invoices, bookings } from "../../drizzle/schema";

export const invoicesRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().default(50), offset: z.number().int().default(0) }))
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      return db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(50);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!invoice) throw new Error("Invoice not found");
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
      if (!db) throw new Error("Database unavailable");
      const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, input.invoiceNumber)).limit(1);
      if (!invoice) throw new Error("Invoice not found");
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
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const updateData: Record<string, any> = { status: input.status };
      if (input.status === "paid") updateData.paidAt = new Date();
      await db.update(invoices).set(updateData).where(eq(invoices.id, input.id));
      return { success: true };
    }),
});
