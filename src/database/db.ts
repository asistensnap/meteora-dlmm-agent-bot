import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

export function openDb(): Database.Database {
  const dbPath = path.resolve(config.database.path);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

export function initDb(): void {
  const db = openDb();
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const sourceSchemaPath = path.resolve("src", "database", "schema.sql");
  const schema = fs.existsSync(schemaPath)
    ? fs.readFileSync(schemaPath, "utf8")
    : fs.readFileSync(sourceSchemaPath, "utf8");
  db.exec(schema);
  db.close();
}

if (process.argv.includes("--init")) {
  initDb();
  console.log("SQLite database initialized.");
}
