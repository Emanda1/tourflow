import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db, listDepartures } from "@/lib/db";
import { dateRange, money } from "@/lib/format";
import Toast from "@/components/Toast";
import TourForm from "@/components/TourForm";
import DepartureForm from "@/components/DepartureForm";
import { tourOptions } from "@/lib/pricing";

export default async function EditTour({ params, searchParams }) {
  const user = await requireUser("tours.edit");
  const { id } = await params;
  const sp = await searchParams;
  const tour = db.prepare("SELECT * FROM tours WHERE id = ?").get(Number(id));
  if (!tour) notFound();
  const deps = listDepartures({ tourId: tour.id });
  const last = deps[deps.length - 1]; // new dates start with the same pickup, seats and team as the latest one
  const staff = db.prepare("SELECT * FROM staff ORDER BY name").all();
  const vehicles = db.prepare("SELECT * FROM vehicles ORDER BY name").all();

  return (
    <div className="stack">
      <Link href="/admin/tours" className="small">← All tours</Link>
      <Toast message={sp.saved ? "Tour saved" : null} />
      {sp.error && <div className="alert alert-error" role="alert">{String(sp.error).slice(0, 200)}</div>}
      <div className="spread">
        <h1 style={{ margin: 0 }}>{tour.title}</h1>
        <Link href={`/tours/${tour.slug}`} target="_blank" className="btn btn-secondary btn-sm">View on website ↗</Link>
      </div>
      <div className="two-col">
        <TourForm tour={tour} options={tourOptions(tour.id)} photos={db.prepare("SELECT id, url FROM tour_photos WHERE tour_id = ? ORDER BY sort, id").all(tour.id)} />
        <div className="stack">
          <section className="card">
            <div className="card-pad"><h2 style={{ margin: 0 }}>Dates</h2></div>
            <div className="table-wrap"><table><tbody>
              {deps.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/admin/departures/${d.id}`}>{dateRange(d.start_date, d.end_date)}</Link><div className="small muted">{money(d.price)}</div></td>
                  <td>{d.booked}/{d.capacity}</td>
                  <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                </tr>
              ))}
              {deps.length === 0 && <tr><td className="muted">No dates yet.</td></tr>}
            </tbody></table></div>
          </section>
          <section className="card card-pad">
            <h3>Add a date</h3>
            <DepartureForm tourId={tour.id} staff={staff} vehicles={vehicles} defaults={{ capacity: last?.capacity || 20, pickup_point: last?.pickup_point || "", pickup_time: last?.pickup_time || "", vehicle_id: last?.vehicle_id, guide_id: last?.guide_id, driver_id: last?.driver_id }} />
          </section>
        </div>
      </div>
    </div>
  );
}
