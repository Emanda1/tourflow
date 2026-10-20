import { db } from "./db.js";

// Sends an SMS through Arkesel when ARKESEL_API_KEY is set; otherwise the
// message is only logged so staff can see it under Admin → Messages.
export async function sendSms({ to, message, bookingId = null }) {
  let status = "logged";
  if (process.env.ARKESEL_API_KEY && to) {
    try {
      const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: { "api-key": process.env.ARKESEL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: process.env.SMS_SENDER_ID || "TourFlow",
          message,
          recipients: [to.replace(/^\+/, "")],
        }),
      });
      status = res.ok ? "sent" : "failed";
    } catch {
      status = "failed";
    }
  }
  db.prepare("INSERT INTO notifications (booking_id, channel, recipient, message, status) VALUES (?,?,?,?,?)")
    .run(bookingId, "sms", to || "-", message, status);
  return status;
}
