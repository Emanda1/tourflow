import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import Link from "next/link";
import { listDepartures } from "@/lib/db";
import { dateRange, money } from "@/lib/format";

export default async function DeparturesPage({ searchParams }) {
  const user = await requireUser("trips.view");
  const { past } = await searchParams;
  const deps = listDepartures({ upcomingOnly: !past });
  return (
    <div className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>Trips & manifests</h1>
        <div className="row">
          <Link href="/admin/departures" className={`badge ${!past ? "badge-ok" : ""}`}>Upcoming</Link>
          <Link href="/admin/departures?past=1" className={`badge ${past ? "badge-ok" : ""}`}>All</Link>
        </div>
      </div>
      <p className="muted">To add new dates, open a tour under <Link href="/admin/tours">Tours</Link>.</p>
      <div className="card table-wrap"><table>
        <thead><tr><th>Trip</th><th>Dates</th><th>Status</th><th>Seats</th><th>Guide</th><th>Driver / vehicle</th><th className="num">Price</th></tr></thead>
        <tbody>{deps.map((d) => (
          <tr key={d.id}>
            <td><Link href={`/admin/departures/${d.id}`}><strong>{d.tour_title}</strong></Link></td>
            <td>{dateRange(d.start_date, d.end_date)}</td>
            <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
            <td>{d.booked}/{d.capacity}{d.booked >= d.capacity && <> <span className="badge badge-cancelled">Full</span></>}</td>
            <td>{d.guide_name || <span className="badge badge-warn">Unassigned</span>}</td>
            <td>{d.driver_name || "—"}{d.vehicle_name ? ` · ${d.vehicle_name}` : ""}</td>
            <td className="num">{money(d.price)}</td>
          </tr>
        ))}
        {deps.length === 0 && <tr><td colSpan={7} className="muted" style={{ padding: 24 }}>No trips here yet. Open a tour under Tours and use "Add a date".</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
