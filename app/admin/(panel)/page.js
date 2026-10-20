import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import Link from "next/link";
import { db, listDepartures, listBookings, NET_AMOUNT } from "@/lib/db";
import { money, date, dateRange } from "@/lib/format";
import RevenueChart from "@/components/RevenueChart";

export default async function Dashboard() {
  const user = await requireUser("dashboard.view");
  const finance = can(user, "finance.view");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayTrips = listDepartures().filter((d) => d.status !== "cancelled" && d.start_date <= todayIso && (d.end_date || d.start_date) >= todayIso);
  const newToday = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE status != 'cancelled' AND date(created_at) = date('now')").get().n;
  // Money that arrived after a cancellation and hasn't been refunded yet.
  const lateCount = db.prepare(`SELECT COUNT(*) AS n FROM bookings b WHERE b.status = 'cancelled' AND b.cancel_reason LIKE 'PAID %'
    AND COALESCE((SELECT SUM(CASE WHEN p.kind = 'refund' THEN -p.amount ELSE p.amount END) FROM payments p WHERE p.booking_id = b.id AND p.status = 'success'), 0) > 0`).get().n;
  const revenue = db.prepare(`SELECT
      COALESCE(SUM(${NET_AMOUNT}),0) AS total,
      COALESCE(SUM(CASE WHEN p.created_at >= date('now','start of month') THEN ${NET_AMOUNT} END),0) AS month
    FROM payments p WHERE p.status = 'success'`).get();
  const bookings = listBookings();
  const active = bookings.filter((b) => b.status !== "cancelled");
  const outstanding = active.reduce((s, b) => s + b.balance, 0);
  const travellers = active.filter((b) => b.start_date >= new Date().toISOString().slice(0, 10)).reduce((s, b) => s + b.travellers, 0);
  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = listDepartures({ upcomingOnly: true }).filter((d) => d.status !== "cancelled").slice(0, 6);
  const byTour = db.prepare(`SELECT t.id, t.title, COALESCE(SUM(${NET_AMOUNT}),0) AS revenue
    FROM tours t LEFT JOIN departures d ON d.tour_id = t.id LEFT JOIN bookings b ON b.departure_id = d.id
    LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'success'
    GROUP BY t.id ORDER BY revenue DESC`).all();
  const maxRev = Math.max(1, ...byTour.map((t) => t.revenue));
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const key = d.toISOString().slice(0, 7);
    const row = db.prepare(`SELECT
        COALESCE((SELECT SUM(${NET_AMOUNT}) FROM payments p WHERE p.status = 'success' AND substr(p.created_at,1,7) = ?), 0) AS revenue,
        (SELECT COUNT(*) FROM bookings WHERE status != 'cancelled' AND substr(created_at,1,7) = ?) AS bookings`).get(key, key);
    return { key, label: d.toLocaleDateString("en-GB", { month: "short" }), year: d.getFullYear(), ...row };
  });
  const withBalance = active.filter((b) => b.balance > 0).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 6);

  return (
    <div className="stack">
      <section className="greet">
        <h1>{greeting}, {user.name.split(" ")[0]} 👋</h1>
        <p>{todayTrips.length ? `${todayTrips.length} trip${todayTrips.length > 1 ? "s" : ""} on the road today.` : "No trips on the road today."}
          {newToday ? ` ${newToday} new booking${newToday > 1 ? "s" : ""} so far today.` : ""}</p>
        <div className="quick">
          {can(user, "bookings.edit") && <Link href="/admin/bookings/new">+ New booking</Link>}
          {can(user, "trips.view") && <Link href="/admin/calendar">📅 Calendar</Link>}
          {can(user, "enquiries.manage") && <Link href="/admin/enquiries">💬 Trip requests</Link>}
          {can(user, "data.export") && <a href="/admin/export/bookings">⬇ Export bookings</a>}
          <Link href="/" target="_blank">🌍 View website</Link>
        </div>
      </section>

      {todayTrips.length > 0 && (
        <section className="card card-pad">
          <h2>On the road today</h2>
          <div className="today-list">
            {todayTrips.map((d) => (
              <Link key={d.id} href={`/admin/departures/${d.id}`} className="today-item">
                <span><strong>{d.tour_title}</strong><span className="small muted"> · {d.guide_name || "No guide"} · {d.vehicle_name || "No vehicle"}</span></span>
                <span className="badge badge-ok">{d.booked} travellers</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-4">
        {finance && <>
        <div className="card stat"><div className="label">Collected this month</div><div className="value">{money(revenue.month)}</div></div>
        <div className="card stat"><div className="label">Collected all time</div><div className="value">{money(revenue.total)}</div></div>
        <div className="card stat"><div className="label">Outstanding balances</div><div className="value">{money(outstanding)}</div></div>
        </>}
        <div className="card stat"><div className="label">Upcoming travellers</div><div className="value">{travellers}</div></div>
      </div>

      {lateCount > 0 && can(user, "bookings.view") && (
        <div className="alert alert-error"><strong>{lateCount}</strong> payment{lateCount > 1 ? "s" : ""} arrived after a booking was cancelled and need a refund or rebooking. <Link href="/admin/bookings?status=cancelled">Review</Link></div>
      )}
      {pending.length > 0 && can(user, "bookings.view") && (
        <div className="alert alert-info"><strong>{pending.length}</strong> booking{pending.length > 1 ? "s are" : " is"} waiting for payment. <Link href="/admin/bookings?status=pending">Review</Link></div>
      )}

      {finance && <section className="card card-pad"><RevenueChart months={months} /></section>}

      <div className="two-col">
        <section className="card">
          <div className="card-pad spread"><h2 style={{ margin: 0 }}>Upcoming trips</h2><Link href="/admin/departures">All trips</Link></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Trip</th><th>Dates</th><th>Seats</th><th>Guide</th></tr></thead>
            <tbody>{upcoming.length === 0 && <tr><td colSpan={4} className="muted">No upcoming trips yet.</td></tr>}{upcoming.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/admin/departures/${d.id}`}>{d.tour_title}</Link></td>
                <td>{dateRange(d.start_date, d.end_date)}</td>
                <td>{d.booked}/{d.capacity}</td>
                <td>{d.guide_name || <span className="badge badge-warn">Unassigned</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
        {finance && <section className="card card-pad">
          <h2>Revenue by tour</h2>
          {byTour.length === 0 && <p className="muted">No tours yet.</p>}
          {byTour.map((t) => (
            <div key={t.id} className="bar-row">
              <span className="small" title={t.title} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <div className="bar-track"><span style={{ width: `${(t.revenue / maxRev) * 100}%` }} /></div>
              <span className="small num">{money(t.revenue)}</span>
            </div>
          ))}
        </section>}
      </div>

      {finance && <section className="card">
        <div className="card-pad"><h2 style={{ margin: 0 }}>Balances to collect</h2></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Ref</th><th>Customer</th><th>Trip</th><th>Travel date</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
          <tbody>{withBalance.length === 0 && <tr><td colSpan={6} className="muted">No balances to collect.</td></tr>}{withBalance.map((b) => (
            <tr key={b.id}>
              <td><Link href={`/admin/bookings/${b.id}`}>{b.ref}</Link></td>
              <td>{b.customer_name}<div className="small muted">{b.customer_phone}</div></td>
              <td>{b.tour_title}</td>
              <td>{date(b.start_date)}</td>
              <td className="num">{money(b.paid)}</td>
              <td className="num"><strong>{money(b.balance)}</strong></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>}
    </div>
  );
}
