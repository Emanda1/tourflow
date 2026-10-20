import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "./db.js";
import { can } from "./permissions.js";
import { clientIp, userAgent } from "./request.js";
import { envInt } from "./envnum.js";

const SESSION_HOURS = envInt("SESSION_HOURS", 12, { min: 1, max: 24 * 30 });
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-tf_session" : "tf_session";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 3600_000);
  db.prepare("INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES (?,?,?,?,?)")
    .run(sha256(token), userId, expires.toISOString(), await clientIp(), await userAgent());
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
  jar.delete(COOKIE);
}

export function destroyAllSessions(userId) {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

/** The signed-in staff member for this request, or null. */
export const currentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const row = db.prepare(`SELECT u.id, u.name, u.email, u.role, u.active, u.must_change_password, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`).get(sha256(token));
  if (!row || !row.active || row.expires_at < new Date().toISOString()) return null;
  return row;
});

/** Use at the top of every admin page and server action. */
export async function requireUser(permission) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (permission && user.must_change_password) redirect("/admin/account?first=1");
  if (permission && !can(user, permission)) notFound();
  return user;
}

export function userCount() {
  return db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
}
