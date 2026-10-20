import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db, getBooking } from "./db.js";
import { amountDueNow, minimumPayment, recordPayment } from "./bookings.js";
import { initializeTransaction, verifyTransaction } from "./paystack.js";
import { appUrl, paystackEnabled, demoPaymentsAllowed } from "./config.js";

export class CheckoutError extends Error {}

export const bookingPath = (b, extra = "") => `/booking/${b.ref}?k=${b.access_token}${extra}`;

// The customer's browser remembers which booking it is paying for, so when Paystack sends them back
// we can show their booking without putting its secret link in the payment reference.
const PAY_COOKIE = "tf_paying";
export async function rememberPayingBooking(b) {
  (await cookies()).set(PAY_COOKIE, `${b.ref}.${b.access_token}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/pay", maxAge: 2 * 3600,
  });
}
export async function payingBookingToken(ref) {
  const [r, t] = String((await cookies()).get(PAY_COOKIE)?.value || "").split(".");
  return r === ref ? t : null;
}

/**
 * Creates a pending payment for a booking the caller is already allowed to see,
 * and returns the URL the customer should be sent to.
 */
export async function startCheckout(booking, requestedAmount) {
  if (!booking || booking.status === "cancelled" || booking.balance <= 0) return bookingPath(booking);
  if (!paystackEnabled && !demoPaymentsAllowed) throw new CheckoutError("Online payment is not available yet.");

  let amount = amountDueNow(booking);
  if (requestedAmount) amount = Math.min(booking.balance, Math.max(minimumPayment(booking), Math.round(requestedAmount)));
  if (amount <= 0) return bookingPath(booking);

  const reference = `${booking.ref}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  db.prepare("INSERT INTO payments (booking_id, amount, method, reference, status) VALUES (?,?,?,?, 'pending')")
    .run(booking.id, amount, paystackEnabled ? "paystack" : "demo", reference);

  if (!paystackEnabled) return `/pay/demo/${reference}`;

  try {
    const data = await initializeTransaction({
      email: booking.customer_email || `${booking.customer_phone.replace(/\D/g, "")}@customers.invalid`,
      amount,
      reference,
      callbackUrl: `${appUrl}/api/pay/callback`,
      metadata: { booking_ref: booking.ref },
    });
    if (!/^https:\/\/([a-z0-9-]+\.)*paystack\.(com|co)\//.test(data.authorization_url)) throw new CheckoutError("Unexpected payment page address.");
    return data.authorization_url;
  } catch (e) {
    db.prepare("UPDATE payments SET status = 'failed' WHERE reference = ? AND status = 'pending'").run(reference);
    throw e;
  }
}

/** Confirms a payment by reference with Paystack (or directly in demo mode). */
export async function completePayment(reference, { demo = false } = {}) {
  if (typeof reference !== "string" || reference.length > 80) return null;
  const pending = db.prepare("SELECT * FROM payments WHERE reference = ?").get(reference);
  if (!pending) return null;
  const booking = getBooking(pending.booking_id);
  if (pending.status === "success") return { ok: true, booking };

  if (demo) {
    if (!demoPaymentsAllowed || pending.method !== "demo") throw new CheckoutError("Demo payments are turned off.");
    return { ok: true, booking: await recordPayment({ bookingId: pending.booking_id, amount: pending.amount, method: "demo", reference, note: "Demo payment (no real money)" }) };
  }

  // Never trust the browser: ask Paystack what really happened.
  const tx = await verifyTransaction(reference);
  if (tx.status !== "success" || tx.currency !== "GHS" || tx.reference !== reference) {
    // Mobile money can still be waiting for the customer to approve on their phone: keep it pending
    // (the webhook will confirm it), and only mark clearly failed payments as failed.
    if (["failed", "abandoned", "reversed"].includes(tx.status) || tx.currency !== "GHS" || tx.reference !== reference) {
      db.prepare("UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'pending'").run(pending.id);
      return { ok: false, booking };
    }
    return { ok: false, processing: true, booking };
  }
  const method = { mobile_money: "momo", card: "card", bank: "bank", bank_transfer: "bank", ussd: "momo", qr: "momo" }[tx.channel] || "paystack";
  const note = tx.amount !== pending.amount ? `Amount differs from requested (${pending.amount})` : null;
  return { ok: true, booking: await recordPayment({ bookingId: pending.booking_id, amount: tx.amount, method, reference, note }) };
}
