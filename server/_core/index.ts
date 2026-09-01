import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { BRAND } from "../../shared/brand";

process.on("uncaughtException", err => {
  console.error("[Fatal] Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", reason => {
  console.error("[Fatal] Unhandled rejection:", reason);
  process.exit(1);
});

async function runMigrations(): Promise<{ applied: number; log: string[] }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const { createConnection } = await import("mysql2/promise");
  const { readdir, readFile } = await import("fs/promises");
  const { join } = await import("path");

  const conn = await Promise.race<any>([
    createConnection(dbUrl),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("DB connection timed out after 20s")),
        20000
      )
    ),
  ]);

  const log: string[] = [];

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hash VARCHAR(255) NOT NULL UNIQUE,
      created_at BIGINT
    )
  `);

  const migrationsDir = join(process.cwd(), "drizzle");
  const files = (await readdir(migrationsDir))
    .filter((f: string) => f.endsWith(".sql"))
    .sort();

  let applied = 0;
  for (const file of files) {
    const hash = file.replace(".sql", "");
    const [rows]: any = await conn.execute(
      "SELECT id FROM __drizzle_migrations WHERE hash = ?",
      [hash]
    );
    if ((rows as any[]).length > 0) {
      log.push(`✓ ${file} (already applied)`);
      continue;
    }

    const sql = await readFile(join(migrationsDir, file), "utf-8");
    // Drizzle migration files use '--> statement-breakpoint' as a separator.
    // We must strip those markers BEFORE splitting on ';' — otherwise the
    // '-->...' text (which starts with '--') gets treated as a comment and
    // every ALTER TABLE / CREATE TABLE after a breakpoint is silently dropped.
    // NOTE: scripts/migrate.mjs has its own independent copy of this same
    // logic (a manual/local migration tool — not part of the actual deploy
    // path, which runs THIS function on every boot). That copy drifted out
    // of sync and lacked this fix for a long time without anyone noticing,
    // precisely because production only ever exercised this version. Keep
    // both in sync if you touch either.
    const sanitized = sql.replace(/--> statement-breakpoint/g, "");
    const statements = sanitized
      .split(";")
      .map((s: string) => {
        // Strip leading comment lines (lines starting with --) from each statement
        // so a comment at the top of a file doesn't cause the entire statement to be dropped
        return s
          .split("\n")
          .filter((line: string) => !line.trim().startsWith("--"))
          .join("\n")
          .trim();
      })
      .filter((s: string) => s.length > 0);

    for (const stmt of statements) {
      await conn.execute(stmt);
    }
    await conn.execute(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      [hash, Date.now()]
    );
    log.push(`✅ Applied: ${file}`);
    applied++;
  }

  await conn.end();
  return { applied, log };
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Health check — always first ──
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Square webhook ───────────────────────────────────────────────────────
  app.post(
    "/api/webhooks/square",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      // Respond immediately — Square requires a fast 200
      res.status(200).json({ ok: true });
      try {
        const bodyStr =
          req.body instanceof Buffer
            ? req.body.toString("utf8")
            : JSON.stringify(req.body);
        const event = JSON.parse(bodyStr);
        if (event.type !== "payment.completed") return;

        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return;

        const {
          invoices: invTable,
          bookings: bkTable,
          siteContent: scTable,
        } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const { sendEmail, receiptEmail } = await import("../email");

        const orderId: string | undefined =
          event.data?.object?.payment?.order_id;
        if (!orderId) return;

        // Find the invoice whose notes contain this order id
        const allInv = await db.select().from(invTable).limit(500);
        const inv = allInv.find((i: any) => i.notes?.includes(orderId));
        if (!inv || inv.status === "paid") return;

        // Mark paid
        await db
          .update(invTable)
          .set({ status: "paid", paidAt: new Date() } as any)
          .where(eq(invTable.id, inv.id));
        console.log(
          `[Square] Invoice ${inv.invoiceNumber} marked paid via webhook`
        );

        // Send receipt
        if (!inv.bookingId) return;
        const [booking] = await db
          .select()
          .from(bkTable)
          .where(eq(bkTable.id, inv.bookingId))
          .limit(1);
        if (!booking?.customerEmail) return;

        const rows = await db
          .select()
          .from(scTable)
          .where(eq(scTable.section, "contact"))
          .limit(20);
        const phone =
          rows.find((r: any) => r.key === "phone")?.value || BRAND.phone;
        const bizEmail =
          rows.find((r: any) => r.key === "email")?.value ||
          BRAND.emailLive;
        const lineItems: { name: string; qty: number; price: number }[] =
          inv.lineItems ? JSON.parse(inv.lineItems) : [];

        const receipt = receiptEmail({
          invoiceNumber: inv.invoiceNumber,
          customerFirstName: booking.customerFirstName,
          packageName: booking.packageName ?? "Mobile Detailing",
          serviceAddress: [
            booking.serviceAddress,
            booking.serviceCity,
            booking.serviceState,
          ]
            .filter(Boolean)
            .join(", "),
          lineItems,
          totalAmount: Number(inv.totalAmount),
          paidAt: new Date(),
          phone,
          businessEmail: bizEmail,
        });
        await sendEmail({ to: booking.customerEmail, ...receipt });
        console.log(`[Square] Receipt sent to ${booking.customerEmail}`);
      } catch (err: any) {
        console.error("[Square webhook error]", err?.message);
      }
    }
  );

  // ── Urable webhook ───────────────────────────────────────────────────────
  app.post(
    "/api/webhooks/urable",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      res.status(200).json({ ok: true });
      try {
        const bodyStr =
          req.body instanceof Buffer
            ? req.body.toString("utf8")
            : JSON.stringify(req.body);
        const { parseUrableWebhook } = await import("../urable");
        const event = parseUrableWebhook(bodyStr);
        if (!event) return;
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return;
        const { customers, bookings } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        console.log(`[Urable webhook] ${event.type}`);

        if (
          event.type === "job.completed" ||
          event.type === "job.status_updated"
        ) {
          const urableJobId = String(
            event.data?.job_id ?? event.data?.id ?? ""
          );
          const newStatus = event.data?.status ?? "";
          if (!urableJobId) return;
          const all = await db.select().from(bookings).limit(500);
          const booking = all.find((b: any) => b.urableJobId === urableJobId);
          if (!booking) return;
          const map: Record<string, string> = {
            completed: "completed",
            cancelled: "cancelled",
            confirmed: "confirmed",
            in_progress: "in_progress",
          };
          const mapped = map[newStatus.toLowerCase()];
          if (mapped)
            await db
              .update(bookings)
              .set({ status: mapped as any })
              .where(eq(bookings.id, booking.id));
        }

        if (event.type === "job.paid") {
          const urableJobId = String(
            event.data?.job_id ?? event.data?.id ?? ""
          );
          if (!urableJobId) return;
          const all = await db.select().from(bookings).limit(500);
          const booking = all.find((b: any) => b.urableJobId === urableJobId);
          if (booking)
            await db
              .update(bookings)
              .set({ paymentStatus: "paid" as any })
              .where(eq(bookings.id, booking.id));
        }

        if (
          event.type === "customer.updated" ||
          event.type === "customer.created"
        ) {
          const urableId = String(event.data?.id ?? "");
          const email = event.data?.email ?? "";
          if (!email) return;
          const existing = await db
            .select()
            .from(customers)
            .where(eq(customers.email, email))
            .limit(1);
          if (existing.length > 0) {
            await db
              .update(customers)
              .set({
                ...(event.data?.first_name
                  ? { firstName: event.data.first_name }
                  : {}),
                ...(event.data?.last_name
                  ? { lastName: event.data.last_name }
                  : {}),
                ...(event.data?.phone ? { phone: event.data.phone } : {}),
                urableId,
                urableSyncedAt: new Date(),
              } as any)
              .where(eq(customers.id, existing[0].id));
          }
        }
      } catch (err: any) {
        console.error("[Urable webhook error]", err?.message);
      }
    }
  );

  // ── Force HTTPS in production ──
  // Railway terminates TLS at the edge and sets x-forwarded-proto
  app.use((req, res, next) => {
    if (
      process.env.NODE_ENV === "production" &&
      req.headers["x-forwarded-proto"] === "http"
    ) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });

  // ── Canonical domain redirect ──
  // BRAND.domain.live (formaautospa.com) is canonical. Anything else this
  // app is reachable on — the www subdomain, or the legacy detailinglabswi.com
  // domain (still resolves; kept only as a redirect target, see the comment
  // on BRAND.domain.legacy) — 301s through, preserving the full path and
  // query string so e.g. detailinglabswi.com/pricing?tab=ceramic lands on
  // formaautospa.com/pricing?tab=ceramic instead of a generic homepage
  // redirect. Skipped outside production so local dev (localhost, Railway
  // preview URLs) isn't redirected.
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();
    const host = (req.headers.host ?? "").toLowerCase().split(":")[0];
    if (host && host !== BRAND.domain.live) {
      const isKnownAlias =
        host === `www.${BRAND.domain.live}` ||
        host === BRAND.domain.legacy ||
        host === `www.${BRAND.domain.legacy}`;
      if (isKnownAlias) {
        return res.redirect(301, `https://${BRAND.domain.live}${req.originalUrl}`);
      }
    }
    next();
  });

  // ── Cron: process follow-up queue ──────────────────────────────────────────
  app.get("/api/cron/process-followup", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers["x-cron-secret"] !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "DB unavailable" });
        return;
      }
      const { followUpQueue, bookings: bkTable } = await import(
        "../../drizzle/schema"
      );
      const { eq, and, lte } = await import("drizzle-orm");
      const { sendEmail } = await import("../email");
      const pending = await db
        .select()
        .from(followUpQueue)
        .where(
          and(
            eq(followUpQueue.status, "pending"),
            lte(followUpQueue.scheduledFor, new Date())
          )
        )
        .limit(50);
      let sent = 0;
      for (const item of pending) {
        try {
          const [booking] = await db
            .select()
            .from(bkTable)
            .where(eq(bkTable.id, item.bookingId))
            .limit(1);
          if (!booking?.customerEmail) {
            await db
              .update(followUpQueue)
              .set({ status: "skipped" } as any)
              .where(eq(followUpQueue.id, item.id));
            continue;
          }
          const name = booking.customerFirstName;
          let subject = "";
          let html = "";
          const bookingUrl = `https://${BRAND.domain.live}${BRAND.booking.primaryPath}`;
          if (item.type === "review_request") {
            subject = `How did we do, ${name}?`;
            html = `<p>Hi ${name},</p><p>Thank you for choosing ${BRAND.displayName}! We'd love your feedback — just reply to this email and let us know how it went.</p><p>— The ${BRAND.displayName} Team</p>`;
          } else if (item.type === "follow_up") {
            subject = `Checking in, ${name}`;
            html = `<p>Hi ${name},</p><p>Just checking in — hope your vehicle is still looking great! Any questions, just reply.</p><p>— The ${BRAND.displayName} Team</p>`;
          } else {
            subject = `Time for another detail?`;
            html = `<p>Hi ${name},</p><p>It's been about a month! <a href="${bookingUrl}">Book your next detail →</a></p><p>— The ${BRAND.displayName} Team</p>`;
          }
          await sendEmail({ to: booking.customerEmail, subject, html });
          await db
            .update(followUpQueue)
            .set({ status: "sent", sentAt: new Date() } as any)
            .where(eq(followUpQueue.id, item.id));
          sent++;
        } catch {
          /* skip */
        }
      }
      res.json({ ok: true, processed: pending.length, sent });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ── Cron: process appointment reminders ─────────────────────────────────────
  app.get("/api/cron/process-reminders", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers["x-cron-secret"] !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "DB unavailable" });
        return;
      }
      const { appointmentReminders, bookings: bkTable } = await import(
        "../../drizzle/schema"
      );
      const { eq, and, lte } = await import("drizzle-orm");
      const { sendEmail } = await import("../email");
      const pending = await db
        .select()
        .from(appointmentReminders)
        .where(
          and(
            eq(appointmentReminders.status, "pending"),
            lte(appointmentReminders.scheduledFor, new Date())
          )
        )
        .limit(50);
      let sent = 0;
      for (const reminder of pending) {
        try {
          const [booking] = await db
            .select()
            .from(bkTable)
            .where(eq(bkTable.id, reminder.bookingId))
            .limit(1);
          if (!booking) {
            await db
              .update(appointmentReminders)
              .set({ status: "failed" } as any)
              .where(eq(appointmentReminders.id, reminder.id));
            continue;
          }
          const timeLabel = reminder.type === "24h" ? "tomorrow" : "in 2 hours";
          const apptTime = new Date(booking.appointmentDate).toLocaleTimeString(
            "en-US",
            { hour: "numeric", minute: "2-digit" }
          );
          let ok = false;
          if (reminder.channel === "email" && booking.customerEmail) {
            ok = await sendEmail({
              to: booking.customerEmail,
              subject: `Reminder: Your Forma Auto Spa appointment is ${timeLabel}`,
              html: `<p>Hi ${booking.customerFirstName},</p><p>Your appointment is <strong>${timeLabel} at ${apptTime}</strong>.</p><p>— The Forma Auto Spa Team</p>`,
            });
          }
          await db
            .update(appointmentReminders)
            .set({
              status: ok ? "sent" : "failed",
              sentAt: ok ? new Date() : null,
            } as any)
            .where(eq(appointmentReminders.id, reminder.id));
          if (ok) sent++;
        } catch {
          /* skip */
        }
      }
      res.json({ ok: true, processed: pending.length, sent });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ── Manual migration trigger (secured by MIGRATE_SECRET env var) ──
  app.all("/api/migrate", async (req, res) => {
    const secret = process.env.MIGRATE_SECRET;
    const provided = req.headers["x-migrate-secret"] ?? req.query.secret;
    if (secret && provided !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const result = await runMigrations();
      console.log(`[Migrate] Done — ${result.applied} applied`);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[Migrate] Failed:", err?.message);
      res
        .status(500)
        .json({ success: false, error: err?.message ?? String(err) });
    }
  });

  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);

  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "0.0.0.0", () => {
      console.log(`[Server] Listening on http://0.0.0.0:${port}/`);
      console.log(`[Server] NODE_ENV=${process.env.NODE_ENV}`);
      resolve();
    });
  });

  // Auto-run migrations in background after server is bound
  runMigrations()
    .then(async ({ applied, log }) => {
      log.forEach(l => console.log(`[Migrate] ${l}`));
      console.log(`[Migrate] Complete — ${applied} applied`);
      await seedDefaultContent().catch((e: any) =>
        console.error("[Seed] Failed:", e?.message)
      );
    })
    .catch((err: any) => {
      console.error(
        "[Migrate] Background migration failed (non-fatal):",
        err?.message ?? err
      );
    });
}

startServer().catch(err => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});

async function seedDefaultContent() {
  const db = await (await import("../db")).getDb();
  if (!db) return;

  const { siteContent } = await import("../../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  const defaults: { section: string; key: string; value: string }[] = [
    // Hero
    {
      section: "hero",
      key: "badge",
      value: "Mobile Detailing · Racine County, WI",
    },
    {
      section: "hero",
      key: "headline",
      value: "Your Car Deserves<br/>Better Than a Drive-Through.",
    },
    {
      section: "hero",
      key: "subheadline",
      value:
        "Forma Auto Spa is a professional mobile detailing service based in Southeast Wisconsin. We bring a fully equipped setup — our own water, our own power — directly to your driveway. No drop-off. No waiting rooms. Just results.",
    },
    { section: "hero", key: "cta_primary", value: "Book Your Appointment" },
    { section: "hero", key: "cta_secondary", value: "See What's Included" },
    // Not a review rating — no real review-rating data source exists yet
    // (see docs/REBRAND_MIGRATION.md). Don't reintroduce a hardcoded
    // number/star rating here until real review data is wired up.
    {
      section: "hero",
      key: "trust_reviews",
      value: "Documented before & after, every job",
    },
    {
      section: "hero",
      key: "trust_certified",
      value: "Fully insured & certified",
    },
    {
      section: "hero",
      key: "trust_availability",
      value: BRAND.hours.short,
    },
    // About
    { section: "about", key: "headline", value: "Built on Passion for Paint" },
    {
      section: "about",
      key: "body",
      value:
        "We designed Forma Auto Spa around one problem: finding a truly professional detailer in Southeast Wisconsin shouldn't be hard. We carry our own water tank, run our own generator, and use professional-grade products on every single job. You don't give up your day. You don't drive anywhere. We handle it where your car lives.",
    },
    { section: "about", key: "years_experience", value: "3+" },
    { section: "about", key: "vehicles_detailed", value: "100+" },
    { section: "about", key: "satisfaction_rate", value: "99%" },
    { section: "about", key: "service_areas", value: "10+" },
    // Contact
    { section: "contact", key: "phone", value: BRAND.phone },
    { section: "contact", key: "email", value: BRAND.emailLive },
    {
      section: "contact",
      key: "address",
      value: `${BRAND.serviceArea.headquartersCity}, ${BRAND.serviceArea.headquartersState} — Racine County`,
    },
    {
      section: "contact",
      key: "hours_weekday",
      value: BRAND.hours.weekday,
    },
    {
      section: "contact",
      key: "hours_weekend",
      value: BRAND.hours.weekend,
    },
    // Business
    { section: "business", key: "name", value: "Forma Auto Spa" },
    {
      section: "business",
      key: "tagline",
      value: "Professional Mobile Detailing — Southeast Wisconsin",
    },
    { section: "business", key: "tax_rate", value: "0.055" },
    { section: "business", key: "travel_fee_base", value: "0" },
    { section: "business", key: "service_radius_miles", value: "40" },
    { section: "business", key: "booking_advance_hours", value: "24" },
  ];

  for (const row of defaults) {
    const existing = await db
      .select()
      .from(siteContent)
      .where(
        and(eq(siteContent.section, row.section), eq(siteContent.key, row.key))
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(siteContent).values(row);
    }
  }
  // Sync canonical packages — INSERT-IF-MISSING, not wipe & replace.
  //
  // This used to unconditionally delete+reinsert on every boot, which was
  // the right call before FormaOps existed (it kept the DB in lockstep
  // with shared/services.ts's PACKAGES on every deploy). As of FormaOps
  // Phase 2, an approved pricing ChangeRequest durably updates a package's
  // `price` column here (see server/formaops/executors/pricing.ts) — a
  // wipe-and-reseed on the next restart would silently revert that,
  // undoing an owner-approved change with no record of it happening. So
  // this now only ever provides the INITIAL rows.
  //
  // Consequence: a source-code price/copy change in shared/services.ts no
  // longer automatically propagates to this table once the row already
  // exists — that now requires either a FormaOps ChangeRequest or a
  // migration. See docs/formaops/STATUS.md.
  const { packages, addOns } = await import("../../drizzle/schema");

  const canonicalPackages = [
    {
      name: "Full Showroom Reset",
      description:
        "Our most popular package — total vehicle transformation inside and out in one visit.",
      price: "229.99" as any,
      priceSedan: "229.99" as any,
      priceSuv: "269.99" as any,
      priceLarge: "359.99" as any,
      duration: 240,
      features: JSON.stringify([
        "Signature hand wash + wheel & tire deep clean",
        "Iron & bug/tar removal + hydrophobic spray wax (3-month protection)",
        "Compressed air blowout + deep vacuum (all surfaces)",
        "Dash / console / door scrub + UV protectant treatment",
        "Streak-free glass + floor mat restoration",
      ]),
      isPopular: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "The Signature Detail",
      description:
        "Our most intensive single-day service — paint-corrected, decontaminated, and coated.",
      price: "449.99" as any,
      priceSedan: "449.99" as any,
      priceSuv: "529.99" as any,
      priceLarge: "649.99" as any,
      duration: 480,
      features: JSON.stringify([
        "Everything in Full Showroom Reset",
        "Iron & fallout decontamination",
        "Clay bar paint decontamination",
        "1-stage paint correction (swirl & scratch reduction)",
        "Ceramic spray sealant (6-month protection)",
        "Before & after photo documentation",
      ]),
      isPopular: false,
      isActive: true,
      sortOrder: 2,
    },
  ];
  for (const pkg of canonicalPackages) {
    const existing = await db
      .select()
      .from(packages)
      .where(eq(packages.name, pkg.name))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(packages).values(pkg);
    }
  }
  console.log("[Seed] Packages synced (insert-if-missing) ✅");

  // NOTE: add-ons still wipe & replace on every boot — the same durability
  // problem `packages` had, just not yet fixed here because no FormaOps
  // executor writes to `addOns` yet (only `pricing` category → `packages`
  // is wired as of Phase 2). Apply the same insert-if-missing fix the
  // moment an add-on-pricing ChangeRequest category is added.
  await db.delete(addOns);
  await db.insert(addOns).values([
    {
      name: "Pet Hair Removal",
      description: "Starting at $49",
      price: "49.99" as any,
      duration: 30,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Odor Elimination Treatment",
      description: "Interior deodorizer treatment",
      price: "49.99" as any,
      duration: 30,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Engine Bay Detail",
      description: "Degreased & detailed engine bay",
      price: "49.99" as any,
      duration: 45,
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "Headlight Restoration",
      description: "Restore clarity & UV protection",
      price: "79.00" as any,
      duration: 45,
      isActive: true,
      sortOrder: 4,
    },
    {
      name: "Seat Extraction — Front Only",
      description: "$50–$75 depending on condition",
      price: "49.99" as any,
      duration: 60,
      isActive: true,
      sortOrder: 5,
    },
    {
      name: "Seat Extraction — Full Vehicle",
      description: "$100–$150 all rows",
      price: "99.99" as any,
      duration: 105,
      isActive: true,
      sortOrder: 6,
    },
    {
      name: "Seat Extraction — Per Seat (Spot)",
      description: "$25 per seat spot treatment",
      price: "24.99" as any,
      duration: 20,
      isActive: true,
      sortOrder: 7,
    },
  ]);
  console.log("[Seed] Add-ons synced ✅");

  console.log("[Seed] Default site content seeded ✅");
}
