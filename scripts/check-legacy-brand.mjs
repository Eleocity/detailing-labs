#!/usr/bin/env node
/**
 * Fails CI/local runs if disallowed "Detailing Labs" branding remains
 * outside the approved migration allowlist.
 *
 * Run: npm run check:legacy-brand
 */
import { readdir, readFile } from "fs/promises";
import { join, relative, sep } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".vite",
  "coverage",
  // design-sync scratch/build output (gitignored — see .design-sync/NOTES.md).
  // Can contain the local absolute repo path, which coincidentally contains
  // "Detailing Labs" on this machine (the parent folder name) — not a real
  // brand-name leak, and not committed source either way.
  ".ds-sync",
  "ds-bundle",
]);

const SKIP_FILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "check-legacy-brand.mjs", // contains the search patterns themselves
]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".html",
  ".txt",
]);

// Files where legacy-brand references are expected and intentional during
// the migration window (still-live domain, historical/context docs, the
// data migration that targets the old string on purpose). Update this list
// as the migration progresses — e.g. once DNS cuts over to the real domain,
// remove the "live domain" entries.
const ALLOWLIST = new Set(
  [
    "docs/URABLE_INTEGRATION.md",
    "docs/REBRAND_MIGRATION.md",
    "docs/URABLE_REBRAND_CHECKLIST.md",
    "drizzle/0012_forma_rebrand_content.sql",
    "shared/brand.ts",
    "client/index.html",
    "client/public/sitemap.xml",
    "client/public/robots.txt",
    "server/email.ts",
    "server/routers/auth.ts",
    "server/routers/content.ts",
    "server/routers/invoices.ts",
    "server/routers/payments.ts",
    "server/routers/followUp.ts",
    "server/routers/urable.ts",
    "server/_core/index.ts",
    "client/src/pages/admin/AdminSiteEditor.tsx",
    // Contains the search pattern itself, as a regex literal, to assert
    // brand copy does NOT match it.
    "server/brandConfig.test.ts",
  ].map(p => p.split("/").join(sep))
);

// Case-insensitive; matches "Detailing Labs", "DetailingLabs",
// "detailinglabs", and the live/legacy domain.
const PATTERNS = [/detailing[\s-]?labs/i, /detailinglabswi\.com/i];

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(join(dir, entry.name), files);
    } else {
      if (SKIP_FILES.has(entry.name)) continue;
      const ext = entry.name.slice(entry.name.lastIndexOf("."));
      if (!TEXT_EXTENSIONS.has(ext)) continue;
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

async function main() {
  const files = await walk(ROOT);
  const violations = [];

  for (const absPath of files) {
    const relPath = relative(ROOT, absPath);
    if (ALLOWLIST.has(relPath)) continue;

    const content = await readFile(absPath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of PATTERNS) {
        if (pattern.test(lines[i])) {
          violations.push({
            file: relPath,
            line: i + 1,
            text: lines[i].trim().slice(0, 120),
          });
          break;
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      `\n❌ Found ${violations.length} legacy "Detailing Labs" reference(s) outside the migration allowlist:\n`
    );
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  ${v.text}`);
    }
    console.error(
      `\nIf a match is intentional (e.g. still-live legacy domain), add the file to ALLOWLIST in scripts/check-legacy-brand.mjs — don't silently ignore new ones.\n`
    );
    process.exit(1);
  }

  console.log("✅ No disallowed legacy brand references found.");
}

main().catch(err => {
  console.error("check:legacy-brand failed to run:", err);
  process.exit(1);
});
