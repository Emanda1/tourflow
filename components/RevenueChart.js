"use client";
import { useState } from "react";

const fmt = (p) => "GH₵ " + Math.round(p / 100).toLocaleString("en-GH");
const short = (p) => { const v = p / 100; return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)); };

/** Single-series bar chart: money collected per month, or bookings per month. */
export default function RevenueChart({ months }) {
  const [metric, setMetric] = useState("revenue");
  const [hover, setHover] = useState(null);
  const W = 640, H = 240, pad = { l: 44, r: 8, t: 12, b: 28 };
  const values = months.map((m) => (metric === "revenue" ? m.revenue : m.bookings));
  const max = Math.max(1, ...values);
  const nice = niceMax(max);
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const step = iw / months.length;
  const bw = Math.min(44, step * 0.55);
  const y = (v) => pad.t + ih - (v / nice) * ih;
  const quarter = nice / 4;
  const quarterIsRound = Number.isInteger(quarter / Math.pow(10, Math.floor(Math.log10(quarter || 1))));
  const fractions = quarterIsRound && (metric === "revenue" || Number.isInteger(quarter)) ? [0, 0.25, 0.5, 0.75, 1] : metric === "revenue" ? [0, 0.2, 0.4, 0.6, 0.8, 1] : [0, 0.5, 1];
  const ticks = fractions.map((f) => f * nice);
  const label = (v) => (metric === "revenue" ? short(v) : String(Math.round(v)));
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div className="chart">
      <div className="spread" style={{ marginBottom: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>{metric === "revenue" ? "Money collected" : "New bookings"}</h2>
          <span className="muted small">Last {months.length} months · {metric === "revenue" ? fmt(total) : `${total} bookings`}</span>
        </div>
        <div className="seg" role="tablist">
          <button className={metric === "revenue" ? "on" : ""} onClick={() => setMetric("revenue")}>Revenue</button>
          <button className={metric === "bookings" ? "on" : ""} onClick={() => setMetric("bookings")}>Bookings</button>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metric} per month`}>
        <g className="grid">{ticks.map((t) => <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />)}</g>
        <g className="axis">
          {ticks.map((t) => <text key={t} x={pad.l - 8} y={y(t) + 4} textAnchor="end">{label(t)}</text>)}
          {months.map((m, i) => <text key={m.key} x={pad.l + step * i + step / 2} y={H - 8} textAnchor="middle">{m.label}</text>)}
        </g>
        <g className={hover != null ? "dim" : ""}>
          {months.map((m, i) => {
            const v = values[i];
            const x = pad.l + step * i + (step - bw) / 2;
            const h = Math.max(0, pad.t + ih - y(v));
            const r = Math.min(4, h / 2);
            const top = y(v);
            const base = pad.t + ih;
            const d = h > 0
              ? `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z`
              : "";
            return (
              <g key={m.key}>
                {d && <path d={d} className={`bar ${hover === i ? "on" : ""}`} />}
                <rect className="bar-hit" x={pad.l + step * i} y={pad.t} width={step} height={ih}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} />
              </g>
            );
          })}
        </g>
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: `${((pad.l + step * hover + step / 2) / W) * 100}%`, top: `${(y(values[hover]) / H) * 100}%` }}>
          <strong>{months[hover].label} {months[hover].year}</strong><br />
          {fmt(months[hover].revenue)} <span className="muted">collected</span><br />
          {months[hover].bookings} <span className="muted">new booking{months[hover].bookings === 1 ? "" : "s"}</span>
        </div>
      )}
    </div>
  );
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
