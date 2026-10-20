import { db } from "./db.js";

// Sends an SMS through Arkesel when ARKESEL_API_KEY is set; otherwise the
// message is only logged so staff can see it under Admin → Messages.
export async function sendSms({ to, message, bookingId = null }) {
  let status = "logged";
  let error = null;
  if (process.env.ARKESEL_API_KEY && to) {
    try {
      const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: { "api-key": process.env.ARKESEL_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sender: (process.env.SMS_SENDER_ID || "TourFlow").slice(0, 11),
          message,
          recipients: [to.replace(/^\+/, "")], // Arkesel expects 233XXXXXXXXX
        }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && (body.status === undefined || body.status === "success")) status = "sent";
      else { status = "failed"; error = String(body.message || `HTTP ${res.status}`).slice(0, 200); }
    } catch (e) {
      status = "failed";
      error = e.name === "TimeoutError" ? "Arkesel did not respond" : "Could not reach Arkesel";
    }
    if (error) console.error(`[sms] Failed to ${to}: ${error}`);
  }
  db.prepare("INSERT INTO notifications (booking_id, channel, recipient, message, status, error) VALUES (?,?,?,?,?,?)")
    .run(bookingId, "sms", to || "-", message, status, error);
  return { status, error };
}

/** Ghana mobile numbers only (+233 followed by 9 digits starting 2 or 5). */
export function isGhanaMobile(phone) {
  return /^\+233[25]\d{8}$/.test(String(phone || ""));
}

/**
 * Automatic SMS triggered by public website forms (not by staff or payments) are limited,
 * so the forms can't be used to spam people or run up SMS costs:
 * Ghana numbers only, one per number per day, and at most PUBLIC_SMS_DAILY_CAP per day overall.
 */
export function canSendPublicSms(phone) {
  if (!isGhanaMobile(phone)) return false;
  const recent = db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE booking_id IS NULL AND recipient = ? AND created_at > datetime('now', '-1 day')").get(phone).n;
  if (recent > 0) return false;
  const today = db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE booking_id IS NULL AND created_at > datetime('now', '-1 day')").get().n;
  return today < Number(process.env.PUBLIC_SMS_DAILY_CAP || 50);
}
