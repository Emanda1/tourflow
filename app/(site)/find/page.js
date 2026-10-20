import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { normalisePhone } from "@/lib/format";

export const metadata = { title: "Find my booking" };

async function find(formData) {
  "use server";
  const ref = String(formData.get("ref") || "").trim().toUpperCase();
  const phone = normalisePhone(formData.get("phone"));
  const row = db.prepare(`SELECT b.ref FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.ref = ? AND c.phone = ?`).get(ref, phone);
  redirect(row ? `/booking/${row.ref}` : "/find?notfound=1");
}

export default async function FindPage({ searchParams }) {
  const { notfound } = await searchParams;
  return (
    <main className="page container" style={{ maxWidth: 480 }}>
      <h1>Find my booking</h1>
      <p className="muted">Check your trip details, see your balance, or pay an instalment.</p>
      {notfound && <div className="alert alert-error">We couldn't find a booking with those details.</div>}
      <form action={find} className="card card-pad">
        <div className="field"><label htmlFor="ref">Booking reference</label><input id="ref" name="ref" placeholder="TF-XXXXXX" required /></div>
        <div className="field"><label htmlFor="phone">Phone number used to book</label><input id="phone" name="phone" required /></div>
        <button className="btn btn-block">Find booking</button>
      </form>
    </main>
  );
}
