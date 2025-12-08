import { rmSync, existsSync } from "fs";
import path from "path";
import { readdirSync, readFileSync } from "fs";
import { createSqlJsDatabase } from "../src/datasource/sqljs";

const migrationsDir = path.join(__dirname, "..", "db", "migrations");
const dbPath = path.join(__dirname, "..", "data", "app.db");

async function reset() {
  // Remove the database file if it exists to start fresh
  if (existsSync(dbPath)) {
    rmSync(dbPath);
    console.log(`Deleted existing database at ${dbPath}`);
  } else {
    console.log(`No existing database file found at ${dbPath}`);
  }

  // Recreate DB schema from migrations (empty tables, no seed data)
  const { db, persist } = await createSqlJsDatabase(dbPath);
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf-8");
    db.exec(sql);
  }
  persist();
  console.log(
    `Database reset and schema created at ${dbPath} (no seeded/demo data).`
  );
}

reset().catch((err) => {
  console.error("Error resetting db:", err);
  process.exit(1);
});
