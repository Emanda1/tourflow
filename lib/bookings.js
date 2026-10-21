import { db, getBooking, getDeparture, generateRef, refreshBookingStatus, newToken } from "./db.js";
import { sendSms, canSendPublicSms } from "./notify.js";
import { sendBookingEmail, sendEmail, escapeHtml } from "./mailer.js";
import { money, date, normalisePhone } from "./format.js";
import { company, appUrl } from "./config.js";
import { isEmail, isPhone } from "./validate.js";
import { tourOptions, mainLabel, priceBooking } from "./pricing.js";

export class BookingError extends Error {}

export const MAX_TRAVELLERS = 30;

export function bookingLink(b) {
  return `${appUrl}/booking/${b.ref}?k=${b.access_token}`;
}

/** Creates a booking, holding seats on the departure. Returns the booking. */
export function createBooking({ departureId, name, email, phone, travellers, extras = [], plan = "full", source = "website", notes = "" }) {
  const clean = (v, max) => String(v || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  name = clean(name, 120);
  email = String(email || "").trim().slice(0, 160);
  notes = String(notes || "").trim().slice(0, 1000);
  const list = (travellers || [])
    .map((t) => ({ name: clean(t.name, 120), phone: clean(t.phone, 30), type: t.type }))
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

    if (source === "website") {
      // Stop one person from holding lots of seats without paying.
      const unpaid = db.prepare(`SELECT COUNT(*) AS n FROM bookings b JOIN customers c ON c.id = b.customer_id
        WHERE b.status = 'pending' AND b.source = 'website' AND (c.phone = ? OR lower(b.contact_email) = lower(?))
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.id AND p.status = 'success')`).get(cleanPhone, email).n;
      if (unpaid >= 2) throw new BookingError("You already have bookings waiting for payment. Please pay for those first, or call us.");
      const held = db.prepare(`SELECT COALESCE(SUM(b.travellers), 0) AS n FROM bookings b
        WHERE b.departure_id = ? AND b.status = 'pending' AND b.source = 'website'
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.id AND p.status = 'success')`).get(dep.id).n;
      // Only limits holds by OTHER unpaid bookings, so a big group can still book an empty trip.
      if (held > 0 && held + list.length > Math.max(6, Math.ceil(dep.capacity / 2))) {
        throw new BookingError("Many seats on this date are being held by people still paying. Please try again in 30 minutes, or call us to book.");
      }
    }

    let customer = db.prepare("SELECT * FROM customers WHERE phone = ?").get(cleanPhone);
    if (customer) {
      // Only staff can change a saved customer's details. Website bookings keep their own contact details on the booking.
      if (source !== "website") db.prepare("UPDATE customers SET name = ?, email = COALESCE(NULLIF(?, ''), email) WHERE id = ?").run(name, email, customer.id);
    } else {
      customer = { id: db.prepare("INSERT INTO customers (name,email,phone) VALUES (?,?,?)").run(name, email, cleanPhone).lastInsertRowid };
    }
    // Each traveller's price depends on their type (adult, child…); extras are added on top.
    const options = tourOptions(dep.tour_id);
    const tourRow = db.prepare("SELECT price_label FROM tours WHERE id = ?").get(dep.tour_id);
    let priced;
    try {
      priced = priceBooking({ basePrice: dep.price, baseLabel: mainLabel(tourRow, options), options, travellers: list, extras });
    } catch (e) {
      throw new BookingError(e.message);
    }
    const total = priced.total;
    if (total <= 0) throw new BookingError("This booking has nothing to pay. Please add at least one paying traveller.");
    if (dep.deposit_percent <= 0 || dep.deposit_percent >= 100) plan = "full"; // no separate deposit step
    const id = db.prepare(`INSERT INTO bookings (ref,departure_id,customer_id,travellers,unit_price,total,status,payment_plan,source,notes,access_token,contact_name,contact_email,deposit_percent)
      VALUES (?,?,?,?,?,?, 'pending', ?, ?, ?, ?, ?, ?, ?)`).run(generateRef(), dep.id, customer.id, list.length, dep.price, total, plan, source, notes, newToken(), name, email || null, dep.deposit_percent).lastInsertRowid;
    const ins = db.prepare("INSERT INTO travellers (booking_id,name,phone,price_type,price) VALUES (?,?,?,?,?)");
    priced.travellers.forEach((t) => ins.run(id, t.name, t.phone && isPhone(t.phone) ? normalisePhone(t.phone) : null, t.price_type, t.price));
    const insExtra = db.prepare("INSERT INTO booking_extras (booking_id,label,unit_price,quantity) VALUES (?,?,?,?)");
    priced.extras.forEach((x) => insExtra.run(id, x.label, x.unit_price, x.quantity));
    return id;
  });
  return getBooking(tx.immediate());
}

/**
 * Sends SMS/email in the background so customers and staff never wait on a slow SMS or email service.
 * Failures are recorded in Admin → Messages (SMS) and the server log (email).
 */
function notifyLater(fn) {
  Promise.resolve().then(fn).catch((e) => console.error("[notify]", e.message));
}

/** Tells a website customer their booking reference and private link right after booking. */
export async function sendBookingReceived(b) {
  const link = bookingLink(b);
  notifyLater(() => sendEmail({
    to: b.customer_email,
    subject: `Booking ${b.ref} received: ${b.tour_title}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2 style="color:#0f766e">${escapeHtml(company.name)}</h2>
      <p>Thank you! Your booking <strong>${escapeHtml(b.ref)}</strong> for ${escapeHtml(b.tour_title)} (${escapeHtml(date(b.start_date))}) has been received.</p>
      <p>Your seats are held while you pay. You can view your booking or pay at any time here:</p>
      <p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p></div>`,
  }));
  // SMS with fixed wording, only to Ghana mobiles and at most once per number per day (see canSendPublicSms).
  if (canSendPublicSms(b.customer_phone)) {
    notifyLater(() => sendSms({ to: b.customer_phone, message: `Booking ${b.ref} received. Pay or view it here: ${link} - ${company.name}` }));
  }
}

/** Amount the customer should pay now. */
export function amountDueNow(booking) {
  if (booking.payment_plan === "deposit" && booking.depositDue > 0 && booking.paid < booking.depositDue) {
    return Math.min(booking.depositDue - booking.paid, booking.balance);
  }
  return booking.balance;
}

/** Smallest online payment allowed: until a booking is confirmed, at least the rest of the deposit. */
export function minimumPayment(booking) {
  if (booking.status !== "confirmed" && booking.paid < booking.depositDue) return Math.min(booking.depositDue - booking.paid, booking.balance);
  return Math.min(100, booking.balance); // GH₵ 1, or the balance if smaller
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

  // Money arrived for a cancelled booking. Only bookings the system cancelled itself (payment came in
  // just after the hold ran out) are brought back; staff cancellations are never undone automatically.
  const current = getBooking(bookingId);
  if (current.status === "cancelled") {
    const autoCancelled = current.cancel_reason === "Not paid in time (auto)";
    const restored = autoCancelled && db.transaction(() => {
      const dep = getDeparture(current.departure_id);
      if (dep.status === "open" && dep.booked + current.travellers <= dep.capacity) {
        db.prepare("UPDATE bookings SET status = 'pending', cancel_reason = NULL WHERE id = ?").run(bookingId);
        return true;
      }
      return false;
    }).immediate();
    if (!restored) {
      db.prepare("UPDATE bookings SET cancel_reason = ? WHERE id = ?").run(`PAID ${money(amount)} AFTER CANCELLATION: ${autoCancelled ? "no seats left" : "booking had been cancelled"}, refund or rebook needed`, bookingId);
      db.prepare("INSERT INTO audit_log (user_name, action, details) VALUES ('system', 'payment.on_cancelled', ?)").run(`${current.ref} ${money(amount)}`);
      notifyLater(() => sendSms({ to: current.customer_phone, bookingId, message: `We received ${money(amount)} for booking ${current.ref}, but the booking was no longer active when it arrived. Our team will call you to rebook or refund. - ${company.name}` }));
      return getBooking(bookingId);
    }
  }

  const b = refreshBookingStatus(bookingId);
  const fresh = getBooking(bookingId);
  const first = fresh.customer_name.split(" ")[0];
  const message = b?.justConfirmed
    ? `Hi ${first}, your ${fresh.tour_title} trip on ${date(fresh.start_date)} is CONFIRMED. Ref ${fresh.ref}. Paid ${money(fresh.paid)}, balance ${money(fresh.balance)}. Details: ${bookingLink(fresh)} - ${company.name}`
    : `Payment of ${money(amount)} received for booking ${fresh.ref}. Balance: ${money(fresh.balance)}. Thank you! - ${company.name}`;
  notifyLater(() => sendSms({ to: fresh.customer_phone, bookingId, message }));
  notifyLater(() => sendBookingEmail(fresh, { amount, confirmed: Boolean(b?.justConfirmed) }));
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
