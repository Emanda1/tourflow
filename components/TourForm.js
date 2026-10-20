import { saveTour } from "@/app/admin/actions";
import CoverPicker from "./CoverPicker";

const CATEGORIES = ["Local", "Adventure", "Culture", "Relaxation", "International", "Corporate", "School trip"];

export default function TourForm({ tour = {} }) {
  return (
    <form action={saveTour} className="card card-pad">
      {tour.id && <input type="hidden" name="id" value={tour.id} />}
      <div className="form-grid">
        <div className="field"><label>Tour name</label><input name="title" defaultValue={tour.title} required /></div>
        <div className="field"><label>Web address (slug)</label><input name="slug" defaultValue={tour.slug} placeholder="auto from name" /></div>
        <div className="field"><label>Destination</label><input name="destination" defaultValue={tour.destination} required /></div>
        <div className="field"><label>Category</label>
          <select name="category" defaultValue={tour.category || "Local"}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="field"><label>Days</label><input type="number" name="duration_days" min="1" defaultValue={tour.duration_days || 1} /></div>
        <div className="field"><label>Price per person (GH₵)</label><input type="number" step="0.01" name="price" defaultValue={tour.price ? tour.price / 100 : ""} required /></div>
        <div className="field"><label>Deposit %</label><input type="number" name="deposit_percent" min="0" max="100" defaultValue={tour.deposit_percent ?? 30} /></div>
      </div>
      <CoverPicker current={tour.image_url} />
      <div className="field"><label>Short summary</label><input name="summary" defaultValue={tour.summary} /></div>
      <div className="field"><label>Description</label><textarea name="description" defaultValue={tour.description} /></div>
      <div className="field"><label>Itinerary (one line per day)</label><textarea name="itinerary" defaultValue={tour.itinerary} rows={5} /></div>
      <div className="form-grid">
        <div className="field"><label>Included (one per line)</label><textarea name="inclusions" defaultValue={tour.inclusions} /></div>
        <div className="field"><label>Not included (one per line)</label><textarea name="exclusions" defaultValue={tour.exclusions} /></div>
      </div>
      <label className="row" style={{ fontWeight: 500, marginBottom: 16 }}>
        <input type="checkbox" name="active" defaultChecked={tour.active ?? 1} style={{ width: "auto" }} /> Show on website
      </label>
      <button className="btn">{tour.id ? "Save changes" : "Create tour"}</button>
    </form>
  );
}
