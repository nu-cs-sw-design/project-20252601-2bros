import fs from 'fs';
import path from 'path';
// @ts-ignore sql.js ships its own types but ts-node needs an explicit ignore in this setup
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

export interface SqlJsContext {
  db: Database;
  persist: () => void;
}

let sqlJsSingleton: Promise<SqlJsStatic> | null = null;

async function getSqlJs() {
  if (!sqlJsSingleton) {
    sqlJsSingleton = initSqlJs();
  }
  return sqlJsSingleton;
}

export async function createSqlJsDatabase(dbFilePath: string): Promise<SqlJsContext> {
  const SQL = await getSqlJs();
  const fileExists = fs.existsSync(dbFilePath);
  const data = fileExists ? fs.readFileSync(dbFilePath) : undefined;
  const db = new SQL.Database(data);
  const persist = () => {
    const bytes = db.export();
    fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
    fs.writeFileSync(dbFilePath, Buffer.from(bytes));
  };
  return { db, persist };
}

function normalizeParams(params: unknown[]): unknown[] {
  return params.map(p => (p === undefined ? null : p));
}

export function queryAll<T>(db: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(normalizeParams(params));
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryGet<T>(db: Database, sql: string, params: unknown[] = []): T | null {
  const stmt = db.prepare(sql);
  stmt.bind(normalizeParams(params));
  const result = stmt.step() ? (stmt.getAsObject() as T) : null;
  stmt.free();
  return result;
}

export function run(db: Database, sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(normalizeParams(params));
  stmt.step();
  stmt.free();
}
