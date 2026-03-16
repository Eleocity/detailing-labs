import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

// Catch any unhandled exceptions / rejections so Railway sees a clean crash
// log rather than a silent hang
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

  // ── Health check — registered FIRST so Railway can reach it immediately ──
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Legacy Manus OAuth callback (safe to keep for existing sessions)
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  // Static files (production) or Vite dev server (development)
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  // Railway injects PORT automatically; fall back to 3000 for local dev
  const port = parseInt(process.env.PORT || "3000", 10);

  // Bind explicitly to 0.0.0.0 so Railway's health checker can reach us
  // whether it uses IPv4 or IPv6
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Listening on http://0.0.0.0:${port}/`);
    console.log(`[Server] NODE_ENV=${process.env.NODE_ENV}`);
    console.log(`[Server] Health check: http://0.0.0.0:${port}/api/health`);
  });
}

startServer().catch((err) => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});
