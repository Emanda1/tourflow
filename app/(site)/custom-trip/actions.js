"use server";
import { db } from "@/lib/db";
import { normalisePhone } from "@/lib/format";
import { sendSms } from "@/lib/notify";
import { company } from "@/lib/config";

export async function submitEnquiry(prev, formData) {
  const get = (k) => String(formData.get(k) || "").trim();
  if (!get("name") || !get("phone")) return { error: "Please give us your name and phone number." };
  db.prepare(`INSERT INTO enquiries (name, phone, email, destination, travel_date, group_size, budget, message)
    VALUES (?,?,?,?,?,?,?,?)`).run(get("name"), normalisePhone(get("phone")), get("email"), get("destination"),
    get("travel_date"), Number(get("group_size")) || null, get("budget"), get("message"));
  await sendSms({ to: normalisePhone(get("phone")), message: `Thanks ${get("name").split(" ")[0]}! We've received your trip request and will call you within 24 hours. - ${company.name}` });
  return { ok: true, name: get("name").split(" ")[0] };
}
