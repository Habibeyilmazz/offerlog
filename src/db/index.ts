import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema.ts";

export type Db = BetterSQLite3Database<typeof schema>;

export function openDb(file: string): Db {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

let instance: Db | undefined;

/** The app's database, opened (and migrated) on first use. */
export function db(): Db {
  instance ??= openDb(process.env.OFFERLOG_DB ?? path.join(process.cwd(), "data", "offerlog.db"));
  return instance;
}
