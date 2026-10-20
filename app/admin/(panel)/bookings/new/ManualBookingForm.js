"use client";
import { useActionState } from "react";
import { createManualBooking } from "../../../actions";

export default function ManualBookingForm({ departures }) {
  const [state, action, pending] = useActionState(createManualBooking, null);
  return (
    <form action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error">{state.error}</div>}
      <div className="field"><label>Trip</label>
        <select name="departure_id" required>
          {departures.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="form-grid">
        <div className="field"><label>Customer name</label><input name="name" required /></div>
        <div className="field"><label>Phone</label><input name="phone" required /></div>
        <div className="field"><label>Email</label><input name="email" type="email" /></div>
        <div className="field"><label>Source</label>
          <select name="source"><option value="walk-in">Walk-in</option><option value="phone">Phone / WhatsApp</option><option value="agent">Agent</option></select>
        </div>
      </div>
      <div className="field"><label>Traveller names (one per line; leave empty if only the customer)</label><textarea name="travellers" /></div>
      <div className="form-grid">
        <div className="field"><label>Payment plan</label><select name="plan"><option value="full">Pay in full</option><option value="deposit">Deposit + instalments</option></select></div>
        <div className="field"><label>Amount paid now (GH₵)</label><input name="paid_now" type="number" step="0.01" min="0" defaultValue="0" /></div>
        <div className="field"><label>Paid by</label><select name="method"><option value="cash">Cash</option><option value="momo">Mobile money</option><option value="bank">Bank transfer</option></select></div>
      </div>
      <div className="field"><label>Notes</label><textarea name="notes" /></div>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Create booking"}</button>
    </form>
  );
}
