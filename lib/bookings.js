import { db, getBooking, getDeparture, generateRef, refreshBookingStatus, newToken } from "./db.js";
import { sendSms } from "./notify.js";
import { sendBookingEmail } from "./mailer.js";
import { money, date, normalisePhone } from "./format.js";
import { company, appUrl } from "./config.js";
import { isEmail, isPhone } from "./validate.js";

export class BookingError extends Error {}

export const MAX_TRAVELLERS = 30;

export function bookingLink(b) {
  return `${appUrl}/booking/${b.ref}?k=${b.access_token}`;
}

/** Creates a booking, holding seats on the departure. Returns the booking. */
export function createBooking({ departureId, name, email, phone, travellers, plan = "full", source = "website", notes = "" }) {
  name = String(name || "").trim().slice(0, 120);
  email = String(email || "").trim().slice(0, 160);
  notes = String(notes || "").trim().slice(0, 1000);
  const list = (travellers || [])
    .map((t) => ({ name: String(t.name || "").trim().slice(0, 120), phone: String(t.phone || "").trim().slice(0, 30) }))
    .filter((t) => t.name);

  if (!name) throw new BookingError("Please enter your name.");
  if (!isPhone(phone)) throw new BookingError("Please enter a valid phone number.");
  if (source === "website" && !isEmail(email)) throw new BookingError("Please enter a valid email address.");
  if (email && !isEmail(email)) throw new BookingError("That email address doesn't look right.");
  if (list.length < 1) throw new BookingError("Add at least one traveller.");
  if (list.length > MAX_TRAVELLERS) throw new BookingError(`For groups over ${MAX_TRAVELLERS}, please contact us directly.`);
  if (!["full", "deposit"].includes(plan)) plan = "full";

  const cleanPhone = normalisePhone(phone);
  const tx = db.transaction(() => {
    // Seat check happens inside the transaction so two people can't take the last seat.
    const dep = getDeparture(departureId);
    if (!dep) throw new BookingError("That departure no longer exists.");
    if (dep.status !== "open") throw new BookingError("This departure is not taking bookings.");
    if (dep.start_date < new Date().toISOString().slice(0, 10)) throw new BookingError("This trip has already left.");
    const seatsLeft = dep.capacity - dep.booked;
    if (list.length > seatsLeft) throw new BookingError(seatsLeft > 0 ? `Only ${seatsLeft} seat(s) left on this date.` : "Sorry, this date is now full.");

    let customer = db.prepare("SELECT * FROM customers WHERE phone = ?").get(cleanPhone);
    if (customer) {
      // Website visitors can't overwrite an existing customer's details; staff can.
      if (source === "website") db.prepare("UPDATE customers SET email = COALESCE(NULLIF(email, ''), ?) WHERE id = ?").run(email, customer.id);
      else db.prepare("UPDATE customers SET name = ?, email = COALESCE(NULLIF(?, ''), email) WHERE id = ?").run(name, email, customer.id);
    } else {
      customer = { id: db.prepare("INSERT INTO customers (name,email,phone) VALUES (?,?,?)").run(name, email, cleanPhone).lastInsertRowid };
    }
    const total = dep.price * list.length;
    const id = db.prepare(`INSERT INTO bookings (ref,departure_id,customer_id,travellers,unit_price,total,status,payment_plan,source,notes,access_token)
      VALUES (?,?,?,?,?,?, 'pending', ?, ?, ?, ?)`).run(generateRef(), dep.id, customer.id, list.length, dep.price, total, plan, source, notes, newToken()).lastInsertRowid;
    const ins = db.prepare("INSERT INTO travellers (booking_id,name,phone) VALUES (?,?,?)");
    list.forEach((t) => ins.run(id, t.name, t.phone && isPhone(t.phone) ? normalisePhone(t.phone) : null));
    return id;
  });
  return getBooking(tx.immediate());
}

/** Amount the customer should pay now. */
export function amountDueNow(booking) {
  if (booking.paid <= 0 && booking.payment_plan === "deposit") return Math.min(booking.depositDue, booking.balance);
  return booking.balance;
}

/** Records a successful payment and sends confirmations. Safe to call twice with the same reference. */
export async function recordPayment({ bookingId, amount, method, reference = null, note = null, recordedBy = null }) {
  amount = Math.round(Number(amount));
  if (!Number.isFinite(amount) || amount <= 0) throw new BookingError("Payment amount must be more than zero.");

  const applied = db.transaction(() => {
    if (reference) {
      const existing = db.prepare("SELECT * FROM payments WHERE reference = ?").get(reference);
      if (existing?.status === "success") return false;
      if (existing) {
        db.prepare("UPDATE payments SET status = 'success', amount = ?, method = ?, note = COALESCE(?, note) WHERE id = ?").run(amount, method, note, existing.id);
        return true;
      }
    }
    db.prepare("INSERT INTO payments (booking_id,amount,method,reference,status,note,kind,recorded_by) VALUES (?,?,?,?, 'success', ?, 'payment', ?)")
      .run(bookingId, amount, method, reference, note, recordedBy);
    return true;
  }).immediate();
  if (!applied) return getBooking(bookingId);

  const b = refreshBookingStatus(bookingId);
  const fresh = getBooking(bookingId);
  const first = fresh.customer_name.split(" ")[0];
  const message = b?.justConfirmed
    ? `Hi ${first}, your ${fresh.tour_title} trip on ${date(fresh.start_date)} is CONFIRMED. Ref ${fresh.ref}. Paid ${money(fresh.paid)}, balance ${money(fresh.balance)}. Details: ${bookingLink(fresh)} - ${company.name}`
    : `Payment of ${money(amount)} received for booking ${fresh.ref}. Balance: ${money(fresh.balance)}. Thank you! - ${company.name}`;
  await sendSms({ to: fresh.customer_phone, bookingId, message });
  await sendBookingEmail(fresh, { amount, confirmed: Boolean(b?.justConfirmed) });
  return fresh;
}

/** Records money given back to a customer. Cannot refund more than was paid. */
export async function recordRefund({ bookingId, amount, method, note, recordedBy }) {
  amount = Math.round(Number(amount));
  const b = getBooking(bookingId);
  if (!b) throw new BookingError("Booking not found.");
  if (!Number.isFinite(amount) || amount <= 0) throw new BookingError("Refund amount must be more than zero.");
  if (amount > b.paid) throw new BookingError(`You can refund at most ${money(b.paid)}.`);
  if (!note) throw new BookingError("Please give a reason for the refund.");
  db.prepare("INSERT INTO payments (booking_id,amount,method,status,note,kind,recorded_by) VALUES (?,?,?, 'success', ?, 'refund', ?)")
    .run(bookingId, amount, method, note, recordedBy);
  await sendSms({ to: b.customer_phone, bookingId, message: `A refund of ${money(amount)} for booking ${b.ref} has been processed. - ${company.name}` });
  return getBooking(bookingId);
}
