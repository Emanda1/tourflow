import crypto from "node:crypto";
import { db } from "./db.js";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const RESET_MINUTES = 30;

/** Creates a one-time reset token for a user. Only the hash is stored. */
export function createResetToken(userId, ip) {
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL").run(Date.now(), userId); // older links stop working
  db.prepare("INSERT INTO password_resets (user_id, token_hash, expires_at, ip) VALUES (?,?,?,?)")
    .run(userId, sha256(token), Date.now() + RESET_MINUTES * 60_000, ip);
  return token;
}

/** Returns the user for a valid, unused, unexpired token, or null. */
export function findResetUser(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  const row = db.prepare(`SELECT r.id AS reset_id, r.expires_at, r.used_at, u.* FROM password_resets r JOIN users u ON u.id = r.user_id
    WHERE r.token_hash = ?`).get(sha256(token));
  if (!row || row.used_at || row.expires_at < Date.now() || !row.active) return null;
  return row;
}

export function markResetUsed(resetId) {
  db.prepare("UPDATE password_resets SET used_at = ? WHERE id = ?").run(Date.now(), resetId);
}
