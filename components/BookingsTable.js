"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const fmt = (p) => "GH₵ " + (p / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const d = (iso) => new Date(iso.length === 10 ? iso + "T00:00:00" : iso.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const TABS = [
  ["all", "All"], ["pending", "Awaiting payment"], ["owing", "Balance due"], ["paid", "Fully paid"], ["upcoming", "Upcoming trips"], ["cancelled", "Cancelled"],
];
const COLS = [
  ["ref", "Ref"], ["customer_name", "Customer"], ["start_date", "Trip"], ["travellers", "Pax"],
  ["status", "Status"], ["total", "Total"], ["balance", "Balance"], ["created_at", "Booked"],
];

export default function BookingsTable({ bookings, initialQuery = "", initialTab = "all" }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [tab, setTab] = useState(initialTab);
  const [sort, setSort] = useState({ key: "created_at", dir: -1 });
  const today = new Date().toISOString().slice(0, 10);

  const match = (b, t) => {
    switch (t) {
      case "pending": return b.status === "pending";
      case "owing": return b.status !== "cancelled" && b.balance > 0;
      case "paid": return b.status !== "cancelled" && b.balance === 0;
      case "upcoming": return b.status !== "cancelled" && b.start_date >= today;
      case "cancelled": return b.status === "cancelled";
      default: return true;
    }
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return bookings
      .filter((b) => match(b, tab))
      .filter((b) => !needle || [b.ref, b.customer_name, b.customer_phone, b.tour_title].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, q, tab, sort]);

  const totals = rows.reduce((s, b) => ({ total: s.total + (b.status === "cancelled" ? 0 : b.total), balance: s.balance + (b.status === "cancelled" ? 0 : b.balance) }), { total: 0, balance: 0 });
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));

  return (
    <div className="card">
      <div className="tabs" role="tablist" style={{ padding: "0 12px" }}>
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {label}<span className="n">{bookings.filter((b) => match(b, k)).length}</span>
          </button>
        ))}
      </div>
      <div className="table-toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, name, phone or tour…" aria-label="Search bookings" />
        <span className="small muted">{rows.length} booking{rows.length === 1 ? "" : "s"} · {fmt(totals.total)} value · <strong>{fmt(totals.balance)}</strong> owed</span>
      </div>
      <div className="table-wrap"><table>
        <thead><tr>
          {COLS.map(([k, label]) => (
            <th key={k} className={`sortable ${["total", "balance"].includes(k) ? "num" : ""}`} onClick={() => toggleSort(k)} aria-sort={sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
              {label} {sort.key === k ? (sort.dir > 0 ? "▲" : "▼") : ""}
            </th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="clickable" onClick={() => router.push(`/admin/bookings/${b.id}`)}>
              <td><a href={`/admin/bookings/${b.id}`} onClick={(e) => e.stopPropagation()}><strong>{b.ref}</strong></a></td>
              <td>{b.customer_name}<div className="small muted">{b.customer_phone}</div></td>
              <td>{b.tour_title}<div className="small muted">{d(b.start_date)}</div></td>
              <td>{b.travellers}</td>
              <td><span className={`badge badge-${b.status}`}>{b.status}</span> <span className={`badge badge-${b.payment_status}`}>{b.payment_status}</span></td>
              <td className="num">{fmt(b.total)}</td>
              <td className="num">{b.balance > 0 ? <strong>{fmt(b.balance)}</strong> : "—"}</td>
              <td className="small muted">{d(b.created_at)}<br />{b.source}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="muted">No bookings match.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
