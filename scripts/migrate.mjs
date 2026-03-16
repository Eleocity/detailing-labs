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

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not set — skipping migrations, server will start without DB.");
    return; // Don't block server startup — Railway will show DB errors at query time
  }

  console.log("🔄 Running database migrations...");

  // connectTimeout ensures we fail fast (15s) instead of hanging indefinitely
  const conn = await createConnection({
    uri: databaseUrl,
    connectTimeout: 15000,
  });

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
      const statements = sql
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

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
