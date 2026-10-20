import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to delete the database in production.");
  process.exit(1);
}
const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (f.startsWith("tourflow.db")) fs.rmSync(path.join(dir, f));
console.log("Database removed. It will be recreated with sample data the next time the app starts.");
