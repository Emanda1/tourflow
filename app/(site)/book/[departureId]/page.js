import { notFound } from "next/navigation";
import Link from "next/link";
import { db, getDeparture } from "@/lib/db";
import { tourOptions, mainLabel } from "@/lib/pricing";
import { money, dateRange } from "@/lib/format";
import BookingForm from "../BookingForm";
import { onlinePaymentsAvailable } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book your trip" };

export default async function BookPage({ params, searchParams }) {
  const { departureId } = await params;
  const { n } = await searchParams;
  const dep = getDeparture(Number(departureId));
  if (!dep) notFound();
  const seatsLeft = dep.capacity - dep.booked;
  const options = tourOptions(dep.tour_id);
  const baseLabel = mainLabel(db.prepare("SELECT price_label FROM tours WHERE id = ?").get(dep.tour_id), options);

  return (
    <main className="page container">
      <Link href={`/tours/${dep.tour_slug}`} className="small">← Back to tour</Link>
      <h1 style={{ marginTop: 12 }}>Book: {dep.tour_title}</h1>
      <div className="two-col">
        {dep.status === "open" && seatsLeft > 0 ? (
          <BookingForm departureId={dep.id} price={dep.price} depositPercent={dep.deposit_percent} seatsLeft={seatsLeft}
            canPayOnline={onlinePaymentsAvailable} initialCount={Number(n) || 1} baseLabel={baseLabel} types={options.types} extras={options.extras} tourTitle={dep.tour_title} dates={dateRange(dep.start_date, dep.end_date)} />
        ) : (
          <div className="card card-pad"><p>Sorry, this date is no longer available.</p><Link className="btn" href={`/tours/${dep.tour_slug}`}>See other dates</Link></div>
        )}
        <aside className="card card-pad">
          <h3>Trip summary</h3>
          <dl className="kv">
            <dt>Tour</dt><dd>{dep.tour_title}</dd>
            <dt>Dates</dt><dd>{dateRange(dep.start_date, dep.end_date)}</dd>
            <dt>Pickup</dt><dd>{dep.pickup_point || "To be confirmed"}{dep.pickup_time ? `, ${dep.pickup_time}` : ""}</dd>
            <dt>Price</dt><dd>{money(dep.price)} per person{options.types.length ? ` (${baseLabel})` : ""}
              {options.types.map((t) => <div key={t.id} className="small">{t.label}: {t.price ? money(t.price) : "free"}</div>)}</dd>
            <dt>Seats left</dt><dd>{seatsLeft}</dd>
          </dl>
        </aside>
      </div>
    </main>
  );
}
