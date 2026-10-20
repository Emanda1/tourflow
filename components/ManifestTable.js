"use client";
import { useState, useTransition } from "react";
import { setCheckIn } from "@/app/admin/actions";

const fmt = (p) => "GH₵ " + (p / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ManifestTable({ travellers, canCheckIn = false, showMoney = false, canOpenBookings = false }) {
  const [rows, setRows] = useState(travellers);
  const [q, setQ] = useState("");
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [, startTransition] = useTransition();
  const done = rows.filter((r) => r.checked_in).length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;

  function toggle(id) {
    const row = rows.find((r) => r.id === id);
    const next = !row.checked_in;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, checked_in: next } : r)));
    startTransition(async () => {
      try { await setCheckIn(id, next); }
      catch { setRows((rs) => rs.map((r) => (r.id === id ? { ...r, checked_in: !next } : r))); }
    });
  }

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!onlyWaiting || !r.checked_in) && (!needle || [r.name, r.phone, r.ref, r.contact_name].join(" ").toLowerCase().includes(needle)));

  return (
    <>
      <div className="table-toolbar no-print">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a traveller…" aria-label="Find traveller" />
        <label className="inline-check small"><input type="checkbox" checked={onlyWaiting} onChange={(e) => setOnlyWaiting(e.target.checked)} /> Not yet on board</label>
        <div className="row" style={{ minWidth: 200 }}>
          <div className="meter" style={{ width: 120 }}><span style={{ width: `${pct}%`, transition: "width .3s" }} /></div>
          <strong className="small progress-ring">{done}/{rows.length} on board</strong>
        </div>
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>#</th><th>Traveller</th><th>Phone</th><th>Booking</th><th>Lead contact</th>{showMoney && <th>Balance</th>}<th>Check-in</th></tr></thead>
        <tbody>
          {shown.map((t, i) => (
            <tr key={t.id} className={t.checked_in ? "checked-row" : ""}>
              <td>{i + 1}</td>
              <td><strong>{t.name}</strong></td>
              <td>{t.phone ? <a href={`tel:${t.phone}`}>{t.phone}</a> : "—"}</td>
              <td>{canOpenBookings ? <a href={`/admin/bookings/${t.booking_id}`}>{t.ref}</a> : t.ref} {t.status === "pending" && <span className="badge badge-pending">pending</span>}</td>
              <td>{t.contact_name}<div className="small muted">{t.contact_phone}</div></td>
              {showMoney && <td>{t.balance > 0 ? <span className="badge badge-partial">{fmt(t.balance)}</span> : <span className="badge badge-paid">Paid</span>}</td>}
              <td>
                {!canCheckIn ? (t.checked_in ? "✓ On board" : "—") : <button type="button" onClick={() => toggle(t.id)} className={`btn btn-sm ${t.checked_in ? "" : "btn-secondary"}`} aria-pressed={!!t.checked_in}>
                  {t.checked_in ? "✓ On board" : "Check in"}
                </button>}
              </td>
            </tr>
          ))}
          {shown.length === 0 && <tr><td colSpan={7} className="muted">{rows.length ? "No one matches." : "No travellers yet."}</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
