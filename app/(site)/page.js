import Link from "next/link";
import { db } from "@/lib/db";
import TourExplorer from "@/components/TourExplorer";
import { coverStyle, date } from "@/lib/format";

const daysUntil = (iso) => Math.max(0, Math.round((new Date(iso + "T00:00:00") - new Date(new Date().toDateString())) / 86400000));

export const dynamic = "force-dynamic";

export default async function Home() {
  const tours = db.prepare(`
    SELECT t.id, t.slug, t.title, t.destination, t.category, t.duration_days, t.price, t.summary, t.image_url,
      (SELECT MIN(d.start_date) FROM departures d WHERE d.tour_id = t.id AND d.status = 'open' AND d.start_date >= date('now')) AS next_date,
      (SELECT d.capacity - COALESCE((SELECT SUM(b.travellers) FROM bookings b WHERE b.departure_id = d.id AND b.status != 'cancelled'), 0)
         FROM departures d WHERE d.tour_id = t.id AND d.status = 'open' AND d.start_date >= date('now') ORDER BY d.start_date LIMIT 1) AS seats_left,
      (SELECT COALESCE(SUM(b.travellers), 0) FROM bookings b JOIN departures d ON d.id = b.departure_id
         WHERE d.tour_id = t.id AND b.status != 'cancelled' AND b.created_at > datetime('now', '-30 days')) AS booked_recently
    FROM tours t WHERE t.active = 1`).all();
  const soon = db.prepare(`SELECT d.id, d.start_date, t.title, t.slug, t.image_url, d.capacity,
      d.capacity - COALESCE((SELECT SUM(b.travellers) FROM bookings b WHERE b.departure_id = d.id AND b.status != 'cancelled'), 0) AS left_seats
    FROM departures d JOIN tours t ON t.id = d.tour_id
    WHERE t.active = 1 AND d.status = 'open' AND d.start_date >= date('now') AND d.start_date <= date('now', '+21 days')
    ORDER BY d.start_date LIMIT 4`).all().filter((d) => d.left_seats > 0);
  const categories = [...new Set(tours.map((t) => t.category))].sort();
  const stats = db.prepare(`SELECT
      (SELECT COUNT(*) FROM tours WHERE active = 1) AS tours,
      (SELECT COUNT(DISTINCT destination) FROM tours WHERE active = 1) AS places,
      (SELECT COALESCE(SUM(travellers),0) FROM bookings WHERE status = 'confirmed') AS travellers`).get();

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Explore Ghana and beyond,<br />without the stress.</h1>
          <p>Guided tours, weekend getaways and international holiday packages. Book in minutes and pay in full or in instalments with mobile money.</p>
          <div className="hero-stats">
            <div><strong>{stats.tours}</strong><span>tours &amp; packages</span></div>
            <div><strong>{stats.places}</strong><span>destinations</span></div>
            <div><strong>{stats.travellers}+</strong><span>travellers booked</span></div>
          </div>
        </div>
      </section>
      <main className="container explorer-wrap" id="tours">
        <TourExplorer tours={tours} categories={categories} />
        {soon.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <div className="spread"><h2 style={{ margin: 0 }}>Leaving soon</h2><span className="muted small">Last chance to grab a seat</span></div>
            <div className="soon-strip">
              {soon.map((d) => {
                const n = daysUntil(d.start_date);
                return (
                  <Link key={d.id} href={`/book/${d.id}`} className="soon-card card">
                    <div className="soon-thumb" style={coverStyle(d.image_url)} />
                    <div>
                      <strong>{d.title}</strong>
                      <div className="small muted">{date(d.start_date)} · {d.left_seats} seat{d.left_seats > 1 ? "s" : ""} left</div>
                    </div>
                    <span className="countdown">{n === 0 ? "Today" : n === 1 ? "Tomorrow" : <><b>{n}</b> days</>}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        <section className="how card card-pad">
          <h2>How it works</h2>
          <ol className="how-steps">
            <li><span>1</span><strong>Pick a trip &amp; date</strong><p className="muted small">See live seats left and the full itinerary.</p></li>
            <li><span>2</span><strong>Pay your way</strong><p className="muted small">MoMo or card, in full or with a deposit.</p></li>
            <li><span>3</span><strong>Get confirmed by SMS</strong><p className="muted small">Your ticket, receipt and pickup details.</p></li>
            <li><span>4</span><strong>Travel &amp; enjoy</strong><p className="muted small">We handle transport, guides and hotels.</p></li>
          </ol>
        </section>
        <section className="cta card card-pad">
          <div>
            <h2 style={{ margin: 0 }}>Planning a group, school or company trip?</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>Tell us where, when and your budget. We'll send you a tailored quote.</p>
          </div>
          <Link href="/custom-trip" className="btn">Request a custom trip</Link>
        </section>
      </main>
    </>
  );
}
