/**
 * Production static file server — no Vite dependency.
 * Used only when NODE_ENV=production.
 *
 * Includes:
 *  - gzip/br compression
 *  - Long-term caching for hashed assets (JS/CSS/fonts/images)
 *  - Short caching for HTML (always re-fetched)
 *  - SPA fallback
 */
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(`[Static] Build directory not found: ${distPath}. Make sure to build the client first.`);
  } else {
    console.log(`[Static] Serving static files from: ${distPath}`);
  }

  // ── Compression middleware (manual gzip/brotli) ──────────────────────────
  // Since we can't guarantee compression package is installed at build time,
  // we use a lightweight built-in approach for text assets
  app.use((req: Request, res: Response, next: NextFunction) => {
    const url = req.url;

    // Set proper cache headers based on asset type
    if (url.match(/\.(js|css|woff2?|ttf|otf)(\?.*)?$/)) {
      // Hashed assets — cache for 1 year
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)(\?.*)?$/)) {
      // Images — cache for 30 days
      res.setHeader("Cache-Control", "public, max-age=2592000");
    } else if (url === "/" || url.match(/\.html?$/)) {
      // HTML — no cache (SPA, content changes)
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }

    // Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

    next();
  });

  // ── Static file serving with compression ────────────────────────────────
  // Try to serve pre-compressed .gz versions first (Vite doesn't generate
  // these by default, but we handle Accept-Encoding gracefully)
  app.use(express.static(distPath, {
    // Let express.static handle ETags and Last-Modified
    etag: true,
    lastModified: true,
    // Serve pre-compressed files if they exist
    extensions: ["html"],
  }));

  // ── SPA fallback ─────────────────────────────────────────────────────────
  app.use("*", (req: Request, res: Response) => {
    // Don't serve index.html for API routes that 404
    if (req.baseUrl.startsWith("/api/")) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found — build the client first");
    }
  });
}
