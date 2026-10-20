import { db } from "./db.js";

// Failed sign-ins are counted per (email, connection) and stored in the database,
// so a password reset or the owner can clear a lockout straight away, even without restarting the app.
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
const WINDOW_MS = LOCK_MINUTES * 60_000;

const keyFor = (email, ip) => `${String(email).toLowerCase()}|${ip}`;

export function isLocked(email, ip) {
  const row = db.prepare("SELECT locked_until FROM login_attempts WHERE key = ?").get(keyFor(email, ip));
  return Boolean(row && row.locked_until > Date.now());
}

/** Records a wrong password and returns how many in the current window. */
export function noteFailure(email, ip) {
  const now = Date.now();
  const key = keyFor(email, ip);
  return db.transaction(() => {
    const row = db.prepare("SELECT * FROM login_attempts WHERE key = ?").get(key);
    const fresh = !row || now - row.first_at > WINDOW_MS;
    const count = fresh ? 1 : row.count + 1;
    const lockedUntil = count >= MAX_FAILED_LOGINS ? now + WINDOW_MS : 0;
    db.prepare(`INSERT INTO login_attempts (key, email, count, first_at, locked_until) VALUES (?,?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET count = excluded.count, first_at = excluded.first_at, locked_until = excluded.locked_until`)
      .run(key, String(email).toLowerCase(), count, fresh ? now : row.first_at, lockedUntil);
    if (Math.random() < 0.02) db.prepare("DELETE FROM login_attempts WHERE first_at < ? AND locked_until < ?").run(now - WINDOW_MS, now);
    return count;
  })();
}

export function clearFailures(email, ip) {
  db.prepare("DELETE FROM login_attempts WHERE key = ?").run(keyFor(email, ip));
}

/** Removes every lockout for an account (used by password resets and by the owner). */
export function clearAllFailures(email) {
  db.prepare("DELETE FROM login_attempts WHERE email = ?").run(String(email).toLowerCase());
}

export function isLockedAnywhere(email) {
  return Boolean(db.prepare("SELECT 1 FROM login_attempts WHERE email = ? AND locked_until > ?").get(String(email).toLowerCase(), Date.now()));
}
