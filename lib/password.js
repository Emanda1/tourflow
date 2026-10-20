import crypto from "node:crypto";
import { promisify } from "node:util";

// scrypt with a per-password random salt. Format: scrypt$N$r$p$salt$hash
// The async version is used so hashing never blocks other visitors' requests.
const scrypt = promisify(crypto.scrypt);
const N = 16384, R = 8, P = 1, KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(String(password), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [algo, n, r, p, saltB64, hashB64] = String(stored).split("$");
    if (algo !== "scrypt") return false;
    const expected = Buffer.from(hashB64, "base64");
    if (expected.length !== KEYLEN || Number(n) > 1 << 20) return false;
    const actual = await scrypt(String(password), Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Returns an error message, or null if the password is acceptable. */
export function passwordProblem(password, { name = "", email = "" } = {}) {
  const pw = String(password || "");
  if (pw.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (pw.length > 200) return "That password is too long.";
  const lower = pw.toLowerCase();
  const common = ["password", "12345678", "qwerty", "admin123", "letmein", "welcome", "tourflow"];
  if (common.some((c) => lower.includes(c))) return "That password is too easy to guess.";
  const emailName = email ? email.split("@")[0].toLowerCase() : "";
  const firstName = name ? name.toLowerCase().trim().split(/\s+/)[0] : "";
  if (emailName.length >= 3 && lower.includes(emailName)) return "Don't use your email name in the password.";
  if (firstName.length >= 3 && lower.includes(firstName)) return "Don't use your name in the password.";
  if (/^(.)\1+$/.test(pw)) return "That password is too easy to guess.";
  return null;
}
