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

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Health check registered FIRST — before everything else ──
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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

  // Await the listen so we know the port is bound before logging
  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "0.0.0.0", () => {
      console.log(`[Server] Listening on http://0.0.0.0:${port}/`);
      console.log(`[Server] NODE_ENV=${process.env.NODE_ENV}`);
      resolve();
    });
  });

  // Run DB migrations AFTER the server is already bound — health check
  // will pass immediately while migrations complete in the background
  runMigrationsInBackground();
}

async function runMigrationsInBackground() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[Migrate] DATABASE_URL not set — skipping");
    return;
  }

  try {
    // Dynamically import to avoid crashing server if mysql2 has any load issues
    const { createConnection } = await import("mysql2/promise");
    const { readdir, readFile } = await import("fs/promises");
    const { join } = await import("path");

    console.log("[Migrate] Connecting...");

    // Race the connection against a 20s timeout
    const conn = await Promise.race<any>([
      createConnection(dbUrl),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB connection timed out")), 20000)
      ),
    ]);

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
      if ((rows as any[]).length > 0) continue;

      const sql = await readFile(join(migrationsDir, file), "utf-8");
      const statements = sql
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
      console.log(`[Migrate] Applied: ${file}`);
      applied++;
    }

    await conn.end();
    console.log(`[Migrate] Done — ${applied} migration(s) applied`);
  } catch (err: any) {
    // Non-fatal — app runs, DB errors surface at query time
    console.error("[Migrate] Failed (non-fatal):", err?.message ?? err);
  }
}

startServer().catch((err) => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});
