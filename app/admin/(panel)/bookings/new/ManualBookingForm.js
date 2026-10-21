"use client";
import { useActionState, useState } from "react";
import { createManualBooking } from "../../../actions";

const fmt = (p) => "GH₵ " + (p / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAX_ROWS = 30;

function Form({ departures, state, action, pending }) {
  const v = state?.values || {};
  const [depId, setDepId] = useState(String(v.departure_id || departures[0]?.id || ""));
  const dep = departures.find((d) => String(d.id) === depId) || departures[0];
  const initialRows = [];
  for (let i = 0; i < MAX_ROWS; i++) if (v[`traveller_${i}`] !== undefined) initialRows.push({ name: v[`traveller_${i}`], type: v[`traveller_type_${i}`] || "" });
  const [rows, setRows] = useState(initialRows.length ? initialRows : [{ name: "", type: "" }]);
  const [qty, setQty] = useState(() => Object.fromEntries(Object.entries(v).filter(([k]) => k.startsWith("extra_")).map(([k, q]) => [k.slice(6), Number(q) || 0])));

  const types = dep?.types || [];
  const extras = dep?.extras || [];
  const typeById = Object.fromEntries(types.map((t) => [String(t.id), t]));
  const count = rows.length;
  const qtyOf = (x) => Math.min(Number(qty[x.id]) || 0, x.per === "booking" ? 1 : count);
  const total = dep ? rows.reduce((s, r) => s + (typeById[r.type]?.price ?? dep.price), 0) + extras.reduce((s, x) => s + x.price * qtyOf(x), 0) : 0;
  const update = (i, k, val) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: val } : r)));

  return (
    <form action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {departures.length === 0 && <div className="alert alert-info">There are no open trips to book. Add a date under <a href="/admin/tours">Tours</a> first.</div>}
      <div className="field"><label htmlFor="mb-dep">Trip</label>
        <select id="mb-dep" name="departure_id" value={depId} onChange={(e) => { setDepId(e.target.value); setRows(rows.map((r) => ({ ...r, type: "" }))); setQty({}); }} required>
          {departures.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="mb-name">Customer name</label><input id="mb-name" name="name" defaultValue={v.name} required /></div>
        <div className="field"><label htmlFor="mb-phone">Phone</label><input id="mb-phone" name="phone" defaultValue={v.phone} required /></div>
        <div className="field"><label htmlFor="mb-email">Email</label><input id="mb-email" name="email" defaultValue={v.email} type="email" /></div>
        <div className="field"><label>Source</label>
          <select name="source" defaultValue={v.source}><option value="walk-in">Walk-in</option><option value="phone">Phone / WhatsApp</option><option value="agent">Agent</option></select>
        </div>
      </div>

      <div className="field">
        <label>Travellers <span className="muted small">(leave the first name empty if it's only the customer)</span></label>
        <div className="stack" style={{ gap: 8 }}>
          {rows.map((r, i) => (
            <div key={i} className="option-row">
              <input name={`traveller_${i}`} value={r.name} onChange={(e) => update(i, "name", e.target.value)} placeholder={`Traveller ${i + 1} full name`} maxLength={120} aria-label={`Traveller ${i + 1} name`} />
              {types.length > 0 ? (
                <select name={`traveller_type_${i}`} value={r.type} onChange={(e) => update(i, "type", e.target.value)} aria-label={`Traveller ${i + 1} price`}>
                  <option value="">{dep.baseLabel} · {fmt(dep.price)}</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.label} · {t.price ? fmt(t.price) : "free"}</option>)}
                </select>
              ) : <input type="hidden" name={`traveller_type_${i}`} value="" />}
              {rows.length > 1 && <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove traveller ${i + 1}`}>✕</button>}
            </div>
          ))}
        </div>
        {rows.length < MAX_ROWS && <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 8 }} onClick={() => setRows([...rows, { name: "", type: "" }])}>+ Add traveller</button>}
      </div>

      {extras.length > 0 && (
        <div className="field">
          <label>Extras</label>
          <div className="stack" style={{ gap: 8 }}>
            {extras.map((x) => (
              <div key={x.id} className="option-row">
                <span style={{ flex: 1 }}>{x.label} <span className="small muted">· {fmt(x.price)} {x.per === "booking" ? "per booking" : "per person"}</span></span>
                <input name={`extra_${x.id}`} type="number" min="0" max={x.per === "booking" ? 1 : count} value={qtyOf(x)} onChange={(e) => setQty({ ...qty, [x.id]: e.target.value })} style={{ width: 90 }} aria-label={`How many ${x.label}`} />
              </div>
            ))}
          </div>
        </div>
      )}
      {dep && <p className="price-box spread"><span>{count} traveller{count > 1 ? "s" : ""}</span><strong className="price">Total {fmt(total)}</strong></p>}

      <div className="form-grid">
        <div className="field"><label htmlFor="mb-plan">Payment plan</label><select id="mb-plan" name="plan" defaultValue={v.plan}><option value="full">Pay in full</option><option value="deposit">Deposit + instalments</option></select></div>
        <div className="field"><label htmlFor="mb-paid_now">Amount paid now (GH₵)</label><input id="mb-paid_now" name="paid_now" type="number" step="0.01" min="0" defaultValue={v.paid_now || "0"} /></div>
        <div className="field"><label htmlFor="mb-method">Paid by</label><select id="mb-method" name="method" defaultValue={v.method}><option value="cash">Cash</option><option value="momo">Mobile money</option><option value="bank">Bank transfer</option></select></div>
      </div>
      <div className="field"><label htmlFor="mb-notes">Notes</label><textarea id="mb-notes" name="notes" defaultValue={v.notes} /></div>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Create booking"}</button>
    </form>
  );
}

export default function ManualBookingForm({ departures }) {
  const [state, action, pending] = useActionState(createManualBooking, null);
  // Remount after an error so the form refills with what was typed.
  return <Form key={JSON.stringify(state?.values || {})} departures={departures} state={state} action={action} pending={pending} />;
}
