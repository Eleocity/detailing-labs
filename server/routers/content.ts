import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { getDb } from "../db";
import { siteContent, packages, addOns } from "../../drizzle/schema";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

function adminOnly(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
}

export const contentRouter = router({
  // ─── Site Content (text) ───────────────────────────────────────────────────
  getSiteContent: publicProcedure
    .input(z.object({ section: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(siteContent)
        .orderBy(asc(siteContent.section), asc(siteContent.key));
      if (input.section) return rows.filter((r) => r.section === input.section);
      return rows;
    }),

  upsertSiteContent: protectedProcedure
    .input(
      z.object({
        section: z.string(),
        key: z.string(),
        value: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check if exists
      const existing = await db
        .select()
        .from(siteContent)
        .where(eq(siteContent.section, input.section))
        .limit(100);
      const match = existing.find((r) => r.key === input.key);
      if (match) {
        await db
          .update(siteContent)
          .set({ value: input.value })
          .where(eq(siteContent.id, match.id));
      } else {
        await db.insert(siteContent).values({
          section: input.section,
          key: input.key,
          value: input.value,
        });
      }
      return { success: true };
    }),

  bulkUpsertSiteContent: protectedProcedure
    .input(
      z.array(
        z.object({
          section: z.string(),
          key: z.string(),
          value: z.string(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Fetch all existing for affected sections
      // sections variable kept for potential future use
      void input.map((i) => i.section);
      const existing = await db.select().from(siteContent);
      const existingMap = new Map(existing.map((r) => [`${r.section}:${r.key}`, r]));

      for (const item of input) {
        const mapKey = `${item.section}:${item.key}`;
        const match = existingMap.get(mapKey);
        if (match) {
          await db.update(siteContent).set({ value: item.value }).where(eq(siteContent.id, match.id));
        } else {
          await db.insert(siteContent).values(item);
        }
      }
      return { success: true, count: input.length };
    }),

  // ─── Packages CRUD ─────────────────────────────────────────────────────────
  getPackages: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id));
  }),

  upsertPackage: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string(), // decimal string
        duration: z.number().int().positive(),
        features: z.string().optional(), // JSON string of string[]
        isPopular: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      if (id) {
        await db.update(packages).set(data).where(eq(packages.id, id));
        return { id };
      } else {
        const result = await db.insert(packages).values(data);
        return { id: (result as any)[0]?.insertId ?? null };
      }
    }),

  deletePackage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(packages).set({ isActive: false }).where(eq(packages.id, input.id));
      return { success: true };
    }),

  // ─── Add-ons CRUD ──────────────────────────────────────────────────────────
  getAddOns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(addOns).orderBy(asc(addOns.sortOrder), asc(addOns.id));
  }),

  upsertAddOn: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string(),
        duration: z.number().int().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      if (id) {
        await db.update(addOns).set(data).where(eq(addOns.id, id));
        return { id };
      } else {
        const result = await db.insert(addOns).values(data);
        return { id: (result as any)[0]?.insertId ?? null };
      }
    }),

  deleteAddOn: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(addOns).set({ isActive: false }).where(eq(addOns.id, input.id));
      return { success: true };
    }),

  // ── Public: Contact form ────────────────────────────────────────────────
  sendContactForm: publicProcedure
    .input(z.object({
      name:    z.string().min(1).max(100),
      email:   z.string().email(),
      phone:   z.string().optional(),
      message: z.string().min(5).max(2000),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Get owner email from site content
      let ownerEmail = "hello@detailinglabswi.com";
      if (db) {
        const rows = await db.select().from(siteContent).where(eq(siteContent.section, "contact")).limit(20);
        ownerEmail = rows.find(r => r.key === "email")?.value || ownerEmail;
      }

      const { sendEmail, contactFormEmail } = await import("../email");
      const content = contactFormEmail({ ...input, ownerEmail });

      // Send to owner (reply-to set to submitter's email)
      const sent = await sendEmail({
        to: ownerEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });

      if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send — please try again or call us directly." });
      return { success: true };
    }),

  // ── Public: Email unsubscribe ──────────────────────────────────────────────
  unsubscribeEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { suppressKlaviyoEmail } = await import("../klaviyo");
      const ok = await suppressKlaviyoEmail(input.email);
      if (!ok) {
        console.warn("[Unsubscribe] Klaviyo suppression skipped — KLAVIYO_API_KEY not set");
      }
      return { success: true };
    }),
});
