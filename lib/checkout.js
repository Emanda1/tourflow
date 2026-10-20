import { db, getBookingByRef, getBooking } from "./db.js";
import { amountDueNow, recordPayment } from "./bookings.js";
import { initializeTransaction, verifyTransaction } from "./paystack.js";
import { appUrl, paystackEnabled } from "./config.js";

/** Creates a pending payment and returns the URL the customer should be sent to. */
export async function startCheckout(ref, requestedAmount) {
  const booking = getBookingByRef(ref);
  if (!booking || booking.status === "cancelled" || booking.balance <= 0) return `/booking/${ref}`;

  let amount = amountDueNow(booking);
  if (requestedAmount) amount = Math.min(booking.balance, Math.max(100, Math.round(requestedAmount)));

  const reference = `${ref}-${Date.now().toString(36).toUpperCase()}`;
  db.prepare("INSERT INTO payments (booking_id, amount, method, reference, status) VALUES (?,?,?,?, 'pending')")
    .run(booking.id, amount, paystackEnabled ? "paystack" : "demo", reference);

  if (!paystackEnabled) return `/pay/demo/${reference}`;

  const data = await initializeTransaction({
    email: booking.customer_email || `${booking.customer_phone.replace(/\D/g, "")}@customers.local`,
    amount,
    reference,
    callbackUrl: `${appUrl}/api/pay/callback`,
    metadata: { booking_ref: ref, customer: booking.customer_name },
  });
  return data.authorization_url;
}

/** Confirms a payment by reference with Paystack (or directly in demo mode). */
export async function completePayment(reference, { demo = false } = {}) {
  const pending = db.prepare("SELECT * FROM payments WHERE reference = ?").get(reference);
  if (!pending) return null;
  const booking = getBooking(pending.booking_id);

  if (demo) {
    if (paystackEnabled) throw new Error("Demo payments are disabled when Paystack is configured.");
    return { ok: true, booking: await recordPayment({ bookingId: pending.booking_id, amount: pending.amount, method: "demo", reference, note: "Demo payment" }) };
  }

  const tx = await verifyTransaction(reference);
  if (tx.status !== "success") {
    db.prepare("UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'pending'").run(pending.id);
    return { ok: false, booking };
  }
  const method = tx.channel === "mobile_money" ? "momo" : tx.channel === "card" ? "card" : tx.channel;
  return { ok: true, booking: await recordPayment({ bookingId: pending.booking_id, amount: tx.amount, method, reference }) };
}
