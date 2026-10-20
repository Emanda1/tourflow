import Link from "next/link";
import { db } from "@/lib/db";

const COLORS = ["#0f766e", "#b45309", "#7c3aed", "#be185d", "#1d4ed8", "#15803d", "#c2410c", "#0e7490"];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function CalendarPage({ searchParams }) {
  const { m } = await searchParams;
  const now = new Date();
  const [y, mo] = (m && /^\d{4}-\d{2}$/.test(m) ? m : iso(now).slice(0, 7)).split("-").map(Number);
  const first = new Date(y, mo - 1, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // Monday start
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const rangeStart = iso(days[0]), rangeEnd = iso(days[41]);

  const deps = db.prepare(`SELECT d.id, d.tour_id, d.start_date, COALESCE(d.end_date, d.start_date) AS end_date, d.capacity, d.status, t.title,
      COALESCE((SELECT SUM(b.travellers) FROM bookings b WHERE b.departure_id = d.id AND b.status != 'cancelled'), 0) AS booked
    FROM departures d JOIN tours t ON t.id = d.tour_id
    WHERE d.status != 'cancelled' AND d.start_date <= ? AND COALESCE(d.end_date, d.start_date) >= ? ORDER BY d.start_date`).all(rangeEnd, rangeStart);

  const prev = new Date(y, mo - 2, 1), next = new Date(y, mo, 1);
  const today = iso(now);
  const monthName = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const inMonth = deps.filter((d) => d.start_date.slice(0, 7) === `${y}-${String(mo).padStart(2, "0")}`);

  return (
    <div className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>{monthName}</h1>
        <div className="row">
          <Link className="btn btn-secondary btn-sm" href={`/admin/calendar?m=${iso(prev).slice(0, 7)}`}>← Prev</Link>
          <Link className="btn btn-secondary btn-sm" href="/admin/calendar">Today</Link>
          <Link className="btn btn-secondary btn-sm" href={`/admin/calendar?m=${iso(next).slice(0, 7)}`}>Next →</Link>
        </div>
      </div>
      <p className="muted" style={{ margin: 0 }}>{inMonth.length} trip{inMonth.length === 1 ? "" : "s"} starting this month · {inMonth.reduce((s, d) => s + d.booked, 0)} travellers booked. Click a trip to open its manifest.</p>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="cal">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="cal-h">{d}</div>)}
          {days.map((day) => {
            const key = iso(day);
            const evs = deps.filter((d) => d.start_date <= key && d.end_date >= key);
            return (
              <div key={key} className={`cal-d ${day.getMonth() !== mo - 1 ? "other" : ""} ${key === today ? "today" : ""}`}>
                <span className="cal-num">{day.getDate()}</span>
                {evs.map((e) => (
                  <Link key={e.id} href={`/admin/departures/${e.id}`} className={`cal-ev ${e.start_date !== key ? "cont" : ""}`}
                    style={{ background: COLORS[e.tour_id % COLORS.length] }}
                    title={`${e.title}\n${e.booked}/${e.capacity} seats booked · ${e.status}`}>
                    {e.start_date === key || day.getDay() === 1 ? `${e.title} · ${e.booked}/${e.capacity}` : " "}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
