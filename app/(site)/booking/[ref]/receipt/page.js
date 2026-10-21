import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getBookingForCustomer } from "@/lib/access";
import { money, date, dateRange, statusLabel } from "@/lib/format";
import { company } from "@/lib/config";
import PrintButton from "@/components/PrintButton";
import { bookingLines } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipt", robots: { index: false } };

export default async function Receipt({ params, searchParams }) {
  const { ref } = await params;
  const { k } = await searchParams;
  const b = getBookingForCustomer(ref, k);
  if (!b) notFound();
  const travellers = db.prepare("SELECT name FROM travellers WHERE booking_id = ? ORDER BY id").all(b.id);
  const payments = db.prepare("SELECT created_at, method, amount, kind, reference FROM payments WHERE booking_id = ? AND status = 'success' ORDER BY created_at").all(b.id);
  return (
    <main className="page container" style={{ maxWidth: 720 }}>
      <div className="card card-pad receipt">
        <div className="spread">
          <div>
            {company.logo ? <img src={company.logo} alt={company.name} style={{ maxHeight: 48 }} /> : <strong style={{ fontSize: "1.3rem" }}>{company.name}</strong>}
            <div className="small muted">{company.address}{company.address ? " · " : ""}{company.phone} · {company.email}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted small">RECEIPT</div>
            <strong>{b.ref}</strong>
            <div className="small muted">Issued {date(new Date().toISOString())}</div>
          </div>
        </div>
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "20px 0" }} />
        <dl className="kv">
          <dt>Customer</dt><dd>{b.customer_name} · {b.customer_phone}</dd>
          <dt>Trip</dt><dd>{b.tour_title}</dd>
          <dt>Dates</dt><dd>{dateRange(b.start_date, b.end_date)}</dd>
          <dt>Travellers</dt><dd>{travellers.map((t) => t.name).join(", ")}</dd>
          <dt>Status</dt><dd>{statusLabel(b.status)}</dd>
        </dl>
        <table style={{ marginTop: 20 }}>
          <thead><tr><th>Date</th><th>Description</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {bookingLines(b).map((l, i) => (
              <tr key={`l${i}`}><td>{i === 0 ? date(b.created_at) : ""}</td><td>{l.qty} × {l.extra ? l.label : `${b.tour_title}${l.label !== "Per person" ? ` (${l.label})` : ""}`} @ {money(l.unit)}</td><td className="num">{money(l.total)}</td></tr>
            ))}
            {payments.map((p, i) => (
              <tr key={i}><td>{date(p.created_at)}</td><td>{p.kind === "refund" ? "Refund" : `Payment (${p.method})`}{p.reference ? <div className="small muted">Ref {p.reference}</div> : null}</td><td className="num">{p.kind === "refund" ? "" : "−"}{money(p.amount)}</td></tr>
            ))}
            <tr><td></td><td><strong>Balance due</strong></td><td className="num"><strong>{money(b.balance)}</strong></td></tr>
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: 20 }}>{company.cancellationPolicy}</p>
      </div>
      <div className="row no-print" style={{ marginTop: 16 }}><PrintButton label="Print or save as PDF" /><a className="btn btn-secondary btn-sm" href={`/booking/${b.ref}?k=${b.access_token}`}>Back to booking</a></div>
    </main>
  );
}
