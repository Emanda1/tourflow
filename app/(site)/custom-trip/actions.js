"use server";
import { db } from "@/lib/db";
import { normalisePhone } from "@/lib/format";
import { sendSms, canSendPublicSms } from "@/lib/notify";
import { company } from "@/lib/config";
import { text, int, isEmail, isPhone, isDate, formValues } from "@/lib/validate";
import { rateLimit, HOUR } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export async function submitEnquiry(prev, formData) {
  if (formData.get("website")) return { ok: true, name: "there" }; // spam trap: pretend success
  const ip = await clientIp();
  if (!rateLimit(`enq:${ip}`, 5, HOUR)) return { error: "Too many requests from your connection. Please call or WhatsApp us instead.", values: formValues(formData) };

  const name = text(formData, "name", { max: 120 });
  const phone = text(formData, "phone", { max: 30 });
  const email = text(formData, "email", { max: 160 });
  const travelDate = text(formData, "travel_date", { max: 10 });
  if (!name || !isPhone(phone)) return { error: "Please give us your name and a valid phone number.", values: formValues(formData) };
  if (email && !isEmail(email)) return { error: "That email address doesn't look right.", values: formValues(formData) };

  const clean = normalisePhone(phone);
  db.prepare(`INSERT INTO enquiries (name, phone, email, destination, travel_date, group_size, budget, message)
    VALUES (?,?,?,?,?,?,?,?)`).run(name, clean, email, text(formData, "destination", { max: 120 }),
    isDate(travelDate) ? travelDate : null, int(formData, "group_size", { min: 1, max: 500 }),
    text(formData, "budget", { max: 60 }), text(formData, "message", { max: 2000 }));

  // Fixed wording only (no visitor-typed text), and strict limits: see canSendPublicSms.
  if (canSendPublicSms(clean)) {
    await sendSms({ to: clean, message: `Thank you for your trip request. Our team will call you within 24 hours. - ${company.name}` });
  }
  return { ok: true, name: name.split(" ")[0] };
}
