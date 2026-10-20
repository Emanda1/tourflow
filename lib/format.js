import { safeImageUrl } from "./validate.js";

/** Amounts are stored in pesewas (1 GHS = 100 pesewas). */
export function money(pesewas) {
  const v = (pesewas || 0) / 100;
  return "GH₵ " + v.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function toPesewas(cedis) {
  const raw = String(cedis ?? "").trim();
  if (raw.startsWith("-")) return 0; // negative amounts are never valid
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

// Dates are shown in the company's time zone (Ghana by default), whatever the server's own clock setting.
const TZ = process.env.APP_TIMEZONE || "Africa/Accra";

export function date(iso) {
  if (!iso) return "";
  // "2026-10-24" is a calendar date; "2026-10-24 13:45:00" (from the database) or ISO strings are UTC moments.
  const d = iso.length === 10 ? new Date(iso + "T12:00:00Z") : new Date(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: iso.length === 10 ? "UTC" : TZ });
}

export function dateTime(iso) {
  if (!iso) return "";
  const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export function dateRange(start, end) {
  if (!end || end === start) return date(start);
  return `${date(start)} – ${date(end)}`;
}

export function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function lines(text) {
  return String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
}

export function coverStyle(raw) {
  const image = safeImageUrl(raw);
  if (!image) return { background: "linear-gradient(135deg,#0f766e,#14b8a6)" };
  if (/^(https?:\/\/|\/)/.test(image)) return { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" };
  return { background: image };
}

/** Normalises Ghana phone numbers to +233XXXXXXXXX. */
export function normalisePhone(raw) {
  let p = String(raw || "").replace(/[^0-9+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);          // 00233… → +233…
  if (p.startsWith("+")) p = p.slice(1);
  if (/^2330\d{9}$/.test(p)) p = "233" + p.slice(4);     // +233 024… → +23324…
  if (/^233\d{9}$/.test(p)) return "+" + p;
  if (/^0\d{9}$/.test(p)) return "+233" + p.slice(1);   // 024 123 4567
  if (/^[25]\d{8}$/.test(p)) return "+233" + p;         // 24 123 4567 (no leading 0)
  return p ? "+" + p : "";                              // other countries: keep as typed
}

const STATUS_LABELS = { pending: "Awaiting payment", confirmed: "Confirmed", cancelled: "Cancelled" };
const PAYMENT_LABELS = { unpaid: "Unpaid", partial: "Part paid", paid: "Paid in full", refunded: "Refunded" };
export const statusLabel = (s) => STATUS_LABELS[s] || s;
export const paymentLabel = (s) => PAYMENT_LABELS[s] || s;
