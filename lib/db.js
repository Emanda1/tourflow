import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seed } from "./seed.js";

const DB_PATH = path.join(process.cwd(), "data", "tourflow.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Local',
  duration_days INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,              -- per person, in pesewas
  deposit_percent INTEGER NOT NULL DEFAULT 30,
  summary TEXT,
  description TEXT,
  itinerary TEXT,                      -- one line per day
  inclusions TEXT,                     -- one per line
  exclusions TEXT,                     -- one per line
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Guide',  -- Guide | Driver
  phone TEXT
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  plate TEXT,
  seats INTEGER NOT NULL DEFAULT 14
);

CREATE TABLE IF NOT EXISTS departures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT,
  capacity INTEGER NOT NULL DEFAULT 20,
  price_override INTEGER,
  status TEXT NOT NULL DEFAULT 'open', -- open | closed | completed | cancelled
  guide_id INTEGER REFERENCES staff(id),
  driver_id INTEGER REFERENCES staff(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  pickup_point TEXT,
  pickup_time TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE NOT NULL,
  departure_id INTEGER NOT NULL REFERENCES departures(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  travellers INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | cancelled
  payment_plan TEXT NOT NULL DEFAULT 'full', -- full | deposit
  source TEXT NOT NULL DEFAULT 'website',   -- website | walk-in | phone | agent
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS travellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  checked_in INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,             -- pesewas
  method TEXT NOT NULL,                -- momo | card | bank | cash | demo
  reference TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'success', -- pending | success | failed
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,               -- sms | email
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,                -- sent | logged | failed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  destination TEXT,
  travel_date TEXT,
  group_size INTEGER,
  budget TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',  -- new | contacted | won | lost
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_departures_tour ON departures(tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
`;

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM tours").get();
  if (n === 0) seed(db);
  return db;
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis;
export const db = globalForDb.__tourflowDb ?? (globalForDb.__tourflowDb = open());

/* ---------- Query helpers ---------- */

const DEPARTURE_SELECT = `
  SELECT d.*, t.title AS tour_title, t.slug AS tour_slug, t.destination, t.duration_days,
         t.deposit_percent, COALESCE(d.price_override, t.price) AS price,
         COALESCE((SELECT SUM(b.travellers) FROM bookings b
                   WHERE b.departure_id = d.id AND b.status != 'cancelled'), 0) AS booked,
         g.name AS guide_name, dr.name AS driver_name, v.name AS vehicle_name, v.plate AS vehicle_plate
  FROM departures d
  JOIN tours t ON t.id = d.tour_id
  LEFT JOIN staff g ON g.id = d.guide_id
  LEFT JOIN staff dr ON dr.id = d.driver_id
  LEFT JOIN vehicles v ON v.id = d.vehicle_id
`;

export function getDeparture(id) {
  return db.prepare(`${DEPARTURE_SELECT} WHERE d.id = ?`).get(id);
}

export function listDepartures({ tourId, upcomingOnly = false, openOnly = false } = {}) {
  const where = [];
  const args = [];
  if (tourId) { where.push("d.tour_id = ?"); args.push(tourId); }
  if (upcomingOnly) where.push("d.start_date >= date('now')");
  if (openOnly) where.push("d.status = 'open'");
  const sql = `${DEPARTURE_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY d.start_date`;
  return db.prepare(sql).all(...args);
}

const BOOKING_SELECT = `
  SELECT b.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
         d.start_date, d.end_date, d.pickup_point, d.pickup_time, t.title AS tour_title, t.slug AS tour_slug,
         t.deposit_percent,
         COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id AND p.status = 'success'), 0) AS paid
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  JOIN departures d ON d.id = b.departure_id
  JOIN tours t ON t.id = d.tour_id
`;

export function withBalance(b) {
  if (!b) return b;
  const balance = Math.max(0, b.total - b.paid);
  const depositDue = Math.ceil((b.total * b.deposit_percent) / 100);
  let payment_status = "unpaid";
  if (b.paid >= b.total) payment_status = "paid";
  else if (b.paid > 0) payment_status = "partial";
  return { ...b, balance, depositDue, payment_status };
}

export function getBookingByRef(ref) {
  return withBalance(db.prepare(`${BOOKING_SELECT} WHERE b.ref = ?`).get(ref));
}

export function getBooking(id) {
  return withBalance(db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(id));
}

export function listBookings({ status, departureId, q, customerId } = {}) {
  const where = [];
  const args = [];
  if (status) { where.push("b.status = ?"); args.push(status); }
  if (departureId) { where.push("b.departure_id = ?"); args.push(departureId); }
  if (customerId) { where.push("b.customer_id = ?"); args.push(customerId); }
  if (q) {
    where.push("(b.ref LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const sql = `${BOOKING_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY b.created_at DESC, b.id DESC`;
  return db.prepare(sql).all(...args).map(withBalance);
}

export function generateRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    let ref = "TF-";
    for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
    if (!db.prepare("SELECT 1 FROM bookings WHERE ref = ?").get(ref)) return ref;
  }
}

/** Confirms a booking once it has received at least the deposit. */
export function refreshBookingStatus(bookingId) {
  const b = getBooking(bookingId);
  if (!b || b.status === "cancelled") return b;
  if (b.status === "pending" && b.paid >= b.depositDue) {
    db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(bookingId);
    return { ...b, status: "confirmed", justConfirmed: true };
  }
  return b;
}
