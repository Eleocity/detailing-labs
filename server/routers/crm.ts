import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, like, or, sql, and } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  customers,
  vehicles,
  crmNotes,
  bookings,
  reviewRequests,
  media,
} from "../../drizzle/schema";
import { SMS_CONSENT_DISCLOSURE } from "../../shared/smsConsent";

export const crmRouter = router({
  // ── Customers ────────────────────────────────────────────────────────────
  listCustomers: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().default(50),
        offset: z.number().int().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const conditions = [];
      if (input.search) {
        const s = `%${input.search}%`;
        conditions.push(
          or(
            like(customers.firstName, s),
            like(customers.lastName, s),
            like(customers.email, s),
            like(customers.phone, s)
          )
        );
      }
      if (input.status && input.status !== "all") {
        conditions.push(eq(customers.crmStatus, input.status as any));
      }

      const query = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db
        .select()
        .from(customers)
        .where(query)
        .orderBy(desc(customers.updatedAt))
        .limit(input.limit)
        .offset(input.offset);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(query);
      return { customers: rows, total: Number(count) };
    }),

  getCustomer: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.id))
        .limit(1);
      if (!customer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });

      const customerVehicles = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.customerId, input.id));
      const customerBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.customerId, input.id))
        .orderBy(desc(bookings.appointmentDate));
      const notes = await db
        .select()
        .from(crmNotes)
        .where(eq(crmNotes.customerId, input.id))
        .orderBy(desc(crmNotes.createdAt));
      const photos = await db
        .select()
        .from(media)
        .where(eq(media.customerId, input.id))
        .orderBy(desc(media.createdAt));

      return {
        customer,
        vehicles: customerVehicles,
        bookings: customerBookings,
        notes,
        photos,
      };
    }),

  createCustomer: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        notes: z.string().optional(),
        source: z.string().optional(),
        tags: z.string().optional(),
        crmStatus: z
          .enum([
            "new_lead",
            "contacted",
            "quote_sent",
            "booked",
            "active",
            "follow_up",
            "vip",
            "inactive",
          ])
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db
        .insert(customers)
        .values({ ...input, email: input.email || null });
      return { success: true };
    }),

  updateCustomer: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
        crmStatus: z
          .enum([
            "new_lead",
            "contacted",
            "quote_sent",
            "booked",
            "active",
            "follow_up",
            "vip",
            "inactive",
          ])
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const { id, ...data } = input;
      await db.update(customers).set(data).where(eq(customers.id, id));
      return { success: true };
    }),

  // ── CRM Notes ────────────────────────────────────────────────────────────
  addNote: protectedProcedure
    .input(
      z.object({
        customerId: z.number().int(),
        bookingId: z.number().int().optional(),
        type: z
          .enum(["note", "call", "email", "sms", "task", "reminder"])
          .default("note"),
        content: z.string().min(1),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db.insert(crmNotes).values({
        customerId: input.customerId,
        bookingId: input.bookingId || null,
        type: input.type,
        content: input.content,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  completeNote: protectedProcedure
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
      await db
        .update(crmNotes)
        .set({ isCompleted: true })
        .where(eq(crmNotes.id, input.id));
      return { success: true };
    }),

  // ── Vehicles ─────────────────────────────────────────────────────────────
  addVehicle: protectedProcedure
    .input(
      z.object({
        customerId: z.number().int(),
        make: z.string().min(1),
        model: z.string().min(1),
        year: z.number().int().optional(),
        color: z.string().optional(),
        vehicleType: z
          .enum([
            "sedan",
            "suv",
            "truck",
            "van",
            "coupe",
            "convertible",
            "wagon",
            "other",
          ])
          .optional(),
        licensePlate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db.insert(vehicles).values(input);
      return { success: true };
    }),

  // ── My Account: SMS consent (any logged-in user, own record only) ────────
  // Lets a registered customer manage their own SMS opt-in from their
  // account page (client/src/pages/ProfileSettings.tsx), independent of
  // `users.update` (which is admin-only). Reads/writes the `customers` row
  // matched by the account's own email — the same durable record the
  // booking and contact forms write to — rather than a second, redundant
  // consent flag on `users`.
  getMySmsConsent: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    if (!ctx.user.email)
      return { smsConsent: false, smsConsentTimestamp: null };
    const [customer] = await db
      .select({
        smsConsent: customers.smsConsent,
        smsConsentTimestamp: customers.smsConsentTimestamp,
      })
      .from(customers)
      .where(eq(customers.email, ctx.user.email))
      .limit(1);
    return {
      smsConsent: !!customer?.smsConsent,
      smsConsentTimestamp: customer?.smsConsentTimestamp ?? null,
    };
  }),

  updateMySmsConsent: protectedProcedure
    .input(z.object({ consent: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      if (!ctx.user.email)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your account has no email on file.",
        });

      const consentFields = input.consent
        ? {
            smsConsent: true as const,
            smsConsentTimestamp: new Date(),
            smsConsentSource: "account_settings",
            smsConsentPhone: ctx.user.phone ?? null,
            smsConsentText: SMS_CONSENT_DISCLOSURE,
          }
        : {
            // An explicit toggle-off in account settings is a deliberate,
            // logged-in opt-out — unlike a booking/contact form simply
            // left unchecked, this one IS honored as a real revocation.
            smsConsent: false as const,
            smsConsentTimestamp: new Date(),
            smsConsentSource: "account_settings_optout",
          };

      const [existing] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, ctx.user.email))
        .limit(1);

      if (existing) {
        await db
          .update(customers)
          .set(consentFields)
          .where(eq(customers.id, existing.id));
      } else {
        const nameParts = (ctx.user.name ?? "").trim().split(/\s+/);
        await db.insert(customers).values({
          firstName: nameParts[0] || ctx.user.name || "Customer",
          lastName: nameParts.slice(1).join(" "),
          email: ctx.user.email,
          phone: ctx.user.phone ?? null,
          userId: ctx.user.id,
          source: "account_settings",
          crmStatus: "new_lead",
          ...consentFields,
        });
      }

      return { success: true, smsConsent: input.consent };
    }),

  // ── Review Requests ───────────────────────────────────────────────────────
  sendReviewRequest: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().int(),
        customerId: z.number().int().optional(),
        channel: z.enum(["email", "sms", "both"]).default("email"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      // A phone number on file is not SMS consent — this booking's own
      // smsConsent flag (set at submission time, see shared/smsConsent.ts)
      // is required before an "sms"/"both" review request can be queued,
      // even though this endpoint doesn't send anything yet (see
      // server/sms.ts's hasSmsConsent() for the general-purpose check).
      if (input.channel === "sms" || input.channel === "both") {
        const [booking] = await db
          .select({ smsConsent: bookings.smsConsent })
          .from(bookings)
          .where(eq(bookings.id, input.bookingId))
          .limit(1);
        if (!booking)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found",
          });
        if (!booking.smsConsent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This customer hasn't opted in to SMS — send by email instead, or ask them to opt in on a future booking.",
          });
        }
      }

      await db.insert(reviewRequests).values({
        bookingId: input.bookingId,
        customerId: input.customerId || null,
        channel: input.channel,
        status: "sent",
        sentAt: new Date(),
      });

      await db
        .update(bookings)
        .set({ reviewRequestSent: true })
        .where(eq(bookings.id, input.bookingId));

      return { success: true };
    }),

  // ── Customer Portal: vehicles by customer email ───────────────────────────
  listVehiclesByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Find the customer by email, then return their vehicles
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, input.email.toLowerCase().trim()))
        .limit(1);
      if (!customer) return [];
      return db
        .select()
        .from(vehicles)
        .where(eq(vehicles.customerId, customer.id));
    }),

  addVehicleByEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        make: z.string().min(1),
        model: z.string().min(1),
        year: z.number().int().optional(),
        color: z.string().optional(),
        vehicleType: z
          .enum([
            "sedan",
            "suv",
            "truck",
            "van",
            "coupe",
            "convertible",
            "wagon",
            "other",
          ])
          .optional(),
        licensePlate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      // Find or create customer by email
      let [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, input.email.toLowerCase().trim()))
        .limit(1);
      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account found with that email. Book a service first.",
        });
      }
      const { email: _email, ...vehicleData } = input;
      await db
        .insert(vehicles)
        .values({ ...vehicleData, customerId: customer.id });
      return { success: true };
    }),
});
