import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "tf_admin";

function token() {
  const secret = process.env.SESSION_SECRET || "dev-secret";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  return crypto.createHmac("sha256", secret).update("admin:" + password).digest("hex");
}

export function checkPassword(input) {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || "admin123");
  const given = Buffer.from(String(input || ""));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export async function signIn() {
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  return (await cookies()).get(COOKIE)?.value === token();
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
