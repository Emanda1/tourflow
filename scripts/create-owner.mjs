// Creates an owner account, or resets an existing account's password and makes it an owner.
// Use it when the owner is locked out or has forgotten their password and email isn't set up.
//
//   npm run create-owner -- "Full Name" email@company.com
//
// You'll be asked for the new password twice. Use PowerShell, Command Prompt or VS Code's terminal
// (in Git Bash on Windows the password may be visible while you type).
import readline from "node:readline";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { hashPassword, passwordProblem } from "../lib/password.js";

const [name, rawEmail] = process.argv.slice(2);
const email = String(rawEmail || "").trim().toLowerCase();
if (!name || !/^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/.test(email)) {
  console.log('Usage: npm run create-owner -- "Full Name" email@company.com');
  process.exit(1);
}
const dbPath = process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "tourflow.db");
if (!fs.existsSync(dbPath)) {
  console.error(`No database found at ${dbPath}. Start the app once first (npm run dev), then try again.`);
  process.exit(1);
}

// Read answers line by line; while a password is being typed, nothing is echoed to the screen.
const tty = Boolean(process.stdin.isTTY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
let muted = false;
rl._writeToOutput = (s) => { if (!muted) rl.output.write(s); };
const queued = [], waiting = [];
rl.on("line", (line) => (waiting.length ? waiting.shift()(line) : queued.push(line)));
const ask = (q) => {
  process.stdout.write(q);
  muted = true;
  return new Promise((res) => {
    const done = (a) => { muted = false; process.stdout.write("\n"); res(a); };
    queued.length ? done(queued.shift()) : waiting.push(done);
  });
};

const pw = await ask("New password (typing stays hidden): ");
const again = await ask("Type it again: ");
rl.close();
const problem = passwordProblem(pw, { name, email });
if (problem) { console.error(problem); process.exit(1); }
if (pw !== again) { console.error("The two passwords don't match. Nothing was changed."); process.exit(1); }

const db = new Database(dbPath);
db.pragma("busy_timeout = 5000"); // wait if the running app is writing at the same moment
const hash = await hashPassword(pw);
const has = (table) => db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
if (!has("users")) { console.error("This database is from an old version. Start the app once (npm run dev) to upgrade it, then try again."); process.exit(1); }

db.transaction(() => {
  db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'owner')
    ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash, role = 'owner',
      active = 1, failed_logins = 0, locked_until = NULL, must_change_password = 0`).run(name, email, hash);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id); // sign out any old sessions
  if (has("login_attempts")) db.prepare("DELETE FROM login_attempts WHERE email = ?").run(email); // clear lockouts
  if (has("password_resets")) db.prepare("UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL").run(Date.now(), user.id);
  db.prepare("INSERT INTO audit_log (user_name, action, details, ip) VALUES ('command line', 'setup.owner', ?, 'server')").run(email);
})();
console.log(`\nDone. ${email} is an owner and can sign in with the new password straight away.`);
