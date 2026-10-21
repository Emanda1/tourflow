// Price options: other traveller types (child, student…) and optional extras (single room, airport pickup…).
import { db } from "./db.js";

export const MAX_OPTIONS = 10; // per kind, per tour

/** The tour's price options, split into traveller types and extras. */
export function tourOptions(tourId) {
  const rows = db.prepare("SELECT id, kind, label, price, per FROM tour_options WHERE tour_id = ? ORDER BY sort, id").all(tourId);
  return {
    types: rows.filter((r) => r.kind === "traveller"),
    extras: rows.filter((r) => r.kind === "extra"),
  };
}

/** Name of the main per-person price, e.g. "Adult". */
export function mainLabel(tour, options) {
  return tour?.price_label || (options?.types?.length ? "Adult" : "Per person");
}

/**
 * Works out what a booking costs.
 * travellers: [{ name, phone, type }] where type is a traveller option id (or empty for the main price)
 * extras: [{ id, quantity }]
 * Throws a plain Error with a customer-friendly message if something doesn't match the tour's current prices.
 */
export function priceBooking({ basePrice, baseLabel, options, travellers, extras = [] }) {
  const types = new Map(options.types.map((t) => [t.id, t]));
  const priced = travellers.map((t) => {
    const typeId = Number(t.type) || 0;
    if (!typeId) return { ...t, price_type: baseLabel, price: basePrice };
    const type = types.get(typeId);
    if (!type) throw new Error("The prices for this trip have just changed. Please reload the page and try again.");
    return { ...t, price_type: type.label, price: type.price };
  });

  const byId = new Map(options.extras.map((x) => [x.id, x]));
  const chosen = [];
  const seen = new Set();
  for (const e of extras) {
    const qty = Math.floor(Number(e.quantity) || 0);
    if (qty <= 0) continue;
    const id = Number(e.id);
    const extra = byId.get(id);
    if (!extra) throw new Error("The extras for this trip have just changed. Please reload the page and try again.");
    if (seen.has(id)) continue;
    seen.add(id);
    const max = extra.per === "booking" ? 1 : priced.length;
    if (qty > max) throw new Error(extra.per === "booking" ? `"${extra.label}" can only be added once per booking.` : `"${extra.label}" can't be added more times than there are travellers.`);
    chosen.push({ label: extra.label, unit_price: extra.price, quantity: qty });
  }

  const total = priced.reduce((s, t) => s + t.price, 0) + chosen.reduce((s, x) => s + x.unit_price * x.quantity, 0);
  return { travellers: priced, extras: chosen, total };
}

/**
 * Lines for receipts and booking pages: "2 × Adult @ GH₵ 1,450", "1 × Single room @ GH₵ 400".
 * Older bookings (made before price options existed) show as one line.
 */
export function bookingLines(b) {
  const travellers = db.prepare("SELECT price_type, price FROM travellers WHERE booking_id = ? ORDER BY id").all(b.id);
  const lines = [];
  if (travellers.length && travellers.every((t) => t.price != null)) {
    const groups = new Map();
    for (const t of travellers) {
      const key = `${t.price_type}|${t.price}`;
      const g = groups.get(key) || { label: t.price_type || "Per person", qty: 0, unit: t.price };
      g.qty++;
      groups.set(key, g);
    }
    lines.push(...groups.values());
  } else {
    lines.push({ label: "Per person", qty: b.travellers, unit: b.unit_price });
  }
  for (const x of db.prepare("SELECT label, unit_price, quantity FROM booking_extras WHERE booking_id = ? ORDER BY id").all(b.id)) {
    lines.push({ label: x.label, qty: x.quantity, unit: x.unit_price, extra: true });
  }
  return lines.map((l) => ({ ...l, total: l.qty * l.unit }));
}
