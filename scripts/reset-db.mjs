import fs from "node:fs";
import path from "node:path";
const dir = path.join(process.cwd(), "data");
for (const f of fs.readdirSync(dir)) if (f.startsWith("tourflow.db")) fs.rmSync(path.join(dir, f));
console.log("Database removed. It will be recreated with sample data the next time the app starts.");
