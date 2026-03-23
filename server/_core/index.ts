import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

process.on("uncaughtException", (err) => {
  console.error("[Fatal] Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
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
      setTimeout(() => reject(new Error("DB connection timed out after 20s")), 20000)
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
    const sanitized = sql.replace(/--> statement-breakpoint/g, "");
    const statements = sanitized
      .split(";")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && !s.startsWith("--"));

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
      res.status(500).json({ success: false, error: err?.message ?? String(err) });
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
      log.forEach((l) => console.log(`[Migrate] ${l}`));
      console.log(`[Migrate] Complete — ${applied} applied`);
      await seedDefaultContent().catch((e: any) => console.error("[Seed] Failed:", e?.message));
    })
    .catch((err: any) => {
      console.error("[Migrate] Background migration failed (non-fatal):", err?.message ?? err);
    });
}

startServer().catch((err) => {
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
    { section: "hero", key: "badge",             value: "Premium Mobile Detailing — Wisconsin" },
    { section: "hero", key: "headline",           value: "Your Vehicle.\nPerfected.\nAt Your Door." },
    { section: "hero", key: "subheadline",        value: "Detailing Labs brings showroom-quality results directly to you. Professional mobile detailing at your home, office, or anywhere that works — no drop-off. No hassle." },
    { section: "hero", key: "cta_primary",        value: "Book Your Detail" },
    { section: "hero", key: "cta_secondary",      value: "View Packages" },
    { section: "hero", key: "trust_reviews",      value: "5.0 · 150+ five-star reviews" },
    { section: "hero", key: "trust_certified",    value: "Fully insured & certified" },
    { section: "hero", key: "trust_availability", value: "Same-week availability" },
    // About
    { section: "about", key: "headline",          value: "Built on Passion for Paint" },
    { section: "about", key: "body",              value: "We built Detailing Labs around one principle: your time is valuable. We bring the equipment, the expertise, and the premium products directly to you — so you can enjoy a showroom-quality vehicle without disrupting your day." },
    { section: "about", key: "years_experience",  value: "5+" },
    { section: "about", key: "vehicles_detailed", value: "1,000+" },
    { section: "about", key: "satisfaction_rate", value: "99%" },
    { section: "about", key: "service_areas",     value: "10+" },
    // Contact
    { section: "contact", key: "phone",           value: "(262) 555-0190" },
    { section: "contact", key: "email",           value: "hello@detailinglabswi.com" },
    { section: "contact", key: "address",         value: "Greater Milwaukee & Waukesha, WI" },
    { section: "contact", key: "hours_weekday",   value: "Mon–Fri: 7:00 AM – 7:00 PM" },
    { section: "contact", key: "hours_weekend",   value: "Sat–Sun: 8:00 AM – 5:00 PM" },
    // Business
    { section: "business", key: "name",                   value: "Detailing Labs" },
    { section: "business", key: "tagline",                value: "Premium Mobile Auto Detailing" },
    { section: "business", key: "tax_rate",               value: "0.055" },
    { section: "business", key: "travel_fee_base",        value: "0" },
    { section: "business", key: "service_radius_miles",   value: "40" },
    { section: "business", key: "booking_advance_hours",  value: "24" },
  ];

  for (const row of defaults) {
    const existing = await db
      .select()
      .from(siteContent)
      .where(and(eq(siteContent.section, row.section), eq(siteContent.key, row.key)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(siteContent).values(row);
    }
  }
  console.log("[Seed] Default site content seeded ✅");
}
