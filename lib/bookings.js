import { db, getBooking, getDeparture, generateRef, refreshBookingStatus } from "./db.js";
import { sendSms } from "./notify.js";
import { money, date, normalisePhone } from "./format.js";
import { company } from "./config.js";

export class BookingError extends Error {}

/** Creates a booking, holding seats on the departure. Returns the booking. */
export function createBooking({ departureId, name, email, phone, travellers, plan = "full", source = "website", notes = "" }) {
  const dep = getDeparture(departureId);
  if (!dep) throw new BookingError("That departure no longer exists.");
  if (dep.status !== "open") throw new BookingError("This departure is not taking bookings.");
  const names = travellers.map((t) => t.name.trim()).filter(Boolean);
  if (!name.trim() || !phone.trim()) throw new BookingError("Please enter your name and phone number.");
  if (names.length < 1) throw new BookingError("Add at least one traveller.");
  const seatsLeft = dep.capacity - dep.booked;
  if (names.length > seatsLeft) throw new BookingError(`Only ${seatsLeft} seat(s) left on this date.`);

  const cleanPhone = normalisePhone(phone);
  const tx = db.transaction(() => {
    let customer = db.prepare("SELECT * FROM customers WHERE phone = ?").get(cleanPhone);
    if (customer) {
      db.prepare("UPDATE customers SET name = ?, email = COALESCE(NULLIF(?, ''), email) WHERE id = ?").run(name.trim(), email.trim(), customer.id);
    } else {
      customer = { id: db.prepare("INSERT INTO customers (name,email,phone) VALUES (?,?,?)").run(name.trim(), email.trim(), cleanPhone).lastInsertRowid };
    }
    const ref = generateRef();
    const total = dep.price * names.length;
    const id = db.prepare(`INSERT INTO bookings (ref,departure_id,customer_id,travellers,unit_price,total,status,payment_plan,source,notes)
      VALUES (?,?,?,?,?,?, 'pending', ?, ?, ?)`).run(ref, dep.id, customer.id, names.length, dep.price, total, plan, source, notes).lastInsertRowid;
    const ins = db.prepare("INSERT INTO travellers (booking_id,name,phone) VALUES (?,?,?)");
    travellers.forEach((t) => t.name.trim() && ins.run(id, t.name.trim(), t.phone ? normalisePhone(t.phone) : null));
    return id;
  });
  return getBooking(tx());
}

/** Amount the customer should pay now. */
export function amountDueNow(booking) {
  if (booking.paid === 0 && booking.payment_plan === "deposit") return booking.depositDue;
  return booking.balance;
}

/** Records a successful payment and sends confirmations. Safe to call twice with the same reference. */
export async function recordPayment({ bookingId, amount, method, reference = null, note = null }) {
  if (reference) {
    const existing = db.prepare("SELECT * FROM payments WHERE reference = ?").get(reference);
    if (existing?.status === "success") return getBooking(bookingId);
    if (existing) {
      db.prepare("UPDATE payments SET status = 'success', amount = ?, method = ? WHERE id = ?").run(amount, method, existing.id);
    } else {
      db.prepare("INSERT INTO payments (booking_id,amount,method,reference,status,note) VALUES (?,?,?,?, 'success', ?)").run(bookingId, amount, method, reference, note);
    }
  } else {
    db.prepare("INSERT INTO payments (booking_id,amount,method,status,note) VALUES (?,?,?, 'success', ?)").run(bookingId, amount, method, note);
  }
  const b = refreshBookingStatus(bookingId);
  const fresh = getBooking(bookingId);
  if (b?.justConfirmed) {
    await sendSms({
      to: fresh.customer_phone,
      bookingId,
      message: `Hi ${fresh.customer_name.split(" ")[0]}, your ${fresh.tour_title} trip on ${date(fresh.start_date)} is CONFIRMED. Ref ${fresh.ref}. Paid ${money(fresh.paid)}, balance ${money(fresh.balance)}. - ${company.name}`,
    });
  } else {
    await sendSms({
      to: fresh.customer_phone,
      bookingId,
      message: `Payment of ${money(amount)} received for booking ${fresh.ref}. Balance: ${money(fresh.balance)}. Thank you! - ${company.name}`,
    });
  }
  return fresh;
}
