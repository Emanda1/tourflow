import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db, getBooking } from "@/lib/db";
import { completePayment } from "@/lib/checkout";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment" };

async function approve(formData) {
  "use server";
  const result = await completePayment(String(formData.get("reference")), { demo: true });
  redirect(`/booking/${result.booking.ref}?paid=1`);
}

export default async function DemoPay({ params }) {
  const { reference } = await params;
  const payment = db.prepare("SELECT * FROM payments WHERE reference = ?").get(reference);
  if (!payment) notFound();
  const booking = getBooking(payment.booking_id);
  if (payment.status === "success") redirect(`/booking/${booking.ref}`);

  return (
    <main className="page container" style={{ maxWidth: 520 }}>
      <div className="alert alert-info small">
        <strong>Demo mode.</strong> No real money moves. Add your Paystack secret key in <code>.env.local</code> to take real MoMo and card payments.
      </div>
      <form action={approve} className="card card-pad">
        <input type="hidden" name="reference" value={reference} />
        <p className="muted small" style={{ marginBottom: 4 }}>Paying for {booking.tour_title} · {booking.ref}</p>
        <div className="price" style={{ fontSize: "2rem", marginBottom: 16 }}>{money(payment.amount)}</div>
        <div className="field">
          <label htmlFor="network">Mobile money network</label>
          <select id="network" name="network">
            <option>MTN Mobile Money</option>
            <option>Telecel Cash</option>
            <option>AirtelTigo Money</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="momo">MoMo number</label>
          <input id="momo" name="momo" defaultValue={booking.customer_phone} />
        </div>
        <button className="btn btn-block">Approve payment</button>
        <p className="small muted" style={{ textAlign: "center", marginTop: 12 }}>
          <Link href={`/booking/${booking.ref}`}>Cancel and pay later</Link>
        </p>
      </form>
    </main>
  );
}
