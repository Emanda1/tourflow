"use client";
import { useMemo, useState } from "react";
import TourCard from "./TourCard";

const SORTS = {
  soonest: (a, b) => (a.next_date || "9999").localeCompare(b.next_date || "9999"),
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  shortest: (a, b) => a.duration_days - b.duration_days,
};

export default function TourExplorer({ tours, categories }) {
  const maxPrice = Math.max(...tours.map((t) => t.price), 0);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("soonest");
  const [budget, setBudget] = useState(maxPrice);
  const [availableOnly, setAvailableOnly] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tours
      .filter((t) => cat === "All" || t.category === cat)
      .filter((t) => t.price <= budget)
      .filter((t) => !availableOnly || t.seats_left > 0)
      .filter((t) => !needle || [t.title, t.destination, t.summary, t.category].join(" ").toLowerCase().includes(needle))
      .sort(SORTS[sort]);
  }, [tours, q, cat, sort, budget, availableOnly]);

  const reset = () => { setQ(""); setCat("All"); setBudget(maxPrice); setAvailableOnly(false); };

  return (
    <>
      <div className="explorer card">
        <div className="search-box">
          <span aria-hidden>⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Where do you want to go? Try “beach”, “Volta” or “Dubai”" aria-label="Search tours" />
          {q && <button className="link-btn" onClick={() => setQ("")} aria-label="Clear search">✕</button>}
        </div>
        <div className="explorer-controls">
          <label className="inline-field">
            <span>Max budget</span>
            <input type="range" min={0} max={maxPrice} step={5000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            <strong>GH₵ {(budget / 100).toLocaleString()}</strong>
          </label>
          <label className="inline-field">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="soonest">Soonest departure</option>
              <option value="priceAsc">Price: low to high</option>
              <option value="priceDesc">Price: high to low</option>
              <option value="shortest">Shortest trip</option>
            </select>
          </label>
          <label className="inline-check">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /> Seats available
          </label>
        </div>
      </div>

      <div className="spread" style={{ margin: "28px 0 16px" }}>
        <div className="chips" role="tablist">
          {["All", ...categories].map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} className={`chip ${cat === c ? "chip-on" : ""}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <span className="muted small">{shown.length} of {tours.length} tours</span>
      </div>

      <div className="grid grid-3">
        {shown.map((t) => <TourCard key={t.id} tour={t} />)}
      </div>
      {shown.length === 0 && (
        <div className="empty card card-pad">
          <p><strong>No tours match your search.</strong></p>
          <p className="muted">Try a bigger budget, or tell us what you want and we'll plan it for you.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={reset}>Clear filters</button>
            <a className="btn" href="/custom-trip">Request a custom trip</a>
          </div>
        </div>
      )}
    </>
  );
}
