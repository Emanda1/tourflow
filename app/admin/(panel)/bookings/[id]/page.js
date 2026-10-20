import { notFound } from "next/navigation";
import Link from "next/link";
import { db, getBooking } from "@/lib/db";
import { money, date, dateRange } from "@/lib/format";
import Toast from "@/components/Toast";
import { addPayment, setBookingStatus, sendReminder } from "../../../actions";

export default async function BookingDetail({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const b = getBooking(Number(id));
  if (!b) notFound();
  const travellers = db.prepare("SELECT * FROM travellers WHERE booking_id = ?").all(b.id);
  const payments = db.prepare("SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC").all(b.id);
  const messages = db.prepare("SELECT * FROM notifications WHERE booking_id = ? ORDER BY id DESC").all(b.id);

  return (
    <div className="stack">
      <Link href="/admin/bookings" className="small">← All bookings</Link>
      <Toast message={sp.created ? "Booking created" : sp.paid ? "Payment recorded and customer notified" : sp.reminded ? "Reminder sent" : null} />
      <div className="spread">
        <div>
          <h1 style={{ margin: 0 }}>{b.ref}</h1>
          <span className="muted">{b.tour_title} · {dateRange(b.start_date, b.end_date)}</span>
        </div>
        <div className="row">
          <span className={`badge badge-${b.status}`}>{b.status}</span>
          <span className={`badge badge-${b.payment_status}`}>{b.payment_status}</span>
        </div>
      </div>

      <div className="two-col">
        <div className="stack">
          <section className="card card-pad">
            <h3>Customer</h3>
            <dl className="kv">
              <dt>Name</dt><dd>{b.customer_name}</dd>
              <dt>Phone</dt><dd><a href={`tel:${b.customer_phone}`}>{b.customer_phone}</a> · <a href={`https://wa.me/${b.customer_phone.replace(/\D/g, "")}`} target="_blank">WhatsApp</a></dd>
              <dt>Email</dt><dd>{b.customer_email || "—"}</dd>
              <dt>Source</dt><dd>{b.source}</dd>
              <dt>Plan</dt><dd>{b.payment_plan === "deposit" ? `Deposit (${b.deposit_percent}%) + instalments` : "Pay in full"}</dd>
              {b.notes && <><dt>Notes</dt><dd>{b.notes}</dd></>}
            </dl>
          </section>
          <section className="card card-pad">
            <h3>Travellers ({travellers.length})</h3>
            <ol style={{ margin: 0, paddingLeft: 20 }}>{travellers.map((t) => <li key={t.id}>{t.name}{t.phone ? ` · ${t.phone}` : ""}</li>)}</ol>
          </section>
          <section className="card">
            <div className="card-pad"><h3 style={{ margin: 0 }}>Payments</h3></div>
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Status</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}><td>{date(p.created_at)}</td><td>{p.method}</td><td className="small">{p.reference || p.note || "—"}</td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td><td className="num">{money(p.amount)}</td></tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={5} className="muted">No payments yet.</td></tr>}
              </tbody>
            </table></div>
          </section>
          <section className="card card-pad">
            <h3>Messages sent</h3>
            {messages.length === 0 ? <p className="muted">None yet.</p> : messages.map((m) => (
              <p key={m.id} className="small"><span className={`badge badge-${m.status}`}>{m.status}</span> {date(m.created_at)}: {m.message}</p>
            ))}
          </section>
        </div>

        <aside className="stack">
          <section className="card card-pad">
            <dl className="kv">
              <dt>Total</dt><dd className="num">{money(b.total)}</dd>
              <dt>Paid</dt><dd className="num">{money(b.paid)}</dd>
              <dt>Balance</dt><dd className="num"><strong>{money(b.balance)}</strong></dd>
              <dt>Deposit</dt><dd className="num">{money(b.depositDue)}</dd>
            </dl>
          </section>
          {b.status !== "cancelled" && b.balance > 0 && (
            <form action={addPayment} className="card card-pad">
              <h3>Record a payment</h3>
              <input type="hidden" name="booking_id" value={b.id} />
              <div className="field"><label>Amount (GH₵)</label><input name="amount" type="number" step="0.01" min="0.01" defaultValue={(b.balance / 100).toFixed(2)} required /></div>
              <div className="field"><label>Method</label>
                <select name="method"><option value="momo">Mobile money</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option></select>
              </div>
              <div className="field"><label>Note / transaction ID</label><input name="note" /></div>
              <button className="btn btn-block">Save payment</button>
            </form>
          )}
          <section className="card card-pad stack">
            <h3 style={{ margin: 0 }}>Actions</h3>
            {b.balance > 0 && b.status !== "cancelled" && (
              <form action={sendReminder}><input type="hidden" name="booking_id" value={b.id} /><button className="btn btn-secondary btn-block">Send balance reminder (SMS)</button></form>
            )}
            <Link className="btn btn-secondary btn-block" href={`/booking/${b.ref}`} target="_blank">Customer's booking page ↗</Link>
            {b.status === "pending" && (
              <form action={setBookingStatus}><input type="hidden" name="booking_id" value={b.id} /><input type="hidden" name="status" value="confirmed" /><button className="btn btn-secondary btn-block">Confirm without payment</button></form>
            )}
            {b.status !== "cancelled" ? (
              <form action={setBookingStatus}><input type="hidden" name="booking_id" value={b.id} /><input type="hidden" name="status" value="cancelled" /><button className="btn btn-danger btn-block">Cancel booking & free seats</button></form>
            ) : (
              <form action={setBookingStatus}><input type="hidden" name="booking_id" value={b.id} /><input type="hidden" name="status" value="pending" /><button className="btn btn-secondary btn-block">Restore booking</button></form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
