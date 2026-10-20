import { test, before } from "node:test";
import assert from "node:assert/strict";
import { useTempData } from "./helpers.mjs";

useTempData();
const { db, getBooking, expireUnpaidBookings } = await import("../lib/db.js");
const { createBooking, recordPayment, recordRefund, BookingError } = await import("../lib/bookings.js");

let depId;
before(() => {
  const tour = db.prepare(`INSERT INTO tours (slug,title,destination,duration_days,price,deposit_percent) VALUES ('t','Test Tour','Accra',1,100000,30)`).run().lastInsertRowid;
  const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  depId = db.prepare("INSERT INTO departures (tour_id,start_date,end_date,capacity) VALUES (?,?,?,3)").run(tour, future, future).lastInsertRowid;
});

const book = (n, extra = {}) => createBooking({
  departureId: depId, name: "Ama Test", email: "ama@example.com", phone: "0241234567",
  travellers: Array.from({ length: n }, (_, i) => ({ name: `T${i}` })), plan: "deposit", ...extra,
});

test("a booking gets a private link token and correct totals", () => {
  const b = book(1);
  assert.match(b.ref, /^TF-[A-Z2-9]{6}$/);
  assert.ok(b.access_token && b.access_token.length >= 20);
  assert.equal(b.total, 100000);
  assert.equal(b.depositDue, 30000);
  assert.equal(b.status, "pending");
});

test("you cannot book more seats than are left", () => {
  assert.throws(() => book(3), BookingError);
});

test("paying the deposit confirms the booking; overpaying is impossible via balance", async () => {
  const b = book(1);
  const after = await recordPayment({ bookingId: b.id, amount: 30000, method: "cash" });
  assert.equal(after.status, "confirmed");
  assert.equal(after.balance, 70000);
});

test("the same online payment reference is only counted once", async () => {
  db.exec("DELETE FROM bookings WHERE status != 'cancelled'");
  const b = book(1);
  db.prepare("INSERT INTO payments (booking_id, amount, method, reference, status) VALUES (?, 30000, 'paystack', 'REF-1', 'pending')").run(b.id);
  await recordPayment({ bookingId: b.id, amount: 30000, method: "momo", reference: "REF-1" });
  await recordPayment({ bookingId: b.id, amount: 30000, method: "momo", reference: "REF-1" });
  assert.equal(getBooking(b.id).paid, 30000);
});

test("refunds reduce what was paid and cannot exceed it", async () => {
  const b = db.prepare("SELECT id FROM bookings ORDER BY id DESC LIMIT 1").get();
  await assert.rejects(() => recordRefund({ bookingId: b.id, amount: 999999, method: "momo", note: "x" }), BookingError);
  await assert.rejects(() => recordRefund({ bookingId: b.id, amount: 1000, method: "momo", note: "" }), BookingError);
  const after = await recordRefund({ bookingId: b.id, amount: 10000, method: "momo", note: "Partial refund" });
  assert.equal(after.paid, 20000);
  assert.equal(after.refunded, 10000);
});

test("unpaid website bookings release their seats after the hold time", () => {
  db.exec("DELETE FROM payments; DELETE FROM travellers; DELETE FROM bookings;");
  const b = book(2);
  db.prepare("UPDATE bookings SET created_at = datetime('now', '-3 hours') WHERE id = ?").run(b.id);
  const walkIn = book(1, { source: "walk-in" });
  db.prepare("UPDATE bookings SET created_at = datetime('now', '-3 hours') WHERE id = ?").run(walkIn.id);
  assert.equal(expireUnpaidBookings(120), 1);
  assert.equal(getBooking(b.id).status, "cancelled");
  assert.equal(getBooking(walkIn.id).status, "pending", "staff bookings are never auto-cancelled");
});

test("bad input is rejected", () => {
  assert.throws(() => book(1, { phone: "12" }), BookingError);
  assert.throws(() => book(1, { email: "not-an-email" }), BookingError);
  assert.throws(() => book(1, { name: "" }), BookingError);
  assert.throws(() => createBooking({ departureId: 99999, name: "A", email: "a@b.co", phone: "0241234567", travellers: [{ name: "A" }] }), BookingError);
});

test("one person can't hold many unpaid bookings", () => {
  db.exec("DELETE FROM payments; DELETE FROM travellers; DELETE FROM bookings;");
  book(1); book(1);
  assert.throws(() => book(1), /waiting for payment/);
});

test("a website booking can't change another customer's details", async () => {
  db.exec("DELETE FROM payments; DELETE FROM travellers; DELETE FROM bookings;");
  const victim = book(1, { name: "Real Owner", email: "owner@example.com", source: "walk-in" });
  const attacker = book(1, { name: "Attacker", email: "attacker@evil.test" });
  assert.equal(getBooking(victim.id).customer_name, "Real Owner");
  assert.equal(getBooking(victim.id).customer_email, "owner@example.com");
  assert.equal(attacker.customer_name, "Attacker", "attacker's page shows their own typed name, not the victim's");
  const c = db.prepare("SELECT name, email FROM customers WHERE phone = '+233241234567'").get();
  assert.equal(c.name, "Real Owner");
  assert.equal(c.email, "owner@example.com");
});

test("a payment arriving after auto-cancellation restores the booking if seats are free", async () => {
  db.exec("DELETE FROM payments; DELETE FROM travellers; DELETE FROM bookings;");
  const b = book(1);
  db.prepare("UPDATE bookings SET status = 'cancelled', cancel_reason = 'Not paid in time (auto)' WHERE id = ?").run(b.id);
  const after = await recordPayment({ bookingId: b.id, amount: 30000, method: "momo", reference: "LATE-1" });
  assert.equal(after.status, "confirmed");
});

test("a recent pending payment stops the booking from expiring", () => {
  db.exec("DELETE FROM payments; DELETE FROM travellers; DELETE FROM bookings;");
  const b = book(1);
  db.prepare("UPDATE bookings SET created_at = datetime('now', '-3 hours') WHERE id = ?").run(b.id);
  db.prepare("INSERT INTO payments (booking_id, amount, method, reference, status) VALUES (?, 30000, 'paystack', 'PEND-1', 'pending')").run(b.id);
  assert.equal(expireUnpaidBookings(30), 0);
});
