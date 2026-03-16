/**
 * Production static file server — no Vite dependency.
 * Used only when NODE_ENV=production.
 */
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In the compiled dist/index.js, import.meta.dirname is /app/dist
  // The Vite build outputs frontend to /app/dist/public
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `[Static] Build directory not found: ${distPath}. Make sure to build the client first.`
    );
  } else {
    console.log(`[Static] Serving static files from: ${distPath}`);
  }

  app.use(express.static(distPath));

  // SPA fallback — return index.html for all non-API routes
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found — build the client first");
    }
  });
}
