import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useTempData } from "./helpers.mjs";

useTempData();
const { db, getBooking } = await import("../lib/db.js");
const { createBooking, recordPayment, BookingError } = await import("../lib/bookings.js");
const { tourOptions, bookingLines, priceBooking, mainLabel } = await import("../lib/pricing.js");

let tourId, depId, child, infant, single, pickup;
before(() => {
  tourId = db.prepare(`INSERT INTO tours (slug,title,destination,duration_days,price,deposit_percent) VALUES ('p','Price Tour','Accra',2,100000,30)`).run().lastInsertRowid;
  const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  depId = db.prepare("INSERT INTO departures (tour_id,start_date,end_date,capacity) VALUES (?,?,?,20)").run(tourId, future, future).lastInsertRowid;
  const opt = db.prepare("INSERT INTO tour_options (tour_id, kind, label, price, per, sort) VALUES (?,?,?,?,?,?)");
  child = Number(opt.run(tourId, "traveller", "Child", 60000, "person", 0).lastInsertRowid);
  infant = Number(opt.run(tourId, "traveller", "Infant", 0, "person", 1).lastInsertRowid);
  single = Number(opt.run(tourId, "extra", "Single room", 25000, "person", 0).lastInsertRowid);
  pickup = Number(opt.run(tourId, "extra", "Airport pickup", 15000, "booking", 1).lastInsertRowid);
});
beforeEach(() => db.exec("DELETE FROM payments; DELETE FROM booking_extras; DELETE FROM travellers; DELETE FROM bookings;"));

const book = (travellers, extras = [], more = {}) => createBooking({
  departureId: depId, name: "Ama Test", email: "ama@example.com", phone: "0241234567", travellers, extras, plan: "deposit", ...more,
});

test("adults, children and infants are each charged their own price", () => {
  const b = book([{ name: "Ama" }, { name: "Kojo", type: child }, { name: "Baby", type: infant }]);
  assert.equal(b.total, 100000 + 60000 + 0);
  assert.equal(b.travellers, 3, "everyone takes a seat");
  const rows = db.prepare("SELECT name, price_type, price FROM travellers WHERE booking_id = ? ORDER BY id").all(b.id);
  assert.deepEqual(rows.map((r) => [r.price_type, r.price]), [["Adult", 100000], ["Child", 60000], ["Infant", 0]]);
});

test("extras are added to the total and the deposit is worked out on the full total", () => {
  const b = book([{ name: "A" }, { name: "B" }], [{ id: single, quantity: 1 }, { id: pickup, quantity: 1 }]);
  assert.equal(b.total, 200000 + 25000 + 15000);
  assert.equal(b.depositDue, Math.ceil(240000 * 0.3));
  const lines = bookingLines(b);
  assert.deepEqual(lines.map((l) => [l.label, l.qty, l.total]), [["Adult", 2, 200000], ["Single room", 1, 25000], ["Airport pickup", 1, 15000]]);
});

test("a per-person extra can't be added more times than there are travellers", () => {
  assert.throws(() => book([{ name: "A" }], [{ id: single, quantity: 2 }]), (e) => e instanceof BookingError && /more times than there are travellers/.test(e.message));
});

test("a per-booking extra can only be added once", () => {
  assert.throws(() => book([{ name: "A" }, { name: "B" }], [{ id: pickup, quantity: 2 }]), BookingError);
});

test("prices from another tour, or deleted prices, are refused", () => {
  const otherTour = db.prepare(`INSERT INTO tours (slug,title,destination,duration_days,price) VALUES ('o','Other','Accra',1,5000)`).run().lastInsertRowid;
  const cheap = Number(db.prepare("INSERT INTO tour_options (tour_id, kind, label, price) VALUES (?, 'traveller', 'Cheap', 1)").run(otherTour).lastInsertRowid);
  const cheapExtra = Number(db.prepare("INSERT INTO tour_options (tour_id, kind, label, price) VALUES (?, 'extra', 'Free stuff', 1)").run(otherTour).lastInsertRowid);
  assert.throws(() => book([{ name: "A", type: cheap }]), (e) => e instanceof BookingError && /reload/.test(e.message));
  assert.throws(() => book([{ name: "A" }], [{ id: cheapExtra, quantity: 1 }]), BookingError);
  assert.throws(() => book([{ name: "A", type: 999999 }]), BookingError);
  // An extra (not a traveller type) can't be used as a traveller price.
  assert.throws(() => book([{ name: "A", type: single }]), BookingError);
});

test("negative, fractional or junk quantities are ignored, never subtracted", () => {
  const b = book([{ name: "A" }], [{ id: single, quantity: -3 }, { id: pickup, quantity: "abc" }]);
  assert.equal(b.total, 100000);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM booking_extras WHERE booking_id = ?").get(b.id).n, 0);
  const c = book([{ name: "A" }, { name: "B" }], [{ id: single, quantity: 1.9 }]);
  assert.equal(c.total, 200000 + 25000);
});

test("the same extra sent twice is only counted once", () => {
  const b = book([{ name: "A" }, { name: "B" }], [{ id: single, quantity: 1 }, { id: single, quantity: 2 }]);
  assert.equal(b.total, 200000 + 25000);
});

test("a booking with nothing to pay (only free infants) is refused", () => {
  assert.throws(() => book([{ name: "Baby", type: infant }]), (e) => e instanceof BookingError && /paying traveller/.test(e.message));
});

test("a special price for a date changes the main price only", () => {
  const future = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  const special = db.prepare("INSERT INTO departures (tour_id,start_date,end_date,capacity,price_override) VALUES (?,?,?,10,120000)").run(tourId, future, future).lastInsertRowid;
  const b = createBooking({ departureId: special, name: "X", email: "x@example.com", phone: "0241234500", travellers: [{ name: "A" }, { name: "K", type: child }] });
  assert.equal(b.total, 120000 + 60000);
});

test("editing the tour's prices later never changes an existing booking", () => {
  const b = book([{ name: "A" }, { name: "K", type: child }], [{ id: single, quantity: 1 }]);
  const before = bookingLines(b);
  db.prepare("UPDATE tour_options SET price = price * 2, label = label || ' (new)' WHERE tour_id = ?").run(tourId);
  db.prepare("UPDATE tours SET price = 999999 WHERE id = ?").run(tourId);
  const after = getBooking(b.id);
  assert.equal(after.total, b.total);
  assert.deepEqual(bookingLines(after), before);
  db.prepare("UPDATE tour_options SET price = price / 2, label = replace(label, ' (new)', '') WHERE tour_id = ?").run(tourId);
  db.prepare("UPDATE tours SET price = 100000 WHERE id = ?").run(tourId);
});

test("paying the deposit of a mixed booking confirms it", async () => {
  const b = book([{ name: "A" }, { name: "K", type: child }], [{ id: pickup, quantity: 1 }]);
  const after = await recordPayment({ bookingId: b.id, amount: b.depositDue, method: "cash" });
  assert.equal(after.status, "confirmed");
  assert.equal(after.balance, b.total - b.depositDue);
});

test("tours without price options work exactly as before", () => {
  const plainTour = db.prepare(`INSERT INTO tours (slug,title,destination,duration_days,price,deposit_percent) VALUES ('plain','Plain','Accra',1,50000,0)`).run().lastInsertRowid;
  const future = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const dep = db.prepare("INSERT INTO departures (tour_id,start_date,end_date,capacity) VALUES (?,?,?,5)").run(plainTour, future, future).lastInsertRowid;
  const b = createBooking({ departureId: dep, name: "P", email: "p@example.com", phone: "0241234501", travellers: [{ name: "A" }, { name: "B" }] });
  assert.equal(b.total, 100000);
  assert.deepEqual(bookingLines(b).map((l) => [l.label, l.qty, l.unit]), [["Per person", 2, 50000]]);
  assert.equal(mainLabel({}, tourOptions(plainTour)), "Per person");
  assert.equal(mainLabel({ price_label: "Twin sharing" }, tourOptions(tourId)), "Twin sharing");
});

test("bookings made before price options existed still show a correct breakdown", () => {
  const b = book([{ name: "A" }, { name: "B" }]);
  db.prepare("UPDATE travellers SET price = NULL, price_type = NULL WHERE booking_id = ?").run(b.id);
  assert.deepEqual(bookingLines(getBooking(b.id)).map((l) => [l.label, l.qty, l.total]), [["Per person", 2, 200000]]);
});

test("priceBooking matches what createBooking charges", () => {
  const options = tourOptions(tourId);
  const quote = priceBooking({ basePrice: 100000, baseLabel: "Adult", options, travellers: [{ name: "A" }, { name: "K", type: String(child) }], extras: [{ id: single, quantity: 2 }] });
  const b = book([{ name: "A" }, { name: "K", type: String(child) }], [{ id: single, quantity: 2 }]);
  assert.equal(quote.total, b.total);
});
