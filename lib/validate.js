// Small helpers to read and clean form input on the server.

export function text(fd, key, { max = 200, required = false } = {}) {
  const v = String(fd.get(key) ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max);
  if (required && !v) throw new ValidationError(`Please fill in ${key.replace(/_/g, " ")}.`);
  return v;
}

export function int(fd, key, { min = 0, max = 1_000_000, fallback = null } = {}) {
  const raw = fd.get(key);
  if (raw === null || raw === "") return fallback;
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function isEmail(v) {
  return /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/.test(v) && v.length <= 160;
}

export function isPhone(v) {
  const digits = String(v).replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function isDate(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; // rejects 2026-02-31
}

/** Only allow images from https links or our own uploads, so nothing else can be injected into CSS. */
export function safeImageUrl(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(s)) return s;
  if (/^linear-gradient\(\d{1,3}deg(,\s*#[0-9a-f]{3,8}){2,4}\)$/i.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" && !/["'()\\\s]/.test(s)) return u.toString();
  } catch {}
  return null;
}

export class ValidationError extends Error {}

/** The text values a user typed, minus secrets, so a form can be refilled after an error. */
export function formValues(fd) {
  const out = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !/password|confirm|current|code|^\$ACTION/i.test(k)) out[k] = v.slice(0, 2000);
  }
  return out;
}
