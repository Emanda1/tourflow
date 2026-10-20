"use client";
import { useState } from "react";
import Link from "next/link";

const fmt = (p) => "GH₵ " + (p / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (iso) => new Date(iso + "T00:00:00");

export default function BookingWidget({ departures, depositPercent }) {
  const firstOpen = departures.find((d) => d.capacity - d.booked > 0);
  const [selId, setSelId] = useState(firstOpen?.id);
  const [pax, setPax] = useState(1);
  const sel = departures.find((d) => d.id === selId);
  const left = sel ? sel.capacity - sel.booked : 0;
  const n = Math.min(pax, Math.max(left, 1));
  const total = sel ? sel.price * n : 0;
  const deposit = Math.ceil((total * depositPercent) / 100);

  if (departures.length === 0) {
    return (
      <>
        <p className="muted">No open dates right now.</p>
        <Link className="btn btn-block" href="/custom-trip">Request a private date</Link>
      </>
    );
  }

  return (
    <div>
      <h3>1. Pick a date</h3>
      <div className="date-grid">
        {departures.map((d) => {
          const l = d.capacity - d.booked;
          const s = day(d.start_date);
          return (
            <button key={d.id} type="button" disabled={l <= 0} onClick={() => setSelId(d.id)}
              className={`date-pill ${selId === d.id ? "date-on" : ""}`} aria-pressed={selId === d.id}>
              <span className="dp-month">{s.toLocaleDateString("en-GB", { month: "short" })}</span>
              <span className="dp-day">{s.getDate()}</span>
              <span className="dp-week">{s.toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <span className={`dp-seats ${l <= 5 ? "dp-low" : ""}`}>{l > 0 ? `${l} left` : "Full"}</span>
            </button>
          );
        })}
      </div>

      {sel && (
        <>
          <div className="meter meter-wide" title={`${sel.booked} of ${sel.capacity} seats taken`}>
            <span style={{ width: `${Math.min(100, (sel.booked / sel.capacity) * 100)}%` }} />
          </div>
          <p className="small muted" style={{ marginTop: 6 }}>{sel.booked} of {sel.capacity} seats taken{sel.pickup_point ? ` · Pickup: ${sel.pickup_point}${sel.pickup_time ? `, ${sel.pickup_time}` : ""}` : ""}</p>

          <h3>2. How many travellers?</h3>
          <div className="stepper">
            <button type="button" onClick={() => setPax(Math.max(1, n - 1))} disabled={n <= 1} aria-label="Fewer travellers">−</button>
            <output aria-live="polite">{n}</output>
            <button type="button" onClick={() => setPax(Math.min(left, n + 1))} disabled={n >= left} aria-label="More travellers">+</button>
          </div>

          <div className="price-box">
            <div className="spread"><span>{fmt(sel.price)} × {n}</span><strong className="price">{fmt(total)}</strong></div>
            <div className="spread small muted"><span>Or reserve with a {depositPercent}% deposit</span><span>{fmt(deposit)}</span></div>
          </div>
          <Link className="btn btn-block btn-lg" href={`/book/${sel.id}?n=${n}`}>Book {n} seat{n > 1 ? "s" : ""}</Link>
        </>
      )}
    </div>
  );
}
