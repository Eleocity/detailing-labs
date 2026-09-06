import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, gte, lte, like, or, sql } from "drizzle-orm";
import {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
} from "../_core/trpc";
import { getDb } from "../db";
import { sendEmail, bookingConfirmationEmail } from "../email";
import {
  getBookingProvider,
  resolveProviderName,
  NotSupportedError,
} from "../booking";
import { classifyZip, type ServiceAreaRecord } from "../../shared/serviceArea";
import { BRAND } from "../../shared/brand";
import { SMS_CONSENT_DISCLOSURE } from "../../shared/smsConsent";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";
import {
  bookings,
  customers,
  vehicles,
  services,
  packages,
  addOns,
  bookingAssignments,
  bookingStatusHistory,
  invoices,
  notifications,
  employees,
  siteContent,
  serviceAreas,
  bookingDrafts,
  media,
} from "../../drizzle/schema";
import { scheduleRemindersForBooking } from "./reminders";
import { scheduleFollowUpsForBooking } from "./followUp";
// notifyOwner removed — Manus notification service not available on Railway.
// New bookings are visible in the Admin → Bookings dashboard.

function generateBookingNumber(): string {
  const prefix = BRAND.booking.numberPrefix;
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

const DRAFT_MAX_PHOTOS = 6;
const DRAFT_MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB pre-compression ceiling
const DRAFT_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — long enough to resume, short enough not to accumulate abandoned drafts indefinitely

function generateInvoiceNumber(): string {
  const prefix = "INV";
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}`;
}

export const bookingsRouter = router({
  // ── Public: Get services, packages, add-ons for booking form ────────────
  getServices: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    return db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.sortOrder);
  }),

  getPackages: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    return db
      .select()
      .from(packages)
      .where(eq(packages.isActive, true))
      .orderBy(packages.sortOrder);
  }),

  getAddOns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    return db
      .select()
      .from(addOns)
      .where(eq(addOns.isActive, true))
      .orderBy(addOns.sortOrder);
  }),

  // ── Public: Service-area validation (Step 7 of booking) ─────────────────
  // Backed by the `serviceAreas` table (name/zipCodes/travelFee/isActive),
  // configurable by an admin — no ZIP codes are hardcoded here. If the table
  // is empty (not configured yet), every ZIP is flagged for manual review
  // rather than silently treated as covered.
  checkServiceArea: publicProcedure
    .input(z.object({ zip: z.string().min(3).max(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          classification: "manual_review" as const,
          travelFee: 0,
          areaName: null,
          message: "We'll confirm coverage for your area shortly.",
        };
      }
      const rows = await db
        .select()
        .from(serviceAreas)
        .where(eq(serviceAreas.isActive, true));
      const records: ServiceAreaRecord[] = rows.map(r => ({
        name: r.name,
        zipCodes: (() => {
          try {
            return JSON.parse(r.zipCodes ?? "[]");
          } catch {
            return [];
          }
        })(),
        travelFee: Number(r.travelFee) || 0,
        isActive: !!r.isActive,
      }));
      return classifyZip(input.zip, records);
    }),

  // ── Admin: Service area management ───────────────────────────────────────
  // Backs the Admin → Service Areas screen. This is the only place ZIP
  // codes/travel fees for checkServiceArea should be edited — no ZIP list
  // is hardcoded anywhere in the codebase (see shared/serviceArea.ts).
  adminListServiceAreas: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    return db
      .select()
      .from(serviceAreas)
      .orderBy(serviceAreas.travelFee, serviceAreas.name);
  }),

  adminCreateServiceArea: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        zipCodes: z.array(z.string().regex(/^\d{5}$/)).min(1),
        travelFee: z.number().min(0),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db.insert(serviceAreas).values({
        name: input.name.trim(),
        zipCodes: JSON.stringify(Array.from(new Set(input.zipCodes))),
        travelFee: input.travelFee.toFixed(2) as any,
        isActive: input.isActive,
      });
      return { success: true };
    }),

  adminUpdateServiceArea: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(100).optional(),
        zipCodes: z
          .array(z.string().regex(/^\d{5}$/))
          .min(1)
          .optional(),
        travelFee: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const { id, ...rest } = input;
      const updateData: Record<string, any> = {};
      if (rest.name !== undefined) updateData.name = rest.name.trim();
      if (rest.zipCodes !== undefined)
        updateData.zipCodes = JSON.stringify(
          Array.from(new Set(rest.zipCodes))
        );
      if (rest.travelFee !== undefined)
        updateData.travelFee = rest.travelFee.toFixed(2);
      if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
      if (Object.keys(updateData).length === 0) return { success: true };
      await db
        .update(serviceAreas)
        .set(updateData)
        .where(eq(serviceAreas.id, id));
      return { success: true };
    }),

  adminDeleteServiceArea: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db.delete(serviceAreas).where(eq(serviceAreas.id, input.id));
      return { success: true };
    }),

  // ── Public: Booking drafts (wizard state + photo staging) ───────────────
  // Lets the wizard persist progress and gives customer photo uploads
  // something to attach to before a real booking exists. Never treated as a
  // confirmed booking or a competing calendar — see drizzle/schema.ts.

  createDraft: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    const token = nanoid(24);
    await db.insert(bookingDrafts).values({
      token,
      expiresAt: new Date(Date.now() + DRAFT_TTL_MS),
    });
    return { token };
  }),

  // Upload a photo for a booking-in-progress. Deliberately public (the
  // customer isn't authenticated at this point in the wizard) but scoped to
  // an unguessable draft token, with type/size/count limits so this can't be
  // used as an open upload endpoint.
  uploadDraftPhoto: publicProcedure
    .input(
      z.object({
        token: z.string().min(10).max(40),
        fileBase64: z.string(),
        fileName: z.string().max(255),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      if (!DRAFT_ALLOWED_MIME.has(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only JPEG, PNG, or WebP photos are supported.",
        });
      }

      const [draft] = await db
        .select()
        .from(bookingDrafts)
        .where(eq(bookingDrafts.token, input.token))
        .limit(1);
      if (!draft)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking draft not found or expired.",
        });
      if (draft.expiresAt && draft.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This booking session has expired — please start over.",
        });
      }

      const existingCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(media)
        .where(eq(media.bookingDraftId, draft.id));
      if (Number(existingCount[0]?.count ?? 0) >= DRAFT_MAX_PHOTOS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can upload up to ${DRAFT_MAX_PHOTOS} photos.`,
        });
      }

      const buffer = Buffer.from(input.fileBase64, "base64");
      if (buffer.byteLength > DRAFT_MAX_PHOTO_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That photo is too large (8MB max).",
        });
      }
      if (buffer.byteLength === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That file appears to be empty.",
        });
      }

      const ext =
        input.mimeType === "image/png"
          ? "png"
          : input.mimeType === "image/webp"
            ? "webp"
            : "jpg";
      const fileKey = `booking-drafts/${draft.token}/${nanoid()}.${ext}`;

      let uploaded: { key: string; url: string };
      try {
        uploaded = await storagePut(fileKey, buffer, input.mimeType);
      } catch (err: any) {
        console.error("[bookings] Draft photo upload failed:", err?.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Photo storage isn't available right now — you can still submit your booking without photos.",
        });
      }

      const result = await db.insert(media).values({
        bookingDraftId: draft.id,
        url: uploaded.url,
        fileKey: uploaded.key,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: buffer.byteLength,
        label: "other",
      });

      return { id: (result as any)[0]?.insertId ?? null, url: uploaded.url };
    }),

  deleteDraftPhoto: publicProcedure
    .input(z.object({ token: z.string(), mediaId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [draft] = await db
        .select()
        .from(bookingDrafts)
        .where(eq(bookingDrafts.token, input.token))
        .limit(1);
      if (!draft)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking draft not found.",
        });
      await db
        .delete(media)
        .where(
          and(eq(media.id, input.mediaId), eq(media.bookingDraftId, draft.id))
        );
      return { success: true };
    }),

  listDraftPhotos: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const [draft] = await db
        .select()
        .from(bookingDrafts)
        .where(eq(bookingDrafts.token, input.token))
        .limit(1);
      if (!draft) return [];
      return db
        .select()
        .from(media)
        .where(eq(media.bookingDraftId, draft.id))
        .orderBy(media.createdAt);
    }),

  // ── Public: Create booking ───────────────────────────────────────────────
  create: publicProcedure
    .input(
      z.object({
        customerFirstName: z.string().min(1),
        customerLastName: z.string().min(1),
        customerEmail: z.string().optional(),
        customerPhone: z.string().min(10),
        /** Explicit SMS opt-in from the dedicated consent checkbox — never
         * inferred from the presence of a phone number. Optional/defaults
         * to false so booking submission never requires it (see
         * shared/smsConsent.ts). */
        smsConsent: z.boolean().default(false),
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
        /** Structured Step 5 vehicle-condition answers, already summarized to text. */
        conditionSummary: z.string().optional(),
        /** Links any photos uploaded during the wizard (see createDraft/uploadDraftPhoto) to this booking. */
        draftToken: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const bookingNumber = generateBookingNumber();
      const appointmentDate = new Date(input.appointmentDate);

      // Calculate end time
      const duration = input.duration ?? 180;
      const endTime = new Date(appointmentDate.getTime() + duration * 60000);

      const combinedNotes =
        [input.notes, input.conditionSummary]
          .map(s => s?.trim())
          .filter(Boolean)
          .join("\n\n") || undefined;

      const smsConsentFields = input.smsConsent
        ? {
            smsConsent: true,
            smsConsentTimestamp: new Date(),
            smsConsentSource: "booking_form",
            smsConsentPhone: input.customerPhone,
            smsConsentText: SMS_CONSENT_DISCLOSURE,
          }
        : { smsConsent: false };

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
        notes: combinedNotes || null,
        howHeard: input.howHeard || null,
        status: "new",
        paymentStatus: "unpaid",
        source: "website",
        ...smsConsentFields,
      });

      // Find the inserted booking
      const [newBooking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.bookingNumber, bookingNumber))
        .limit(1);

      // Link any photos uploaded during the wizard (booking draft) to this
      // booking, and fold a photo-count reference into the provider notes —
      // Urable's public API has no attachment support, so a count + pointer
      // to the admin dashboard is what actually reaches staff (see
      // docs/URABLE_INTEGRATION.md).
      let uploadedPhotoCount = 0;
      if (input.draftToken && newBooking) {
        const [draft] = await db
          .select()
          .from(bookingDrafts)
          .where(eq(bookingDrafts.token, input.draftToken))
          .limit(1);
        if (draft) {
          const draftPhotos = await db
            .select({ id: media.id })
            .from(media)
            .where(eq(media.bookingDraftId, draft.id));
          uploadedPhotoCount = draftPhotos.length;
          if (uploadedPhotoCount > 0) {
            await db
              .update(media)
              .set({ bookingId: newBooking.id } as any)
              .where(eq(media.bookingDraftId, draft.id))
              .catch(() => {});
          }
          await db
            .update(bookingDrafts)
            .set({ bookingId: newBooking.id } as any)
            .where(eq(bookingDrafts.id, draft.id))
            .catch(() => {});
        }
      }

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
            ...smsConsentFields,
          });
        } else if (input.smsConsent) {
          // Only ever upgrades an existing customer to opted-in on an
          // explicit checked box on this submission — never flips consent
          // back to false just because a later form was left unchecked
          // (STOP is the opt-out mechanism, not "didn't re-check the box").
          await db
            .update(customers)
            .set(smsConsentFields)
            .where(eq(customers.id, existing[0].id));
        }
      }

      // Owner notification: visible in Admin → Bookings dashboard.
      // (Manus push notification service not used on Railway)

      // Send confirmation email to customer
      if (input.customerEmail && newBooking) {
        const { data: contactRows } = await (async () => {
          try {
            const rows = await db
              .select()
              .from(siteContent)
              .where(eq(siteContent.section, "contact"))
              .limit(20);
            return { data: rows };
          } catch {
            return { data: [] };
          }
        })();
        const phone =
          contactRows.find((r: any) => r.key === "phone")?.value ||
          "(262) 260-9474";
        const emailContent = bookingConfirmationEmail({
          bookingNumber,
          customerFirstName: input.customerFirstName,
          customerLastName: input.customerLastName,
          packageName: input.packageName ?? null,
          appointmentDate: new Date(input.appointmentDate),
          serviceAddress: input.serviceAddress,
          serviceCity: input.serviceCity ?? null,
          serviceState: input.serviceState ?? null,
          totalAmount: input.totalAmount?.toString() ?? null,
          phone,
        });
        sendEmail({ to: input.customerEmail, ...emailContent }).catch(
          (e: any) => console.error("[Email] Confirmation failed:", e?.message)
        );
      }

      // Auto-schedule appointment reminders (non-blocking)
      if (newBooking) {
        scheduleRemindersForBooking(
          db,
          newBooking.id,
          appointmentDate,
          !!newBooking.smsConsent
        ).catch(() => {});
      }

      // Route through the active BookingProvider (request-only by default —
      // see server/booking/index.ts). Non-blocking: the local booking record
      // above is already the source of truth for "did the customer submit a
      // request"; this just syncs status/IDs once the provider responds.
      const providerName = resolveProviderName();
      if (newBooking) {
        const provider = getBookingProvider();
        provider
          .createBooking({
            bookingNumber,
            customer: {
              firstName: input.customerFirstName,
              lastName: input.customerLastName,
              email: input.customerEmail ?? null,
              phone: input.customerPhone,
            },
            vehicle: {
              year: input.vehicleYear ?? null,
              make: input.vehicleMake,
              model: input.vehicleModel,
              color: input.vehicleColor ?? null,
              licensePlate: input.vehicleLicensePlate ?? null,
              vehicleType: input.vehicleType ?? null,
            },
            packageName: input.packageName ?? null,
            appointmentDate: input.appointmentDate,
            durationMinutes: duration,
            serviceAddress: input.serviceAddress,
            serviceCity: input.serviceCity ?? null,
            serviceState: input.serviceState ?? null,
            serviceZip: input.serviceZip ?? null,
            notes: input.notes ?? null,
            conditionSummary:
              [
                input.conditionSummary,
                uploadedPhotoCount > 0
                  ? `${uploadedPhotoCount} customer photo(s) uploaded — view in Admin → Bookings.`
                  : null,
              ]
                .filter(Boolean)
                .join("\n") || null,
            totalAmount: input.totalAmount ?? null,
          })
          .then(result => {
            db.update(bookings)
              .set({
                providerName,
                providerStatus: result.status,
                providerMessage: result.message,
                ...(result.externalJobId
                  ? { urableJobId: result.externalJobId }
                  : {}),
                ...(result.externalEventId
                  ? { externalEventId: result.externalEventId }
                  : {}),
                urableSyncedAt: new Date(),
              } as any)
              .where(eq(bookings.id, newBooking.id))
              .catch(() => {});
            if (result.externalCustomerId && newBooking.customerId) {
              db.update(customers)
                .set({
                  urableId: result.externalCustomerId,
                  urableSyncedAt: new Date(),
                } as any)
                .where(eq(customers.id, newBooking.customerId))
                .catch(() => {});
            }
          })
          .catch((e: any) => {
            if (e instanceof NotSupportedError) {
              console.error(
                `[booking] Provider "${providerName}" doesn't support createBooking:`,
                e.message
              );
            } else {
              console.error(
                "[booking] Non-blocking provider sync failed:",
                e?.message
              );
            }
            db.update(bookings)
              .set({
                providerName,
                providerStatus: "failed_sync",
                providerMessage:
                  "Automatic sync failed; a team member will follow up.",
              } as any)
              .where(eq(bookings.id, newBooking.id))
              .catch(() => {});
          });
      }

      return { bookingNumber, bookingId: newBooking?.id };
    }),

  // ── Public: Get booking by number ────────────────────────────────────────
  getByNumber: publicProcedure
    .input(z.object({ bookingNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
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
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const conditions = [];
      if (input.status && input.status !== "all") {
        conditions.push(eq(bookings.status, input.status as any));
      }
      if (input.dateFrom) {
        conditions.push(
          gte(bookings.appointmentDate, new Date(input.dateFrom))
        );
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "employee")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.id))
        .limit(1);
      if (!booking)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });

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
        status: z.enum([
          "new",
          "confirmed",
          "assigned",
          "en_route",
          "in_progress",
          "completed",
          "cancelled",
          "no_show",
        ]),
        notes: z.string().optional(),
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

      const [current] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.id))
        .limit(1);
      if (!current)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });

      await db
        .update(bookings)
        .set({ status: input.status })
        .where(eq(bookings.id, input.id));

      await db.insert(bookingStatusHistory).values({
        bookingId: input.id,
        fromStatus: current.status,
        toStatus: input.status,
        changedBy: ctx.user.id,
        notes: input.notes || null,
      });

      // Auto-create invoice when booking is marked completed
      if (input.status === "completed") {
        const existingInv = await db
          .select()
          .from(invoices)
          .where(eq(invoices.bookingId, input.id))
          .limit(1);
        if (existingInv.length === 0) {
          const lineItems: { name: string; qty: number; price: number }[] = [];
          if (current.packageName)
            lineItems.push({
              name: current.packageName,
              qty: 1,
              price: Number(current.subtotal) || 0,
            });
          if (Number(current.travelFee) > 0)
            lineItems.push({
              name: "Travel Fee",
              qty: 1,
              price: Number(current.travelFee),
            });
          const subtotal = Number(current.subtotal) || 0;
          const travelFee = Number(current.travelFee) || 0;
          const taxAmount = Number(current.taxAmount) || 0;
          const totalAmount = subtotal + travelFee + taxAmount;
          const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
          await db
            .insert(invoices)
            .values({
              invoiceNumber: invNum,
              bookingId: input.id,
              customerId: current.customerId ?? undefined,
              lineItems: JSON.stringify(lineItems),
              subtotal: subtotal.toFixed(2) as any,
              travelFee: travelFee.toFixed(2) as any,
              taxAmount: taxAmount.toFixed(2) as any,
              totalAmount: totalAmount.toFixed(2) as any,
              status: "draft",
            })
            .catch(() => {}); // ignore duplicate errors

          // Schedule follow-up emails
          scheduleFollowUpsForBooking(
            db,
            input.id,
            current.customerId ?? null
          ).catch(() => {});
        }
      }

      return { success: true };
    }),

  // ── Admin: Update booking (full edit) ────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        internalNotes: z.string().optional(),
        paymentStatus: z
          .enum(["unpaid", "deposit_paid", "paid", "refunded"])
          .optional(),
        appointmentDate: z.string().optional(),
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

      const updateData: Record<string, any> = {};
      if (input.internalNotes !== undefined)
        updateData.internalNotes = input.internalNotes;
      if (input.paymentStatus !== undefined)
        updateData.paymentStatus = input.paymentStatus;
      if (input.appointmentDate !== undefined)
        updateData.appointmentDate = new Date(input.appointmentDate);

      await db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, input.id));
      return { success: true };
    }),

  // ── Admin: Assign employee ────────────────────────────────────────────────
  assignEmployee: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().int(),
        employeeId: z.number().int(),
        isPrimary: z.boolean().default(true),
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

      // Remove existing assignment for this employee if exists
      await db
        .delete(bookingAssignments)
        .where(
          and(
            eq(bookingAssignments.bookingId, input.bookingId),
            eq(bookingAssignments.employeeId, input.employeeId)
          )
        );

      await db.insert(bookingAssignments).values({
        bookingId: input.bookingId,
        employeeId: input.employeeId,
        isPrimary: input.isPrimary,
      });

      // Update booking status to assigned
      await db
        .update(bookings)
        .set({ status: "assigned" })
        .where(eq(bookings.id, input.bookingId));

      return { success: true };
    }),

  // ── Admin: Generate invoice ───────────────────────────────────────────────
  generateInvoice: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (!booking)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });

      // Check if invoice already exists
      const existing = await db
        .select()
        .from(invoices)
        .where(eq(invoices.bookingId, input.bookingId))
        .limit(1);
      if (existing.length > 0)
        return {
          invoiceId: existing[0].id,
          invoiceNumber: existing[0].invoiceNumber,
        };

      const lineItems = [];
      if (booking.packageName) {
        lineItems.push({
          name: booking.packageName,
          qty: 1,
          price: Number(booking.subtotal) || 0,
        });
      } else if (booking.serviceName) {
        lineItems.push({
          name: booking.serviceName,
          qty: 1,
          price: Number(booking.subtotal) || 0,
        });
      }
      if (Number(booking.travelFee) > 0) {
        lineItems.push({
          name: "Travel Fee",
          qty: 1,
          price: Number(booking.travelFee),
        });
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

      const [newInvoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.invoiceNumber, invoiceNumber))
        .limit(1);
      return { invoiceId: newInvoice?.id, invoiceNumber };
    }),

  // ── Admin: Today's schedule ───────────────────────────────────────────────
  todaySchedule: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "employee")
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    return db
      .select()
      .from(bookings)
      .where(
        and(
          gte(bookings.appointmentDate, start),
          lte(bookings.appointmentDate, end)
        )
      )
      .orderBy(bookings.appointmentDate);
  }),

  // ── Admin: Dashboard stats ────────────────────────────────────────────────
  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const [newCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, "new"));
    const [confirmedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, "confirmed"));
    const [completedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, "completed"));
    const [totalCustomers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers);

    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    const [todayCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(
          gte(bookings.appointmentDate, start),
          lte(bookings.appointmentDate, end)
        )
      );

    return {
      newBookings: Number(newCount.count),
      confirmedBookings: Number(confirmedCount.count),
      completedBookings: Number(completedCount.count),
      totalCustomers: Number(totalCustomers.count),
      todayAppointments: Number(todayCount.count),
    };
  }),

  // ── Customer Portal: bookings by email (public — email is the "key") ─────────
  listByEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        limit: z.number().int().default(50),
      })
    )
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
