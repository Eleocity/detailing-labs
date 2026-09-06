/**
 * Production static file server — no Vite dependency.
 * Used only when NODE_ENV=production.
 *
 * Cache-Control is set explicitly rather than left to express.static's
 * defaults: Vite content-hashes every file under /assets (a new deploy
 * gets new filenames), so those are safe to cache forever. index.html is
 * NOT hashed and references those filenames by name — every build
 * overwrites it in place (emptyOutDir), so a cached copy from before a
 * deploy points at asset files that no longer exist on the server. That
 * combination (long-lived HTML cache pointing at content-hashed assets)
 * is what causes a "site won't load" report right after a deploy for
 * anyone with a stale cached copy — e.g. a phone or a CDN edge node that
 * hasn't revalidated — while a browser with no cache loads fine.
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

  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        if (path.resolve(filePath) === path.resolve(distPath, "index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (
          path.dirname(filePath) === path.resolve(distPath, "assets")
        ) {
          // Vite content-hashes these filenames — a changed file always
          // gets a new name, so caching indefinitely is safe.
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          // Unhashed public/ files (favicon, manifest, /brand/*) — safe to
          // cache, but not indefinitely, since a filename change isn't
          // guaranteed the way it is under /assets.
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    })
  );

  // SPA fallback — return index.html for all non-API routes
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found — build the client first");
    }
  });
}
