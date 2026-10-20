// Deletes the local database so it's recreated (with sample data) the next time the app starts.
// For your own computer only: it refuses to run in production.
import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to delete the database in production.");
  process.exit(1);
}
const dbPath = process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "tourflow.db");
const dir = path.dirname(dbPath);
const base = path.basename(dbPath);
console.log("Make sure the app is stopped first (Ctrl+C in the terminal running it).");
try {
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (f.startsWith(base)) fs.rmSync(path.join(dir, f));
} catch (e) {
  if (["EBUSY", "EPERM"].includes(e.code)) {
    console.error("The database is in use. Stop the app first (press Ctrl+C in the terminal running it), then try again.");
    process.exit(1);
  }
  throw e;
}
console.log("Database removed. It will be recreated with sample data the next time you run npm run dev.");
