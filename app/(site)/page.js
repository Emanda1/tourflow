import Link from "next/link";
import { db } from "@/lib/db";
import TourExplorer from "@/components/TourExplorer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const tours = db.prepare(`
    SELECT t.id, t.slug, t.title, t.destination, t.category, t.duration_days, t.price, t.summary, t.image_url,
      (SELECT MIN(d.start_date) FROM departures d WHERE d.tour_id = t.id AND d.status = 'open' AND d.start_date >= date('now')) AS next_date,
      (SELECT d.capacity - COALESCE((SELECT SUM(b.travellers) FROM bookings b WHERE b.departure_id = d.id AND b.status != 'cancelled'), 0)
         FROM departures d WHERE d.tour_id = t.id AND d.status = 'open' AND d.start_date >= date('now') ORDER BY d.start_date LIMIT 1) AS seats_left
    FROM tours t WHERE t.active = 1`).all();
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
