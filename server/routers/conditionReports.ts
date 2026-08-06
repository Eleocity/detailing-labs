import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { conditionReports, bookings } from "../../drizzle/schema";

const damageItemSchema = z.object({
  location: z.string(),
  description: z.string(),
  severity: z.enum(["minor", "moderate", "severe"]),
});

export const conditionReportsRouter = router({
  create: adminProcedure
    .input(
      z.object({
        bookingId: z.number(),
        customerId: z.number().optional(),
        vehicleId: z.number().optional(),
        paintCondition: z
          .enum(["excellent", "good", "fair", "poor"])
          .default("good"),
        interiorCondition: z
          .enum(["excellent", "good", "fair", "poor"])
          .default("good"),
        existingDamage: z.array(damageItemSchema).default([]),
        notes: z.string().optional(),
        photos: z.array(z.string()).default([]),
        customerSignature: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [result] = await db
        .insert(conditionReports)
        .values({
          ...input,
          checkedById: ctx.user?.id ?? null,
          existingDamage: JSON.stringify(input.existingDamage),
          photos: JSON.stringify(input.photos),
        } as any)
        .$returningId();
      return { id: result.id };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        paintCondition: z
          .enum(["excellent", "good", "fair", "poor"])
          .optional(),
        interiorCondition: z
          .enum(["excellent", "good", "fair", "poor"])
          .optional(),
        existingDamage: z.array(damageItemSchema).optional(),
        notes: z.string().optional(),
        photos: z.array(z.string()).optional(),
        customerSignature: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const { id, existingDamage, photos, ...rest } = input;
      await db
        .update(conditionReports)
        .set({
          ...rest,
          ...(existingDamage !== undefined
            ? { existingDamage: JSON.stringify(existingDamage) }
            : {}),
          ...(photos !== undefined ? { photos: JSON.stringify(photos) } : {}),
        } as any)
        .where(eq(conditionReports.id, id));
      return { success: true };
    }),

  getByBooking: adminProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [report] = await db
        .select()
        .from(conditionReports)
        .where(eq(conditionReports.bookingId, input.bookingId))
        .limit(1);
      if (!report) return null;
      return {
        ...report,
        existingDamage: report.existingDamage
          ? JSON.parse(report.existingDamage)
          : [],
        photos: report.photos ? JSON.parse(report.photos) : [],
      };
    }),

  getByBookingPublic: publicProcedure
    .input(z.object({ bookingId: z.number(), email: z.string().email() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [booking] = await db
        .select({ customerEmail: bookings.customerEmail })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (
        !booking ||
        booking.customerEmail?.toLowerCase() !== input.email.toLowerCase()
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [report] = await db
        .select()
        .from(conditionReports)
        .where(eq(conditionReports.bookingId, input.bookingId))
        .limit(1);
      if (!report) return null;
      return {
        ...report,
        existingDamage: report.existingDamage
          ? JSON.parse(report.existingDamage)
          : [],
        photos: report.photos ? JSON.parse(report.photos) : [],
      };
    }),
});
