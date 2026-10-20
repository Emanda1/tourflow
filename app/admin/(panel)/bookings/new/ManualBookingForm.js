"use client";
import { useActionState } from "react";
import { createManualBooking } from "../../../actions";

export default function ManualBookingForm({ departures }) {
  const [state, action, pending] = useActionState(createManualBooking, null);
  const v = state?.values || {};
  return (
    <form key={JSON.stringify(v)} action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {departures.length === 0 && <div className="alert alert-info">There are no open trips to book. Add a date under <a href="/admin/tours">Tours</a> first.</div>}
      <div className="field"><label htmlFor="mb-dep">Trip</label>
        <select id="mb-dep" name="departure_id" defaultValue={v.departure_id} required>
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
      <div className="field"><label htmlFor="mb-travellers">Traveller names (one per line; leave empty if only the customer)</label><textarea id="mb-travellers" name="travellers" defaultValue={v.travellers} /></div>
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
