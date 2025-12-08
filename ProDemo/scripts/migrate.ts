import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { createSqlJsDatabase } from '../src/datasource/sqljs';

const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
const dbPath = path.join(__dirname, '..', 'data', 'app.db');

async function runMigrations() {
  const { db, persist } = await createSqlJsDatabase(dbPath);
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
  }
  persist();
  console.log(`Migrations applied to ${dbPath}`);
}

runMigrations().catch(err => {
  console.error(err);
  process.exit(1);
});
