import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { useTempData } from "./helpers.mjs";

// A database made by the very first version (no staff accounts, settings, contacts or tokens).
const dir = useTempData();
const old = new Database(path.join(dir, "tourflow.db"));
old.exec(`
  CREATE TABLE tours (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, destination TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Local', duration_days INTEGER NOT NULL DEFAULT 1, price INTEGER NOT NULL, deposit_percent INTEGER NOT NULL DEFAULT 30,
    summary TEXT, description TEXT, itinerary TEXT, inclusions TEXT, exclusions TEXT, image_url TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE staff (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Guide', phone TEXT);
  CREATE TABLE vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, plate TEXT, seats INTEGER NOT NULL DEFAULT 14);
  CREATE TABLE departures (id INTEGER PRIMARY KEY AUTOINCREMENT, tour_id INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT, capacity INTEGER NOT NULL DEFAULT 20,
    price_override INTEGER, status TEXT NOT NULL DEFAULT 'open', guide_id INTEGER, driver_id INTEGER, vehicle_id INTEGER, pickup_point TEXT, pickup_time TEXT, notes TEXT);
  CREATE TABLE customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT UNIQUE NOT NULL, departure_id INTEGER NOT NULL, customer_id INTEGER NOT NULL, travellers INTEGER NOT NULL,
    unit_price INTEGER NOT NULL, total INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', payment_plan TEXT NOT NULL DEFAULT 'full', source TEXT NOT NULL DEFAULT 'website', notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE travellers (id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT, checked_in INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE payments (id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL, amount INTEGER NOT NULL, method TEXT NOT NULL, reference TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'success', note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER, channel TEXT NOT NULL, recipient TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  INSERT INTO tours (slug,title,destination,price,deposit_percent) VALUES ('old','Old Tour','Accra',100000,40);
  INSERT INTO departures (tour_id,start_date,capacity) VALUES (1,'2030-01-01',10);
  INSERT INTO customers (name,email,phone) VALUES ('Ama','ama@example.com','+233241112222');
  INSERT INTO bookings (ref,departure_id,customer_id,travellers,unit_price,total,status) VALUES ('TF-OLD001',1,1,2,100000,200000,'confirmed');
  INSERT INTO payments (booking_id,amount,method) VALUES (1,80000,'momo');
`);
old.close();

const { db, getBookingByRef } = await import("../lib/db.js");

test("an old database is upgraded without losing anything", () => {
  const b = getBookingByRef("TF-OLD001");
  assert.ok(b.access_token, "old bookings get private links");
  assert.equal(b.customer_name, "Ama");
  assert.equal(b.customer_email, "ama@example.com");
  assert.equal(b.deposit_percent, 40);
  assert.equal(b.paid, 80000);
  assert.equal(b.balance, 120000);
  for (const t of ["users", "sessions", "audit_log", "settings", "enquiries", "login_attempts", "password_resets", "tour_options", "booking_extras", "tour_photos"]) {
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE name = ?").get(t), t);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM tours").get().n, 1, "no sample data added to a real database");
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  assert.ok(cols("travellers").includes("price") && cols("travellers").includes("price_type"), "travellers get price columns");
  assert.ok(cols("tours").includes("price_label"));
  assert.ok(fs.existsSync(path.join(dir, "tourflow.db")));
});
