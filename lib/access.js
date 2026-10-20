import crypto from "node:crypto";
import { getBookingByRef } from "./db.js";

/** Returns the booking only if the secret link token matches. */
export function getBookingForCustomer(ref, token) {
  if (typeof ref !== "string" || typeof token !== "string" || ref.length > 20 || token.length > 64) return null;
  const b = getBookingByRef(ref.toUpperCase());
  if (!b || !b.access_token) return null;
  const a = Buffer.from(b.access_token), t = Buffer.from(token);
  return a.length === t.length && crypto.timingSafeEqual(a, t) ? b : null;
}
