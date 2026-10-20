// Reads a whole-number setting from the environment, falling back to a safe default when it's
// missing or not a number (e.g. "30m"), and keeping it within sensible limits.
export function envInt(name, fallback, { min = -Infinity, max = Infinity } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const BAD_NUMBERS = ["SESSION_HOURS", "BOOKING_HOLD_MINUTES", "BACKUP_KEEP", "PUBLIC_SMS_DAILY_CAP", "TRUST_PROXY_HOPS", "SMTP_PORT"]
  .filter((k) => process.env[k] !== undefined && process.env[k] !== "" && !Number.isInteger(Number(process.env[k])));
