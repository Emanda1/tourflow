import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db, getDeparture, listBookings } from "@/lib/db";
import { money, dateRange, date } from "@/lib/format";
import { company } from "@/lib/config";
import DepartureForm from "@/components/DepartureForm";
import { messageDeparture } from "../../../actions";
import PrintButton from "@/components/PrintButton";
import ManifestTable from "@/components/ManifestTable";
import Toast from "@/components/Toast";

export default async function DepartureDetail({ params, searchParams }) {
  const user = await requireUser("trips.view");
  const { id } = await params;
  const sp = await searchParams;
  const d = getDeparture(Number(id));
  if (!d) notFound();
  const bookings = listBookings({ departureId: d.id }).filter((b) => b.status !== "cancelled");
  const travellers = db.prepare(`SELECT tr.*, b.ref, b.id AS booking_id, b.status, c.phone AS contact_phone, c.name AS contact_name
    FROM travellers tr JOIN bookings b ON b.id = tr.booking_id JOIN customers c ON c.id = b.customer_id
    WHERE b.departure_id = ? AND b.status != 'cancelled' ORDER BY tr.name`).all(d.id);
  const staff = db.prepare("SELECT * FROM staff ORDER BY name").all();
  const vehicles = db.prepare("SELECT * FROM vehicles ORDER BY name").all();
  const collected = bookings.reduce((s, b) => s + b.paid, 0);
  const owed = bookings.reduce((s, b) => s + b.balance, 0);

  return (
    <div className="stack">
      <Link href="/admin/departures" className="small no-print">← All trips</Link>
      <Toast message={sp.saved ? "Trip saved" : sp.sent ? `Message sent to ${sp.sent} booking(s)` : null} />
      {sp.error && <div className="alert alert-error" role="alert">{String(sp.error).slice(0, 200)}</div>}
      <div className="spread">
        <div>
          <h1 style={{ margin: 0 }}>{d.tour_title}</h1>
          <span className="muted">{dateRange(d.start_date, d.end_date)} · Pickup: {d.pickup_point || "TBC"} {d.pickup_time}</span>
        </div>
        <span className={`badge badge-${d.status}`}>{d.status}</span>
      </div>

      <div className="grid grid-4">
        <div className="card stat"><div className="label">Seats booked</div><div className="value">{d.booked}/{d.capacity}</div></div>
        <div className="card stat"><div className="label">Collected</div><div className="value">{money(collected)}</div></div>
        <div className="card stat"><div className="label">Still owed</div><div className="value">{money(owed)}</div></div>
      </div>

      <section className="card">
        <div className="card-pad spread">
          <div>
            <h2 style={{ margin: 0 }}>Passenger manifest</h2>
            <span className="small muted">{company.name} · Guide: {d.guide_name || "—"} · Driver: {d.driver_name || "—"} · Vehicle: {d.vehicle_name ? `${d.vehicle_name} (${d.vehicle_plate})` : "—"}</span>
          </div>
          <div className="row no-print">
            {can(user, "data.export") && <a className="btn btn-secondary btn-sm" href={`/admin/export/manifest/${d.id}`}>Download CSV</a>}
            <PrintButton />
          </div>
        </div>
        <ManifestTable canCheckIn={can(user, "trips.checkin")} travellers={travellers.map((t) => ({ ...t, checked_in: !!t.checked_in, balance: bookings.find((b) => b.id === t.booking_id)?.balance ?? 0 }))} />
      </section>

      <div className="two-col no-print">
        <section className="card card-pad">
          <h2>Trip details & assignments</h2>
          {can(user, "trips.edit") ? <DepartureForm tourId={d.tour_id} departure={d} staff={staff} vehicles={vehicles} /> : <p className="muted">Pickup: {d.pickup_point || "TBC"} {d.pickup_time} · {d.notes || "No notes"}</p>}
        </section>
        {can(user, "trips.message") && <form action={messageDeparture} className="card card-pad">
          <h2>Message all travellers</h2>
          <p className="small muted">Sends an SMS to the lead contact of every confirmed booking on this trip.</p>
          <input type="hidden" name="departure_id" value={d.id} />
          <div className="field">
            <textarea name="message" maxLength={480} defaultValue={`Reminder: ${d.tour_title} departs ${date(d.start_date)}${d.pickup_time ? ` at ${d.pickup_time}` : ""} from ${d.pickup_point || "the usual pickup point"}. Please arrive 15 minutes early. - ${company.name}`} />
          </div>
          <button className="btn btn-block">Send SMS</button>
        </form>}
      </div>
    </div>
  );
}
