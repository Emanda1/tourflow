import { saveDeparture } from "@/app/admin/actions";

export default function DepartureForm({ tourId, departure = {}, staff, vehicles, defaults = {} }) {
  const d = { ...defaults, ...departure };
  const guides = staff.filter((s) => s.role === "Guide");
  const drivers = staff.filter((s) => s.role === "Driver");
  return (
    <form action={saveDeparture}>
      <input type="hidden" name="tour_id" value={tourId} />
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <div className="form-grid">
        <div className="field"><label>Start date</label><input type="date" name="start_date" defaultValue={d.start_date} required /></div>
        <div className="field"><label>End date (auto if empty)</label><input type="date" name="end_date" defaultValue={d.end_date || ""} /></div>
        <div className="field"><label>Seats</label><input type="number" name="capacity" min="1" defaultValue={d.capacity || 20} /></div>
        <div className="field"><label>Special price (GH₵, optional)</label><input type="number" step="0.01" name="price_override" defaultValue={d.price_override ? d.price_override / 100 : ""} /></div>
        <div className="field"><label>Status</label>
          <select name="status" defaultValue={d.status || "open"}>
            <option value="open">Open for booking</option><option value="closed">Closed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="field"><label>Guide</label>
          <select name="guide_id" defaultValue={d.guide_id || ""}><option value="">— Unassigned —</option>{guides.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
        <div className="field"><label>Driver</label>
          <select name="driver_id" defaultValue={d.driver_id || ""}><option value="">— Unassigned —</option>{drivers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
        <div className="field"><label>Vehicle</label>
          <select name="vehicle_id" defaultValue={d.vehicle_id || ""}><option value="">— Unassigned —</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.plate}, {v.seats} seats)</option>)}</select>
        </div>
        <div className="field"><label>Pickup point</label><input name="pickup_point" defaultValue={d.pickup_point || ""} /></div>
        <div className="field"><label>Pickup time</label><input type="time" name="pickup_time" defaultValue={d.pickup_time || ""} /></div>
      </div>
      <div className="field"><label>Operations notes (hotels, suppliers…)</label><textarea name="notes" defaultValue={d.notes || ""} /></div>
      <button className="btn">{d.id ? "Save trip" : "Add date"}</button>
    </form>
  );
}
