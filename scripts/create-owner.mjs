// Creates (or resets) an owner account from the command line.
// Usage: npm run create-owner -- "Full Name" email@company.com
// You will be asked for the password (it is not shown or saved in your shell history).
import readline from "node:readline";
import path from "node:path";
import Database from "better-sqlite3";
import { hashPassword, passwordProblem } from "../lib/password.js";

const [name, email] = process.argv.slice(2);
if (!name || !email) {
  console.log('Usage: npm run create-owner -- "Full Name" email@company.com');
  process.exit(1);
}
const dbPath = process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "tourflow.db");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (s) => { if (!rl.muted) rl.output.write(s); };
const ask = (q) => new Promise((res) => { rl.question(q, (a) => { rl.muted = false; rl.output.write("\n"); res(a); }); rl.muted = true; });

const pw = await ask("Password: ");
const again = await ask("Confirm password: ");
rl.close();
const problem = passwordProblem(pw, { name, email });
if (problem) { console.error(problem); process.exit(1); }
if (pw !== again) { console.error("Passwords don't match."); process.exit(1); }

const db = new Database(dbPath);
const exists = db.prepare("SELECT name FROM sqlite_master WHERE name = 'users'").get();
if (!exists) { console.error("Start the app once first so the database is created."); process.exit(1); }
db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'owner')
  ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'owner', active = 1, failed_logins = 0, locked_until = NULL`)
  .run(name, email.toLowerCase(), hashPassword(pw));
db.prepare("INSERT INTO audit_log (user_name, action, details, ip) VALUES ('command line', 'setup.owner', ?, 'server')").run(email);
console.log(`Owner account ready for ${email}.`);
