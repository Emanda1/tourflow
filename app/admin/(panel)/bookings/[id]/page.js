import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db, getBooking } from "@/lib/db";
import { money, date, dateRange, statusLabel, paymentLabel } from "@/lib/format";
import Toast from "@/components/Toast";
import { bookingLines } from "@/lib/pricing";
import { addPayment, addRefund, setBookingStatus, sendReminder } from "../../../actions";

export default async function BookingDetail({ params, searchParams }) {
  const user = await requireUser("bookings.view");
  const { id } = await params;
  const sp = await searchParams;
  const b = getBooking(Number(id));
  if (!b) notFound();
  const travellers = db.prepare("SELECT * FROM travellers WHERE booking_id = ? ORDER BY id").all(b.id);
  const priceLines = bookingLines(b);
  const mixedTypes = new Set(travellers.map((t) => t.price_type || "")).size > 1;
  const payments = db.prepare("SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC").all(b.id);
  const messages = db.prepare("SELECT * FROM notifications WHERE booking_id = ? ORDER BY id DESC").all(b.id);

  return (
    <div className="stack">
      <Link href="/admin/bookings" className="small">← All bookings</Link>
      <Toast message={sp.created ? "Booking created" : sp.paid ? (process.env.ARKESEL_API_KEY ? "Payment recorded. Customer notified by SMS" : "Payment recorded") : sp.reminded ? (process.env.ARKESEL_API_KEY ? "Reminder sent" : "Reminder logged (SMS is not set up yet)") : sp.refunded ? "Refund recorded" : null} />
      {sp.error && <div className="alert alert-error" role="alert">{String(sp.error).slice(0, 200)}</div>}
      {b.status === "cancelled" && b.cancel_reason && <div className="alert alert-info">Cancelled: {b.cancel_reason}</div>}
      <div className="spread">
        <div>
          <h1 style={{ margin: 0 }}>{b.ref}</h1>
          <span className="muted">{b.tour_title} · {dateRange(b.start_date, b.end_date)}</span>
        </div>
        <div className="row">
          <span className={`badge badge-${b.status}`}>{statusLabel(b.status)}</span>
          <span className={`badge badge-${b.payment_status}`}>{paymentLabel(b.payment_status)}</span>
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
            <ol style={{ margin: 0, paddingLeft: 20 }}>{travellers.map((t) => <li key={t.id}>{t.name}{mixedTypes ? <span className="badge" style={{ marginLeft: 6 }}>{t.price_type}</span> : null}{t.phone ? ` · ${t.phone}` : ""}</li>)}</ol>
          </section>
          <section className="card">
            <div className="card-pad"><h3 style={{ margin: 0 }}>Payments</h3></div>
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Reference / note</th><th>By</th><th>Status</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}><td>{date(p.created_at)}</td><td>{p.kind === "refund" ? <span className="badge badge-cancelled">Refund</span> : "Payment"}</td><td>{p.method}</td>
                    <td className="small">{[p.reference, p.note].filter(Boolean).join(" · ") || "—"}</td><td className="small">{p.recorded_by || (p.reference ? "Online" : "—")}</td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td><td className="num">{p.kind === "refund" ? "−" : ""}{money(p.amount)}</td></tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={7} className="muted">No payments yet.</td></tr>}
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
            <div className="price-box" style={{ marginTop: 0 }}>
              {priceLines.map((l, i) => <div key={i} className="spread small"><span>{l.qty} × {l.label} @ {money(l.unit)}</span><span>{money(l.total)}</span></div>)}
            </div>
            <dl className="kv">
              <dt>Total</dt><dd className="num">{money(b.total)}</dd>
              <dt>Paid</dt><dd className="num">{money(b.paid)}</dd>
              <dt>Balance</dt><dd className="num"><strong>{money(b.balance)}</strong></dd>
              <dt>Deposit</dt><dd className="num">{money(b.depositDue)}</dd>
              {b.refunded > 0 && <><dt>Refunded</dt><dd className="num">{money(b.refunded)}</dd></>}
            </dl>
          </section>
          {can(user, "payments.record") && b.status !== "cancelled" && b.balance > 0 && (
            <form action={addPayment} className="card card-pad">
              <h3>Record a payment</h3>
              <input type="hidden" name="booking_id" value={b.id} />
              <div className="field"><label htmlFor="pay-amount">Amount (GH₵)</label><input id="pay-amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={(b.balance / 100).toFixed(2)} required /></div>
              <div className="field"><label htmlFor="pay-method">Method</label>
                <select id="pay-method" name="method"><option value="momo">Mobile money</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option></select>
              </div>
              <div className="field"><label htmlFor="pay-note">Note / MoMo transaction ID</label><input id="pay-note" name="note" maxLength={200} /></div>
              <button className="btn btn-block">Save payment</button>
            </form>
          )}
          {can(user, "payments.refund") && b.paid > 0 && (
            <details className="card card-pad">
              <summary><strong>Record a refund</strong></summary>
              <form action={addRefund} style={{ marginTop: 12 }}>
                <input type="hidden" name="booking_id" value={b.id} />
                <div className="field"><label htmlFor="ref-amount">Amount refunded (GH₵)</label><input id="ref-amount" name="amount" type="number" step="0.01" min="0.01" max={b.paid / 100} required /></div>
                <div className="field"><label htmlFor="ref-method">Paid back by</label>
                  <select id="ref-method" name="method"><option value="momo">Mobile money</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card (via Paystack)</option></select>
                </div>
                <div className="field"><label htmlFor="ref-note">Reason</label><input id="ref-note" name="note" required maxLength={200} placeholder="e.g. Cancelled 3 weeks before trip" /></div>
                <p className="small muted">This records the refund in the system. Send the money itself through MoMo, the bank or the Paystack dashboard.</p>
                <button className="btn btn-danger btn-block">Save refund</button>
              </form>
            </details>
          )}
          <section className="card card-pad stack">
            <h3 style={{ margin: 0 }}>Actions</h3>
            <Link className="btn btn-secondary btn-block" href={`/booking/${b.ref}?k=${b.access_token}`} target="_blank">Customer's booking page ↗</Link>
            {can(user, "bookings.edit") && b.balance > 0 && b.status !== "cancelled" && (
              <form action={sendReminder}><input type="hidden" name="booking_id" value={b.id} /><button className="btn btn-secondary btn-block">Send balance reminder (SMS)</button></form>
            )}
            {can(user, "bookings.edit") && b.status === "pending" && (
              <form action={setBookingStatus}><input type="hidden" name="booking_id" value={b.id} /><input type="hidden" name="status" value="confirmed" /><button className="btn btn-secondary btn-block">Confirm without payment</button></form>
            )}
            {can(user, "bookings.edit") && (b.status !== "cancelled" ? (
              <details>
                <summary className="btn btn-danger btn-block">Cancel booking…</summary>
                <form action={setBookingStatus} style={{ marginTop: 10 }}>
                  <input type="hidden" name="booking_id" value={b.id} /><input type="hidden" name="status" value="cancelled" />
                  <div className="field"><label htmlFor="cancel-reason">Reason</label><input id="cancel-reason" name="reason" maxLength={200} placeholder="e.g. Customer changed plans" /></div>
                  <button className="btn btn-danger btn-block">Yes, cancel and free the seats</button>
                </form>
              </details>
            ) : (
              <form action={setBookingStatus}><input type="hidden" name="booking_id" value={b.id} /><input type="hidden" name="status" value="pending" /><button className="btn btn-secondary btn-block">Restore booking</button></form>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
