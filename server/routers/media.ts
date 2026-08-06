import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, asc } from "drizzle-orm";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";
import { getDb } from "../db";
import { media } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const mediaRouter = router({
  listByBooking: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "employee")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      return db
        .select()
        .from(media)
        .where(eq(media.bookingId, input.bookingId))
        .orderBy(desc(media.createdAt));
    }),

  listByCustomer: protectedProcedure
    .input(z.object({ customerId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      return db
        .select()
        .from(media)
        .where(eq(media.customerId, input.customerId))
        .orderBy(desc(media.createdAt));
    }),

  upload: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().int().optional(),
        customerId: z.number().int().optional(),
        label: z
          .enum(["before", "after", "progress", "damage", "completed", "other"])
          .default("progress"),
        caption: z.string().optional(),
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "employee")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.fileName.split(".").pop() ?? "jpg";
      const fileKey = `media/${nanoid()}-${Date.now()}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      await db.insert(media).values({
        bookingId: input.bookingId ?? null,
        customerId: input.customerId ?? null,
        label: input.label as any,
        url,
        fileKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        caption: input.caption ?? null,
        uploadedBy: ctx.user.id,
      });

      return { url, fileKey };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db.delete(media).where(eq(media.id, input.id));
      return { success: true };
    }),

  listPublicGallery: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    return db
      .select({
        id: media.id,
        url: media.url,
        label: media.label,
        caption: media.caption,
        galleryOrder: media.galleryOrder,
        createdAt: media.createdAt,
      })
      .from(media)
      .where(eq(media.isPublic, true))
      .orderBy(asc(media.galleryOrder), desc(media.createdAt));
  }),

  togglePublic: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        isPublic: z.boolean(),
        galleryOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db
        .update(media)
        .set({
          isPublic: input.isPublic,
          ...(input.galleryOrder !== undefined
            ? { galleryOrder: input.galleryOrder }
            : {}),
        } as any)
        .where(eq(media.id, input.id));
      return { success: true };
    }),

  reorderGallery: adminProcedure
    .input(
      z.object({
        items: z.array(z.object({ id: z.number(), galleryOrder: z.number() })),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await Promise.all(
        input.items.map(item =>
          db
            .update(media)
            .set({ galleryOrder: item.galleryOrder } as any)
            .where(eq(media.id, item.id))
        )
      );
      return { success: true };
    }),
});
