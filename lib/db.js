import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { seed } from "./seed.js";
import { envInt } from "./envnum.js";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "tourflow.db");

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

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales',   -- owner | manager | sales | operations
  active INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                 -- sha256 of the cookie token
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,                -- email|ip
  email TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  first_at INTEGER NOT NULL,           -- ms since epoch
  locked_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,         -- ms since epoch
  used_at INTEGER,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Extra prices for a tour: other traveller types (e.g. "Child (under 12)") and optional extras
-- (e.g. "Single room", "Airport pickup"). Bookings keep their own copy of the names and prices,
-- so editing a tour never changes existing bookings.
CREATE TABLE IF NOT EXISTS tour_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                  -- traveller | extra
  label TEXT NOT NULL,
  price INTEGER NOT NULL,              -- pesewas (traveller: per person of this type; extra: per unit)
  per TEXT NOT NULL DEFAULT 'person',  -- extras only: person | booking
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS booking_extras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tour_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tour_options_tour ON tour_options(tour_id);
CREATE INDEX IF NOT EXISTS idx_booking_extras_booking ON booking_extras(booking_id);
CREATE INDEX IF NOT EXISTS idx_tour_photos_tour ON tour_photos(tour_id);
CREATE INDEX IF NOT EXISTS idx_travellers_booking ON travellers(booking_id);
CREATE INDEX IF NOT EXISTS idx_departures_tour ON departures(tour_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_departure ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
`;

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  migrate(db);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM tours").get();
  // Sample data is for demos only. It is never loaded in production unless explicitly asked for.
  const wantSeed = process.env.SEED_DEMO_DATA ? process.env.SEED_DEMO_DATA === "true" : process.env.NODE_ENV !== "production";
  if (n === 0 && wantSeed) {
    seed(db);
    db.exec("UPDATE bookings SET contact_name = (SELECT name FROM customers c WHERE c.id = bookings.customer_id), contact_email = (SELECT email FROM customers c WHERE c.id = bookings.customer_id) WHERE contact_name IS NULL");
  }
  return db;
}

/** Adds columns introduced after the first release, so older databases keep working. */
function migrate(db) {
  // All upgrades run together: if anything fails, nothing is half-changed.
  db.transaction(() => {
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  if (!cols("bookings").includes("access_token")) {
    db.exec("ALTER TABLE bookings ADD COLUMN access_token TEXT");
    const rows = db.prepare("SELECT id FROM bookings").all();
    const upd = db.prepare("UPDATE bookings SET access_token = ? WHERE id = ?");
    for (const r of rows) upd.run(newToken(), r.id);
  }
  if (!cols("bookings").includes("deposit_percent")) {
    // The deposit rule is fixed when a booking is made, so later tour edits don't change it.
    db.exec("ALTER TABLE bookings ADD COLUMN deposit_percent INTEGER");
    db.exec("UPDATE bookings SET deposit_percent = (SELECT t.deposit_percent FROM departures d JOIN tours t ON t.id = d.tour_id WHERE d.id = bookings.departure_id)");
  }
  if (!cols("bookings").includes("cancel_reason")) db.exec("ALTER TABLE bookings ADD COLUMN cancel_reason TEXT");
  if (!cols("payments").includes("kind")) db.exec("ALTER TABLE payments ADD COLUMN kind TEXT NOT NULL DEFAULT 'payment'"); // payment | refund
  if (!cols("staff").includes("active")) db.exec("ALTER TABLE staff ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  if (!cols("vehicles").includes("active")) db.exec("ALTER TABLE vehicles ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  if (!cols("notifications").includes("error")) db.exec("ALTER TABLE notifications ADD COLUMN error TEXT");
  if (!cols("payments").includes("recorded_by")) db.exec("ALTER TABLE payments ADD COLUMN recorded_by TEXT");
  if (!cols("bookings").includes("contact_name")) {
    // Contact details belong to each booking, so one booking can never change what another shows or where it emails.
    db.exec("ALTER TABLE bookings ADD COLUMN contact_name TEXT");
    db.exec("ALTER TABLE bookings ADD COLUMN contact_email TEXT");
    db.exec("UPDATE bookings SET contact_name = (SELECT name FROM customers c WHERE c.id = bookings.customer_id), contact_email = (SELECT email FROM customers c WHERE c.id = bookings.customer_id)");
  }
  if (!cols("travellers").includes("price")) {
    // Each traveller keeps the price type and amount they were booked at (old bookings: the booking's per-person price).
    db.exec("ALTER TABLE travellers ADD COLUMN price_type TEXT");
    db.exec("ALTER TABLE travellers ADD COLUMN price INTEGER");
  }
  if (!cols("tours").includes("price_label")) db.exec("ALTER TABLE tours ADD COLUMN price_label TEXT"); // name of the main price, e.g. "Adult"
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_token ON bookings(access_token)");
  })();
}

export function newToken(bytes = 18) {
  return crypto.randomBytes(bytes).toString("base64url");
}

// One shared connection, opened on first use (so building the app never touches the database).
// It is kept on globalThis so development hot reloads reuse it.
function getDb() {
  return globalThis.__tourflowDb ?? (globalThis.__tourflowDb = open());
}
export const db = new Proxy({}, {
  get(_, prop) {
    const real = getDb();
    const v = real[prop];
    return typeof v === "function" ? v.bind(real) : v;
  },
});

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
  SELECT b.*, COALESCE(b.contact_name, c.name) AS customer_name, c.phone AS customer_phone, b.contact_email AS customer_email, c.name AS account_name,
         d.start_date, d.end_date, d.pickup_point, d.pickup_time, t.title AS tour_title, t.slug AS tour_slug,
         COALESCE(b.deposit_percent, t.deposit_percent) AS deposit_percent,
         COALESCE((SELECT SUM(CASE WHEN p.kind = 'refund' THEN -p.amount ELSE p.amount END) FROM payments p WHERE p.booking_id = b.id AND p.status = 'success'), 0) AS paid,
         COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id AND p.status = 'success' AND p.kind = 'refund'), 0) AS refunded
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  JOIN departures d ON d.id = b.departure_id
  JOIN tours t ON t.id = d.tour_id
`;

export function withBalance(b) {
  if (!b) return b;
  const balance = b.status === "cancelled" ? 0 : Math.max(0, b.total - b.paid);
  // 0% or 100% deposit means "pay in full to confirm".
  const pct = b.deposit_percent > 0 && b.deposit_percent < 100 ? b.deposit_percent : 100;
  const depositDue = Math.ceil((b.total * pct) / 100);
  let payment_status = "unpaid";
  if (b.refunded > 0 && b.paid <= 0) payment_status = "refunded";
  else if (b.paid >= b.total) payment_status = "paid";
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
    // Phones are stored as +233…, so also try the search in that form (024… → +23324…).
    const digits = String(q).replace(/\D/g, "");
    const phoneQ = digits.startsWith("0") ? "233" + digits.slice(1) : digits;
    where.push("(b.ref LIKE ? OR c.name LIKE ? OR b.contact_name LIKE ? OR c.phone LIKE ? OR (? != '' AND replace(c.phone, '+', '') LIKE ?))");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, phoneQ.length >= 4 ? phoneQ : "", `%${phoneQ}%`);
  }
  const sql = `${BOOKING_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY b.created_at DESC, b.id DESC`;
  return db.prepare(sql).all(...args).map(({ access_token, ...b }) => withBalance(b));
}

export function generateRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    let ref = "TF-";
    for (let i = 0; i < 6; i++) ref += chars[crypto.randomInt(chars.length)];
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

/** SQL expression for money actually kept (payments minus refunds) — use with alias p. */
export const NET_AMOUNT = "CASE WHEN p.kind = 'refund' THEN -p.amount ELSE p.amount END";

/**
 * Releases seats held by unpaid online bookings older than the hold window.
 * Staff-created bookings (walk-in/phone/agent) are never auto-cancelled.
 */
export function expireUnpaidBookings(holdMinutes = envInt("BOOKING_HOLD_MINUTES", 30, { min: 5, max: 7 * 24 * 60 })) {
  const res = db.prepare(`UPDATE bookings SET status = 'cancelled', cancel_reason = 'Not paid in time (auto)'
    WHERE status = 'pending' AND source = 'website'
      AND created_at < datetime('now', ?)
      AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id AND p.status = 'success')
      AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id AND p.status = 'pending'
                      AND p.created_at > datetime('now', '-45 minutes'))`)
    .run(`-${Math.max(5, holdMinutes)} minutes`);
  return res.changes;
}

export function getSetting(key) {
  return db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? null;
}

export function setSettings(obj) {
  const up = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  db.transaction(() => { for (const [k, v] of Object.entries(obj)) up.run(k, v == null ? null : String(v)); })();
}
