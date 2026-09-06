import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { getDb } from "../db";
import {
  siteContent,
  packages,
  addOns,
  customers,
  crmNotes,
} from "../../drizzle/schema";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { BRAND } from "../../shared/brand";
import { SMS_CONSENT_DISCLOSURE } from "../../shared/smsConsent";
import {
  FLEET_VEHICLE_TYPES,
  FLEET_OPPORTUNITY_TYPES,
  FLEET_FREQUENCIES,
  FLEET_VEHICLE_TYPE_LABELS,
  FLEET_OPPORTUNITY_TYPE_LABELS,
  FLEET_FREQUENCY_LABELS,
} from "../../shared/fleetQuote";

function adminOnly(role: string) {
  if (role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
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
      if (input.section) return rows.filter(r => r.section === input.section);
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
      const match = existing.find(r => r.key === input.key);
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
      void input.map(i => i.section);
      const existing = await db.select().from(siteContent);
      const existingMap = new Map(
        existing.map(r => [`${r.section}:${r.key}`, r])
      );

      for (const item of input) {
        const mapKey = `${item.section}:${item.key}`;
        const match = existingMap.get(mapKey);
        if (match) {
          await db
            .update(siteContent)
            .set({ value: item.value })
            .where(eq(siteContent.id, match.id));
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
    return db
      .select()
      .from(packages)
      .orderBy(asc(packages.sortOrder), asc(packages.id));
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
      await db
        .update(packages)
        .set({ isActive: false })
        .where(eq(packages.id, input.id));
      return { success: true };
    }),

  // ─── Add-ons CRUD ──────────────────────────────────────────────────────────
  getAddOns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(addOns)
      .orderBy(asc(addOns.sortOrder), asc(addOns.id));
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
      await db
        .update(addOns)
        .set({ isActive: false })
        .where(eq(addOns.id, input.id));
      return { success: true };
    }),

  // ── Public: Contact form ────────────────────────────────────────────────
  sendContactForm: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        phone: z.string().optional(),
        message: z.string().min(5).max(2000),
        /** Explicit SMS opt-in from the dedicated consent checkbox — see
         * shared/smsConsent.ts. Only meaningful when `phone` is provided. */
        smsConsent: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Get owner email from site content
      let ownerEmail: string = BRAND.emailLive;
      if (db) {
        const rows = await db
          .select()
          .from(siteContent)
          .where(eq(siteContent.section, "contact"))
          .limit(20);
        ownerEmail = rows.find(r => r.key === "email")?.value || ownerEmail;

        // Record SMS consent against the CRM lead record, extending the
        // existing customers model (crmStatus already has "new_lead")
        // rather than a separate consent table. Never downgrades an
        // existing customer's crmStatus or flips consent to false — only
        // ever upgrades to opted-in on an explicit checked box.
        if (input.phone) {
          const [existingCustomer] = await db
            .select({ id: customers.id })
            .from(customers)
            .where(eq(customers.email, input.email.toLowerCase().trim()))
            .limit(1);
          const consentFields = input.smsConsent
            ? {
                smsConsent: true as const,
                smsConsentTimestamp: new Date(),
                smsConsentSource: "contact_form",
                smsConsentPhone: input.phone.trim(),
                smsConsentText: SMS_CONSENT_DISCLOSURE,
              }
            : {};
          if (!existingCustomer) {
            const nameParts = input.name.trim().split(/\s+/);
            await db
              .insert(customers)
              .values({
                firstName: nameParts[0] || input.name.trim(),
                lastName: nameParts.slice(1).join(" "),
                email: input.email.toLowerCase().trim(),
                phone: input.phone.trim(),
                source: "contact_form",
                crmStatus: "new_lead",
                ...consentFields,
              })
              .catch(() => {});
          } else if (input.smsConsent) {
            await db
              .update(customers)
              .set(consentFields)
              .where(eq(customers.id, existingCustomer.id))
              .catch(() => {});
          }
        }
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

      if (!sent)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send — please try again or call us directly.",
        });
      return { success: true };
    }),

  // ── Public: Fleet / commercial quote form (see /commercial) ────────────────
  sendFleetQuote: publicProcedure
    .input(
      z.object({
        companyName: z.string().min(1).max(150),
        contactName: z.string().min(1).max(100),
        phone: z.string().min(1).max(32),
        email: z.string().email(),
        // Matches drizzle/schema.ts customers.city varchar(100)
        city: z.string().min(1).max(100),
        vehicleCount: z.string().min(1).max(50),
        vehicleTypes: z.array(z.enum(FLEET_VEHICLE_TYPES)).min(1),
        opportunityType: z.enum(FLEET_OPPORTUNITY_TYPES),
        frequency: z.enum(FLEET_FREQUENCIES),
        notes: z.string().max(2000).optional(),
        /** Explicit SMS opt-in from the dedicated consent checkbox — see
         * shared/smsConsent.ts. Phone is always collected on this form. */
        smsConsent: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      let ownerEmail: string = BRAND.emailLive;

      const leadSummary = [
        `Company: ${input.companyName}`,
        `City/Location: ${input.city}`,
        `Vehicle Count: ${input.vehicleCount}`,
        `Vehicle Types: ${input.vehicleTypes.map(t => FLEET_VEHICLE_TYPE_LABELS[t]).join(", ")}`,
        `Opportunity: ${FLEET_OPPORTUNITY_TYPE_LABELS[input.opportunityType]}`,
        `Frequency: ${FLEET_FREQUENCY_LABELS[input.frequency]}`,
        ...(input.notes ? [`Notes: ${input.notes}`] : []),
      ].join("\n");

      if (db) {
        const rows = await db
          .select()
          .from(siteContent)
          .where(eq(siteContent.section, "contact"))
          .limit(20);
        ownerEmail = rows.find(r => r.key === "email")?.value || ownerEmail;

        // Same CRM lead pattern as sendContactForm — extends the customers
        // model rather than a separate fleet-lead table. Unlike the contact
        // form, the fleet details always get recorded as a crmNotes entry
        // (never overwritten) so a returning submitter's fleet specifics
        // aren't silently dropped in favor of an earlier submission.
        const [existingCustomer] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, input.email.toLowerCase().trim()))
          .limit(1);
        const consentFields = input.smsConsent
          ? {
              smsConsent: true as const,
              smsConsentTimestamp: new Date(),
              smsConsentSource: "fleet_quote_form",
              smsConsentPhone: input.phone.trim(),
              smsConsentText: SMS_CONSENT_DISCLOSURE,
            }
          : {};

        let customerId = existingCustomer?.id;
        if (!existingCustomer) {
          const nameParts = input.contactName.trim().split(/\s+/);
          const inserted = await db
            .insert(customers)
            .values({
              firstName: nameParts[0] || input.contactName.trim(),
              lastName: nameParts.slice(1).join(" "),
              email: input.email.toLowerCase().trim(),
              phone: input.phone.trim(),
              city: input.city.trim(),
              source: "fleet_quote",
              tags: "fleet",
              crmStatus: "new_lead",
              ...consentFields,
            })
            .catch(() => null);
          customerId = (inserted as any)?.[0]?.insertId ?? undefined;
        } else if (input.smsConsent) {
          await db
            .update(customers)
            .set(consentFields)
            .where(eq(customers.id, existingCustomer.id))
            .catch(() => {});
        }

        if (customerId) {
          await db
            .insert(crmNotes)
            .values({
              customerId,
              type: "note",
              content: `Fleet quote request submitted via /commercial:\n${leadSummary}`,
            })
            .catch(() => {});
        }
      }

      const { sendEmail, fleetQuoteEmail } = await import("../email");
      const content = fleetQuoteEmail({ ...input, ownerEmail });

      const sent = await sendEmail({
        to: ownerEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });

      if (!sent)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send — please try again or call us directly.",
        });
      return { success: true };
    }),
});
