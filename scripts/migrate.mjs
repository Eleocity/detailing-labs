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
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  console.log("🔄 Running database migrations...");

  const conn = await createConnection(databaseUrl);

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
      if ((rows as any[]).length > 0) {
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
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
