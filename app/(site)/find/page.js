import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { normalisePhone } from "@/lib/format";
import { rateLimit, HOUR } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export const metadata = { title: "Find my booking" };

async function find(formData) {
  "use server";
  if (!rateLimit(`find:${await clientIp()}`, 10, HOUR)) redirect("/find?busy=1");
  const ref = String(formData.get("ref") || "").trim().toUpperCase().slice(0, 20);
  const phone = normalisePhone(String(formData.get("phone") || "").slice(0, 30));
  const row = db.prepare(`SELECT b.ref, b.access_token FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.ref = ? AND c.phone = ?`).get(ref, phone);
  redirect(row ? `/booking/${row.ref}?k=${row.access_token}` : "/find?notfound=1");
}

export default async function FindPage({ searchParams }) {
  const { notfound, busy, error } = await searchParams;
  return (
    <main className="page container" style={{ maxWidth: 480 }}>
      <h1>Find my booking</h1>
      <p className="muted">Check your trip details, see your balance, or pay an instalment.</p>
      {notfound && <div className="alert alert-error">We couldn't find a booking with those details.</div>}
      {busy && <div className="alert alert-error">Too many attempts. Please wait a while or call us.</div>}
      {error && <div className="alert alert-error">We couldn't confirm your payment automatically. If money left your account, call us with your booking reference.</div>}
      <form action={find} className="card card-pad">
        <div className="field"><label htmlFor="ref">Booking reference</label><input id="ref" name="ref" placeholder="TF-XXXXXX" required maxLength={20} /></div>
        <div className="field"><label htmlFor="phone">Phone number used to book</label><input id="phone" name="phone" required maxLength={30} inputMode="tel" /></div>
        <button className="btn btn-block">Find booking</button>
      </form>
    </main>
  );
}
