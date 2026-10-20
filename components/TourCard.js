import Link from "next/link";
import { money, date, coverStyle } from "@/lib/format";
import FavButton from "./FavButton";

export default function TourCard({ tour }) {
  const left = tour.seats_left;
  return (
    <Link href={`/tours/${tour.slug}`} className="card tour-card">
      <div className="cover" style={coverStyle(tour.image_url)}>
        <span className="badge badge-light">{tour.category}</span>
        <FavButton slug={tour.slug} />
        {left != null && left > 0 && left <= 5 && <span className="badge badge-hot" style={{ top: 50 }}>Only {left} seat{left > 1 ? "s" : ""} left</span>}
        <span className="cover-days">{tour.duration_days} day{tour.duration_days > 1 ? "s" : ""}</span>
        {tour.booked_recently >= 5 && <span className="pop-tag">🔥 {tour.booked_recently} booked this month</span>}
      </div>
      <div className="body">
        <span className="muted small">{tour.destination}</span>
        <h3 style={{ margin: 0 }}>{tour.title}</h3>
        <p className="muted small" style={{ margin: 0 }}>{tour.summary}</p>
        <div className="spread" style={{ marginTop: "auto", paddingTop: 10 }}>
          <span className="price">{money(tour.price)} <span className="muted small">/ person</span></span>
          {tour.next_date ? <span className="small muted">Next: {date(tour.next_date)}</span> : <span className="small muted">Dates coming soon</span>}
        </div>
      </div>
    </Link>
  );
}
