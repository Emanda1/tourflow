import { notFound } from "next/navigation";
import Link from "next/link";
import { db, listDepartures } from "@/lib/db";
import { money, lines, coverStyle, date } from "@/lib/format";
import BookingWidget from "@/components/BookingWidget";
import Accordion from "@/components/Accordion";
import ShareButton from "@/components/ShareButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tour = db.prepare("SELECT title, summary FROM tours WHERE slug = ?").get(slug);
  return tour ? { title: tour.title, description: tour.summary } : {};
}

function splitDay(line, i) {
  const m = line.match(/^(Day\s*\d+)\s*[:\-–]\s*(.*)$/i);
  return m ? { title: m[1], body: m[2] } : { title: `Day ${i + 1}`, body: line };
}

export default async function TourPage({ params }) {
  const { slug } = await params;
  const tour = db.prepare("SELECT * FROM tours WHERE slug = ? AND active = 1").get(slug);
  if (!tour) notFound();
  const departures = listDepartures({ tourId: tour.id, upcomingOnly: true, openOnly: true });
  const days = lines(tour.itinerary).map(splitDay).map((d) => ({ title: `${d.title} · ${d.body.split(",")[0]}`, body: d.body }));
  const recent = db.prepare(`SELECT COALESCE(SUM(b.travellers), 0) AS n FROM bookings b JOIN departures d ON d.id = b.departure_id
    WHERE d.tour_id = ? AND b.status != 'cancelled' AND b.created_at > datetime('now', '-30 days')`).get(tour.id).n;
  const nextDep = departures.find((d) => d.capacity - d.booked > 0);
  const related = db.prepare("SELECT slug, title, price FROM tours WHERE active = 1 AND id != ? AND category = ? LIMIT 3").all(tour.id, tour.category);

  return (
    <main className="page container has-mobile-book">
      <Link href="/#tours" className="small">← All tours</Link>
      <div className="detail-cover" style={{ ...coverStyle(tour.image_url), marginTop: 12 }}>
        <div className="detail-cover-text">
          <span className="badge badge-light">{tour.category}</span>
          <h1>{tour.title}</h1>
          <span>{tour.destination} · {tour.duration_days} day{tour.duration_days > 1 ? "s" : ""}{recent >= 3 ? ` · 🔥 ${recent} people booked in the last 30 days` : ""}</span>
        </div>
      </div>
      <div className="two-col">
        <div className="stack">
          <div className="spread">
            <p style={{ fontSize: "1.08rem", margin: 0, flex: 1, minWidth: "min(100%, 420px)" }}>{tour.description}</p>
            <ShareButton title={tour.title} />
          </div>

          <section className="card card-pad">
            <h2>Day-by-day itinerary</h2>
            <Accordion items={days} />
          </section>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            <section className="card card-pad">
              <h3>What's included</h3>
              <ul className="check-list">{lines(tour.inclusions).map((l, i) => <li key={i}>{l}</li>)}</ul>
            </section>
            <section className="card card-pad">
              <h3>Not included</h3>
              <ul className="check-list cross-list">{lines(tour.exclusions).map((l, i) => <li key={i}>{l}</li>)}</ul>
            </section>
          </div>

          <section className="card card-pad">
            <h3>Good to know</h3>
            <dl className="kv">
              <dt>Deposit</dt><dd>{tour.deposit_percent}% to reserve, balance in instalments before departure</dd>
              <dt>Payment</dt><dd>MTN MoMo, Telecel Cash, AirtelTigo Money, Visa / Mastercard</dd>
              <dt>Groups</dt><dd>Private dates available for families, schools and companies. <Link href="/custom-trip">Ask for a quote</Link></dd>
            </dl>
          </section>

          {related.length > 0 && (
            <section>
              <h3>You might also like</h3>
              <div className="row">{related.map((r) => <Link key={r.slug} className="chip" href={`/tours/${r.slug}`}>{r.title} · {money(r.price)}</Link>)}</div>
            </section>
          )}
        </div>

        <aside className="card card-pad sticky-aside" id="book">
          <div className="price" style={{ fontSize: "1.6rem" }}>{money(tour.price)} <span className="muted small">/ person</span></div>
          <BookingWidget departures={departures} depositPercent={tour.deposit_percent} />
        </aside>
      </div>
      {nextDep && (
        <div className="mobile-book">
          <div><strong>{money(nextDep.price)}</strong> <span className="small muted">/ person</span><div className="small muted">Next: {date(nextDep.start_date)}</div></div>
          <a href="#book" className="btn">Choose date</a>
        </div>
      )}
    </main>
  );
}
