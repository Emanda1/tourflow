import nodemailer from "nodemailer";
import { company, appUrl } from "./config.js";
import { money, dateRange } from "./format.js";

// Email is optional. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM to turn it on.
let transport;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sendBookingEmail(b, { amount, confirmed }) {
  const t = getTransport();
  if (!t || !b.customer_email) return "skipped";
  const link = `${appUrl}/booking/${b.ref}?k=${b.access_token}`;
  const subject = confirmed ? `Booking confirmed: ${b.tour_title} (${b.ref})` : `Payment received for ${b.ref}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1c1917">
      <h2 style="color:#0f766e">${esc(company.name)}</h2>
      <p>Hi ${esc(b.customer_name.split(" ")[0])},</p>
      <p>${confirmed ? "Your trip is <strong>confirmed</strong>." : "We've received your payment."}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#6b645c">Booking</td><td><strong>${esc(b.ref)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b645c">Trip</td><td>${esc(b.tour_title)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b645c">Dates</td><td>${esc(dateRange(b.start_date, b.end_date))}</td></tr>
        <tr><td style="padding:6px 0;color:#6b645c">Travellers</td><td>${b.travellers}</td></tr>
        <tr><td style="padding:6px 0;color:#6b645c">This payment</td><td>${esc(money(amount))}</td></tr>
        <tr><td style="padding:6px 0;color:#6b645c">Total paid</td><td>${esc(money(b.paid))}</td></tr>
        <tr><td style="padding:6px 0;color:#6b645c">Balance</td><td><strong>${esc(money(b.balance))}</strong></td></tr>
      </table>
      <p><a href="${esc(link)}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">View booking &amp; receipt</a></p>
      <p style="color:#6b645c;font-size:13px">${esc(company.name)} · ${esc(company.phone)} · ${esc(company.email)}</p>
    </div>`;
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || company.email, to: b.customer_email, subject, html });
    return "sent";
  } catch (e) {
    console.error("Email failed:", e.message);
    return "failed";
  }
}
