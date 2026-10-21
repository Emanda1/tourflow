"use client";
import { useState } from "react";

const MAX = 10;
const cedis = (p) => (p == null || p === "" ? "" : String(p / 100));

/** Rebuilds rows from what was typed, after a form error. */
function fromValues(v, prefix, withPer) {
  const rows = [];
  for (let i = 0; i < MAX; i++) {
    if (v[`${prefix}_label_${i}`] === undefined) continue;
    rows.push({ key: `${prefix}${i}`, id: v[`${prefix}_id_${i}`] || "", label: v[`${prefix}_label_${i}`] || "", price: v[`${prefix}_price_${i}`] || "", ...(withPer ? { per: v[`${prefix}_per_${i}`] || "person" } : {}) });
  }
  return rows;
}

let nextKey = 0;
const newRow = (withPer) => ({ key: `new${nextKey++}`, id: "", label: "", price: "", ...(withPer ? { per: "person" } : {}) });

function Rows({ prefix, rows, setRows, withPer, labelHint, priceHint }) {
  const update = (i, k, val) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {rows.map((r, i) => (
        <div key={r.key} className="option-row">
          <input type="hidden" name={`${prefix}_id_${i}`} value={r.id} />
          <input name={`${prefix}_label_${i}`} value={r.label} onChange={(e) => update(i, "label", e.target.value)} placeholder={labelHint} maxLength={60} aria-label="Name" required />
          <input name={`${prefix}_price_${i}`} value={r.price} onChange={(e) => update(i, "price", e.target.value)} placeholder={priceHint} inputMode="decimal" autoComplete="off" aria-label="Price in cedis" required />
          {withPer && (
            <select name={`${prefix}_per_${i}`} value={r.per} onChange={(e) => update(i, "per", e.target.value)} aria-label="Charged">
              <option value="person">per person</option>
              <option value="booking">per booking</option>
            </select>
          )}
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove ${r.label || "this price"}`}>✕</button>
        </div>
      ))}
    </div>
  );
}

/**
 * Price options for a tour: other traveller types (child, student…) with their own price,
 * and optional extras customers can add (single room, airport pickup…).
 */
export default function PriceOptionsEditor({ priceLabel, types = [], extras = [], values }) {
  const [typeRows, setTypeRows] = useState(() => values ? fromValues(values, "type", false)
    : types.map((t) => ({ key: `t${t.id}`, id: String(t.id), label: t.label, price: cedis(t.price) })));
  const [extraRows, setExtraRows] = useState(() => values ? fromValues(values, "extra", true)
    : extras.map((x) => ({ key: `x${x.id}`, id: String(x.id), label: x.label, price: cedis(x.price), per: x.per })));

  return (
    <fieldset className="option-box">
      <legend>Different prices <span className="muted small">(optional)</span></legend>

      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="tf-price-label">Name of the main price</label>
        <input id="tf-price-label" name="price_label" defaultValue={values ? values.price_label : priceLabel || ""} placeholder="Adult" maxLength={40} />
        <span className="small muted">Shown next to the price above when there are other traveller types.</span>
      </div>

      <h4>Other traveller types</h4>
      <p className="small muted">For example "Child (under 12)" at GH₵ 900, or "Infant (under 2)" at 0. Each traveller still takes a seat.</p>
      <Rows prefix="type" rows={typeRows} setRows={setTypeRows} labelHint="e.g. Child (under 12)" priceHint="Price per person, GH₵" />
      {typeRows.length < MAX && <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 8 }} onClick={() => setTypeRows([...typeRows, newRow(false)])}>+ Add traveller type</button>}

      <h4 style={{ marginTop: 20 }}>Extras customers can add</h4>
      <p className="small muted">For example "Single room" at GH₵ 400 per person, or "Airport pickup" at GH₵ 250 per booking.</p>
      <Rows prefix="extra" rows={extraRows} setRows={setExtraRows} withPer labelHint="e.g. Single room" priceHint="Price, GH₵" />
      {extraRows.length < MAX && <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 8 }} onClick={() => setExtraRows([...extraRows, newRow(true)])}>+ Add extra</button>}
    </fieldset>
  );
}
