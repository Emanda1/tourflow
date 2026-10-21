"use client";
import { useActionState } from "react";
import { saveDeparture } from "@/app/admin/actions";

export default function DepartureForm({ tourId, departure = {}, staff, vehicles, defaults = {} }) {
  const [state, action, pending] = useActionState(saveDeparture, null);
  const d = { ...defaults, ...departure, ...(state?.values || {}) };
  const p = `df${d.id || "new"}-`;
  // Inactive people/vehicles are hidden from the lists unless already assigned to this trip.
  const keep = (x, assigned) => x.active !== 0 || String(x.id) === String(assigned);
  const guides = staff.filter((s) => s.role === "Guide" && keep(s, d.guide_id));
  const drivers = staff.filter((s) => s.role === "Driver" && keep(s, d.driver_id));
  const cars = vehicles.filter((v) => keep(v, d.vehicle_id));
  const money = (x) => (state?.values ? x : x ? x / 100 : "");
  return (
    <form key={JSON.stringify(state?.values || {})} action={action}>
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      <input type="hidden" name="tour_id" value={tourId} />
      {departure.id && <input type="hidden" name="id" value={departure.id} />}
      <div className="form-grid">
        <div className="field"><label htmlFor={p + "start"}>Start date</label><input id={p + "start"} type="date" name="start_date" defaultValue={d.start_date} required /></div>
        <div className="field"><label htmlFor={p + "end"}>End date <span className="muted small">(moves with the start date)</span></label><input id={p + "end"} type="date" name="end_date" defaultValue={d.end_date || ""} /></div>
        <div className="field"><label htmlFor={p + "cap"}>Seats</label><input id={p + "cap"} type="number" name="capacity" min="1" max="1000" defaultValue={d.capacity || 20} /></div>
        <div className="field"><label htmlFor={p + "price"}>Special price (GH₵, optional)</label><input id={p + "price"} type="text" inputMode="decimal" autoComplete="off" name="price_override" defaultValue={money(d.price_override)} /></div>
        <div className="field"><label htmlFor={p + "status"}>Status</label>
          <select id={p + "status"} name="status" defaultValue={d.status || "open"}>
            <option value="open">Open for booking</option><option value="closed">Closed (no new bookings)</option><option value="completed">Completed</option><option value="cancelled">Cancelled (cancels its bookings)</option>
          </select>
        </div>
        <div className="field"><label htmlFor={p + "guide"}>Guide</label>
          <select id={p + "guide"} name="guide_id" defaultValue={d.guide_id || ""}><option value="">— Unassigned —</option>{guides.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
        <div className="field"><label htmlFor={p + "driver"}>Driver</label>
          <select id={p + "driver"} name="driver_id" defaultValue={d.driver_id || ""}><option value="">— Unassigned —</option>{drivers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
        <div className="field"><label htmlFor={p + "veh"}>Vehicle</label>
          <select id={p + "veh"} name="vehicle_id" defaultValue={d.vehicle_id || ""}><option value="">— Unassigned —</option>{cars.map((v) => <option key={v.id} value={v.id}>{v.name}{v.plate ? ` (${v.plate})` : ""} · {v.seats} seats</option>)}</select>
        </div>
        <div className="field"><label htmlFor={p + "pick"}>Pickup point</label><input id={p + "pick"} name="pickup_point" defaultValue={d.pickup_point || ""} maxLength={160} /></div>
        <div className="field"><label htmlFor={p + "time"}>Pickup time</label><input id={p + "time"} type="time" name="pickup_time" defaultValue={d.pickup_time || ""} /></div>
      </div>
      <div className="field"><label htmlFor={p + "notes"}>Operations notes (hotels, suppliers…)</label><textarea id={p + "notes"} name="notes" defaultValue={d.notes || ""} maxLength={3000} /></div>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : departure.id ? "Save trip" : "Add date"}</button>
    </form>
  );
}
