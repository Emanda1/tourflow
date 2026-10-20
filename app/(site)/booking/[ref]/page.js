import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getBookingForCustomer } from "@/lib/access";
import { amountDueNow } from "@/lib/bookings";
import { money, date, dateRange } from "@/lib/format";
import Toast from "@/components/Toast";
import { company, onlinePaymentsAvailable } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your booking", robots: { index: false } };

export default async function BookingPage({ params, searchParams }) {
  const { ref } = await params;
  const sp = await searchParams;
  const b = getBookingForCustomer(ref, sp.k);
  if (!b) notFound();
  const travellers = db.prepare("SELECT * FROM travellers WHERE booking_id = ? ORDER BY id").all(b.id);
  const payments = db.prepare("SELECT created_at, method, amount, kind FROM payments WHERE booking_id = ? AND status = 'success' ORDER BY created_at").all(b.id);
  const dueNow = amountDueNow(b);

  return (
    <main className="page container">
      <Toast message={sp.paid ? `Payment received. Confirmation sent to ${b.customer_phone}` : null} />
      {sp.paid && b.status === "confirmed" && (
        <div className="card card-pad success-card" style={{ marginBottom: 24 }}>
          <div className="success-icon">✓</div>
          <h2 style={{ margin: 0 }}>You're going to {b.tour_title}!</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>Save your reference <strong>{b.ref}</strong>. We'll SMS pickup details before the trip.</p>
        </div>
      )}
      {sp.failed && <div className="alert alert-error">That payment did not go through. You can try again below.</div>}
      {sp.error === "busy" && <div className="alert alert-error">Too many payment attempts. Please wait a few minutes and try again.</div>}
      {sp.error && sp.error !== "busy" && <div className="alert alert-error">We couldn't start the payment. Please try again in a moment, or call {company.phone}.</div>}
      {b.status === "cancelled" && <div className="alert alert-error">This booking was cancelled{b.cancel_reason ? `: ${b.cancel_reason}` : ""}. Call {company.phone} if you think this is a mistake.</div>}
      {b.status === "pending" && b.source === "website" && b.paid <= 0 && <div className="alert alert-info">Your seats are held for a short time. Complete payment to secure them.</div>}

      <div className="spread">
        <div>
          <p className="muted" style={{ margin: 0 }}>Booking reference</p>
          <h1 style={{ margin: 0 }}>{b.ref}</h1>
        </div>
        <div className="row">
          <span className={`badge badge-${b.status}`}>{b.status === "pending" ? "Awaiting payment" : b.status}</span>
          <span className={`badge badge-${b.payment_status}`}>{b.payment_status === "partial" ? "Part paid" : b.payment_status}</span>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 24 }}>
        <div className="stack">
          <section className="card card-pad">
            <h2>{b.tour_title}</h2>
            <dl className="kv">
              <dt>Dates</dt><dd>{dateRange(b.start_date, b.end_date)}</dd>
              <dt>Pickup</dt><dd>{b.pickup_point || "We'll confirm by SMS"}{b.pickup_time ? `, ${b.pickup_time}` : ""}</dd>
              <dt>Lead contact</dt><dd>{b.customer_name} · {b.customer_phone}</dd>
              <dt>Travellers</dt><dd>{travellers.map((t) => t.name).join(", ")}</dd>
            </dl>
          </section>
          <section className="card card-pad">
            <h3>Payments</h3>
            {payments.length === 0 ? <p className="muted">No payments yet.</p> : (
              <table><tbody>
                {payments.map((p, i) => (
                  <tr key={i}><td>{date(p.created_at)}</td><td>{p.kind === "refund" ? "REFUND" : p.method.toUpperCase()}</td><td className="num">{p.kind === "refund" ? "−" : ""}{money(p.amount)}</td></tr>
                ))}
              </tbody></table>
            )}
          </section>
        </div>

        <aside className="card card-pad">
          <dl className="kv" style={{ marginBottom: 16 }}>
            <dt>Total</dt><dd className="num">{money(b.total)}</dd>
            <dt>Paid</dt><dd className="num">{money(b.paid)}</dd>
            <dt>Balance</dt><dd className="num"><strong>{money(b.balance)}</strong></dd>
          </dl>
          {b.status !== "cancelled" && b.balance > 0 && !onlinePaymentsAvailable && (
            <p className="alert alert-info" style={{ margin: 0 }}>To pay, call {company.phone} or visit our office with your reference {b.ref}.</p>
          )}
          {b.status !== "cancelled" && b.balance > 0 && onlinePaymentsAvailable && (
            <form action="/api/pay/start" method="get">
              <input type="hidden" name="ref" value={b.ref} />
              <input type="hidden" name="k" value={b.access_token} />
              <div className="field">
                <label htmlFor="cedis">Amount to pay now (GH₵)</label>
                <input id="cedis" name="cedis" type="number" step="0.01" min="1" max={b.balance / 100} defaultValue={(dueNow / 100).toFixed(2)} />
                <p className="small muted" style={{ marginTop: 6 }}>
                  {b.paid < b.depositDue ? `Pay at least ${money(b.depositDue - b.paid)} to confirm your seats. ` : ""}
                  You can pay the balance in instalments any time before the trip.
                </p>
              </div>
              <button className="btn btn-block">Pay with MoMo or card</button>
            </form>
          )}
          {b.balance <= 0 && <p className="alert alert-ok" style={{ margin: 0 }}>Fully paid. See you on the trip!</p>}
          {b.paid > 0 && <Link className="btn btn-secondary btn-block" style={{ marginTop: 12 }} href={`/booking/${b.ref}/receipt?k=${b.access_token}`}>View / print receipt</Link>}
          <p className="small muted" style={{ marginTop: 16 }}>Questions? Call {company.phone}</p>
          <details className="small muted"><summary>Cancellation policy</summary><p style={{ marginTop: 8 }}>{company.cancellationPolicy}</p></details>
        </aside>
      </div>
      <p style={{ marginTop: 20 }}><Link href="/">← Browse more tours</Link></p>
    </main>
  );
}
