import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { invoices, bookings, siteContent } from "../../drizzle/schema";
import { sendEmail, receiptEmail } from "../email";

// ── Square helpers ────────────────────────────────────────────────────────────
const SQ_BASE = process.env.SQUARE_ENVIRONMENT === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

async function squareRequest(method: string, path: string, body?: unknown) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("SQUARE_ACCESS_TOKEN not set");
  const res = await fetch(`${SQ_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-11-20",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  
  // ── Create Square deposit link for a booking ─────────────────────────────
  // Called when admin approves a booking with a deposit amount.
  // Returns a Square checkout URL; booking is marked confirmed only after payment.
  createDepositLink: protectedProcedure
    .input(z.object({
      bookingId:     z.number().int(),
      depositAmount: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

      const locationId = process.env.SQUARE_LOCATION_ID;
      if (!locationId) throw new TRPCError({ code: "BAD_REQUEST", message: "SQUARE_LOCATION_ID not set" });

      const amountCents  = Math.round(input.depositAmount * 100);
      const description  = booking.packageName ?? "Mobile Detailing";
      const customerName = `${booking.customerFirstName} ${booking.customerLastName}`.trim();
      const redirectUrl  = `${process.env.APP_URL ?? "https://detailinglabswi.com"}/booking/confirmation/${booking.bookingNumber}`;

      const data = await squareRequest("POST", "/v2/online-checkout/payment-links", {
        idempotency_key: `deposit-${booking.bookingNumber}-${Date.now()}`,
        quick_pay: {
          name:        `Deposit — ${description} (${customerName})`,
          price_money: { amount: amountCents, currency: "USD" },
          location_id: locationId,
        },
        checkout_options: {
          redirect_url:              redirectUrl,
          ask_for_shipping_address:  false,
          merchant_support_email:    process.env.EMAIL_FROM ?? "hello@detailinglabswi.com",
        },
        pre_populated_data: {
          buyer_email:        booking.customerEmail ?? undefined,
          buyer_phone_number: booking.customerPhone ?? undefined,
        },
        description: `Deposit for booking ${booking.bookingNumber}`,
      });

      const paymentUrl: string = data.payment_link?.url;
      const orderId: string    = data.payment_link?.order_id;
      if (!paymentUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Square did not return a payment URL" });

      await db.update(bookings).set({
        depositAmount:     String(input.depositAmount) as any,
        depositPaymentUrl: paymentUrl,
        depositOrderId:    orderId,
      }).where(eq(bookings.id, input.bookingId));

      return { paymentUrl, orderId };
    }),
});
  const json = await res.json() as any;
  if (!res.ok) throw new Error(json?.errors?.[0]?.detail || `Square error ${res.status}`);
  return json;
}

export const paymentsRouter = router({

  // ── Create Square payment link for an invoice ─────────────────────────────
  createPaymentLink: protectedProcedure
    .input(z.object({ invoiceId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });

      let booking = null;
      if (inv.bookingId) {
        const [b] = await db.select().from(bookings).where(eq(bookings.id, inv.bookingId)).limit(1);
        booking = b ?? null;
      }

      const amountCents = Math.round(Number(inv.totalAmount) * 100);
      const description = booking?.packageName ?? "Mobile Detailing Service";
      const customerName = booking ? `${booking.customerFirstName} ${booking.customerLastName}`.trim() : "Customer";
      const redirectUrl = `${process.env.APP_URL ?? "https://detailinglabswi.com"}/invoice-paid?invoice=${inv.invoiceNumber}`;

      const locationId = process.env.SQUARE_LOCATION_ID;
      if (!locationId) throw new TRPCError({ code: "BAD_REQUEST", message: "SQUARE_LOCATION_ID not set in Railway variables" });

      const data = await squareRequest("POST", "/v2/online-checkout/payment-links", {
        idempotency_key: `inv-${inv.invoiceNumber}-${Date.now()}`,
        quick_pay: {
          name: `Detailing Labs — ${description}`,
          price_money: { amount: amountCents, currency: "USD" },
          location_id: locationId,
        },
        checkout_options: {
          redirect_url: redirectUrl,
          ask_for_shipping_address: false,
          merchant_support_email: process.env.EMAIL_FROM ?? "hello@detailinglabswi.com",
        },
        pre_populated_data: {
          buyer_email: booking?.customerEmail ?? undefined,
          buyer_phone_number: booking?.customerPhone ?? undefined,
        },
        description: `Invoice ${inv.invoiceNumber} — ${customerName}`,
      });

      const paymentUrl: string = data.payment_link?.url;
      const orderId: string    = data.payment_link?.order_id;
      if (!paymentUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Square did not return a payment URL" });

      // Store link on invoice
      await db.update(invoices).set({
        notes: [inv.notes, `Square payment link: ${paymentUrl}`].filter(Boolean).join("\n"),
      } as any).where(eq(invoices.id, inv.id));

      return { paymentUrl, orderId };
    }),

  // ── Square webhook — payment completed ────────────────────────────────────
  // Called by Square when a payment is made. Set webhook URL in Square dashboard:
  // https://yourdomain.com/api/webhooks/square
  webhook: publicProcedure
    .input(z.object({ body: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };

      let event: any;
      try { event = JSON.parse(input.body); } catch { return { ok: false }; }

      if (event.type !== "payment.completed") return { ok: true };

      const orderId: string | undefined = event.data?.object?.payment?.order_id;
      if (!orderId) return { ok: true };

      // Check if this is a booking deposit payment
      const { bookings: bookingsTable } = await import("../../drizzle/schema");
      const [depositBooking] = await db
        .select()
        .from(bookingsTable)
        .where(eq(bookingsTable.depositOrderId, orderId))
        .limit(1);

      if (depositBooking && !depositBooking.depositPaid) {
        await db.update(bookingsTable).set({
          depositPaid:   true,
          depositPaidAt: new Date(),
          // Mark fully confirmed once deposit is paid
          status: "confirmed" as any,
        }).where(eq(bookingsTable.id, depositBooking.id));

        // Send confirmation email
        if (depositBooking.customerEmail) {
          const { bookingApprovedEmail } = await import("../emailMarketing");
          const { sendEmail } = await import("../email");
          const apt = new Date(depositBooking.appointmentDate);
          const emailContent = bookingApprovedEmail({
            customerFirstName: depositBooking.customerFirstName,
            customerEmail:     depositBooking.customerEmail,
            bookingNumber:     depositBooking.bookingNumber,
            packageName:       depositBooking.packageName,
            confirmedDate:     apt.toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
              hour: "numeric", minute: "2-digit",
            }),
            serviceAddress:    depositBooking.serviceAddress,
            vehicleMake:       depositBooking.vehicleMake,
            vehicleModel:      depositBooking.vehicleModel,
            vehicleYear:       depositBooking.vehicleYear,
            totalAmount:       depositBooking.totalAmount ? Number(depositBooking.totalAmount) : null,
            depositPaid:       Number(depositBooking.depositAmount ?? 0),
          });
          sendEmail({ to: depositBooking.customerEmail, ...emailContent }).catch(console.error);
        }

        console.log(`[Square] Deposit paid for booking ${depositBooking.bookingNumber}`);
        return { ok: true };
      }

      // Find invoice via notes (stores order id in link notes) — or look up by order
      const allInvoices = await db.select().from(invoices).limit(200);
      const inv = allInvoices.find(i => i.notes?.includes(orderId));
      if (!inv) return { ok: true };
      if (inv.status === "paid") return { ok: true }; // already processed

      // Mark paid
      await db.update(invoices).set({ status: "paid", paidAt: new Date() } as any).where(eq(invoices.id, inv.id));

      // Send receipt
      if (inv.bookingId) {
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, inv.bookingId)).limit(1);
        const contactRows = await db.select().from(siteContent).where(eq(siteContent.section, "contact")).limit(20);
        const phone    = contactRows.find(r => r.key === "phone")?.value    || "(262) 260-9474";
        const bizEmail = contactRows.find(r => r.key === "email")?.value    || "hello@detailinglabswi.com";
        const lineItems: { name: string; qty: number; price: number }[] = inv.lineItems ? JSON.parse(inv.lineItems) : [];

        if (booking?.customerEmail) {
          const receipt = receiptEmail({
            invoiceNumber:     inv.invoiceNumber,
            customerFirstName: booking.customerFirstName,
            packageName:       booking.packageName ?? "Mobile Detailing",
            serviceAddress:    [booking.serviceAddress, booking.serviceCity, booking.serviceState].filter(Boolean).join(", "),
            lineItems,
            totalAmount:       Number(inv.totalAmount),
            paidAt:            new Date(),
            phone,
            businessEmail:     bizEmail,
          });
          sendEmail({ to: booking.customerEmail, ...receipt }).catch(console.error);
        }
      }

      return { ok: true };
    }),
});
