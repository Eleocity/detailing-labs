/**
 * Database migration runner for Railway deployment.
 * Run this once after first deploy: node scripts/migrate.mjs
 * Or set as Railway start command: node scripts/migrate.mjs && node dist/index.js
 *
 * This applies all pending Drizzle migrations from the drizzle/ directory.
 */
import { createConnection } from "mysql2/promise";
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Splits a migration file into individual SQL statements.
 *
 * drizzle-kit-generated files separate statements with a
 * `--> statement-breakpoint` marker comment (sometimes on its own line,
 * sometimes glued right after the previous statement's `;` with no
 * newline). Hand-written migrations in this repo have no such marker —
 * just `;`-terminated statements with ordinary `-- comment` lines.
 *
 * NOTE: server/_core/index.ts has its own independent copy of this same
 * logic (used for auto-migrate-on-boot in production — this script is not
 * part of the actual Railway deploy path, only a manual/local tool). That
 * copy already had the fix below; this one didn't, which is how this bug
 * went unnoticed — production never ran the buggy version. If you change
 * statement-parsing behavior here, change it there too (or better, extract
 * a shared module next time you're touching either).
 *
 * BUG THIS REPLACES: naively splitting on `;` first and then filtering out
 * chunks that *start with* `--` silently discards a whole statement
 * whenever the breakpoint marker ends up glued to the front of the next
 * CREATE/ALTER statement (which is the common case) — every statement
 * after the first in a multi-table migration file gets dropped with zero
 * error. Splitting on the real breakpoint marker first, then stripping
 * comment *lines* (not comment-prefixed chunks) within each piece, fixes
 * both formats.
 */
function extractStatements(sql) {
  const chunks = sql.includes("statement-breakpoint")
    ? sql.split(/--> statement-breakpoint/g)
    : [sql];

  const statements = [];
  for (const chunk of chunks) {
    const withoutComments = chunk
      .split("\n")
      .filter(line => !line.trim().startsWith("--"))
      .join("\n");
    for (const stmt of withoutComments.split(";")) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) statements.push(trimmed);
    }
  }
  return statements;
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not set — skipping migrations, server will start without DB.");
    return; // Don't block server startup — Railway will show DB errors at query time
  }

  console.log("🔄 Running database migrations...");

  // Use Promise.race so a bad DB connection fails in 15s instead of hanging
  const conn = await Promise.race([
    createConnection(databaseUrl),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB connection timed out after 15s")), 15000)
    ),
  ]);

  try {
    // Create migrations tracking table if it doesn't exist
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hash VARCHAR(255) NOT NULL UNIQUE,
        created_at BIGINT
      )
    `);

    // Find all migration SQL files
    const migrationsDir = join(__dirname, "../drizzle");
    const files = (await readdir(migrationsDir))
      .filter(f => f.endsWith(".sql"))
      .sort();

    let applied = 0;
    for (const file of files) {
      const hash = file.replace(".sql", "");

      // Check if already applied
      const [rows] = await conn.execute(
        "SELECT id FROM __drizzle_migrations WHERE hash = ?",
        [hash]
      );
      if (rows.length > 0) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }

      // Apply the migration
      const sql = await readFile(join(migrationsDir, file), "utf-8");
      const statements = extractStatements(sql);

      for (const statement of statements) {
        await conn.execute(statement);
      }

      await conn.execute(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        [hash, Date.now()]
      );

      console.log(`  ✅ Applied: ${file}`);
      applied++;
    }

    if (applied === 0) {
      console.log("✅ All migrations already up to date.");
    } else {
      console.log(`✅ Applied ${applied} migration(s) successfully.`);
    }
  } finally {
    await conn.end();
  }
}

runMigrations().catch(err => {
  console.error("❌ Migration failed:", err.message);
  console.error("⚠️  Server will still start — check DATABASE_URL and DB connectivity.");
  // Do NOT exit(1) here — let the server start so /api/health responds
  // and Railway doesn't loop-crash. DB errors will surface at query time.
});
