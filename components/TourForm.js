"use client";
import { useActionState } from "react";
import { saveTour } from "@/app/admin/actions";
import CoverPicker from "./CoverPicker";

const CATEGORIES = ["Local", "Adventure", "Culture", "Relaxation", "International", "Corporate", "School trip"];

export default function TourForm({ tour = {} }) {
  const [state, action, pending] = useActionState(saveTour, null);
  // After an error, refill the form with what was typed instead of the saved values.
  const v = state?.values;
  const val = (k, saved) => (v ? v[k] ?? "" : saved ?? "");
  return (
    <form key={JSON.stringify(v || {})} action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {tour.id && <input type="hidden" name="id" value={tour.id} />}
      <div className="form-grid">
        <div className="field"><label htmlFor="tf-title">Tour name</label><input id="tf-title" name="title" defaultValue={val("title", tour.title)} required maxLength={120} /></div>
        <div className="field"><label htmlFor="tf-slug">Web address (slug)</label><input id="tf-slug" name="slug" defaultValue={val("slug", tour.slug)} placeholder="filled in automatically" maxLength={80} /></div>
        <div className="field"><label htmlFor="tf-dest">Destination</label><input id="tf-dest" name="destination" defaultValue={val("destination", tour.destination)} required maxLength={120} /></div>
        <div className="field"><label htmlFor="tf-cat">Category</label>
          <select id="tf-cat" name="category" defaultValue={val("category", tour.category || "Local")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="field"><label htmlFor="tf-days">Days</label><input id="tf-days" type="number" name="duration_days" min="1" max="60" defaultValue={val("duration_days", tour.duration_days || 1)} /></div>
        <div className="field"><label htmlFor="tf-price">Price per person (GH₵)</label><input id="tf-price" type="text" inputMode="decimal" autoComplete="off" placeholder="e.g. 1500 or 1,500.50" name="price" defaultValue={val("price", tour.price ? tour.price / 100 : "")} required /></div>
        <div className="field"><label htmlFor="tf-dep">Deposit % <span className="muted small">(0 = pay in full)</span></label><input id="tf-dep" type="number" name="deposit_percent" min="0" max="100" defaultValue={val("deposit_percent", tour.deposit_percent ?? 30)} /></div>
      </div>
      <CoverPicker current={v ? v.image_url : tour.image_url} />
      <div className="field"><label htmlFor="tf-sum">Short summary</label><input id="tf-sum" name="summary" defaultValue={val("summary", tour.summary)} maxLength={200} /></div>
      <div className="field"><label htmlFor="tf-desc">Description</label><textarea id="tf-desc" name="description" defaultValue={val("description", tour.description)} maxLength={5000} /></div>
      <div className="field"><label htmlFor="tf-itin">Itinerary (one line per day, e.g. "Day 1: Depart Accra, visit Kakum")</label><textarea id="tf-itin" name="itinerary" defaultValue={val("itinerary", tour.itinerary)} rows={5} maxLength={5000} /></div>
      <div className="form-grid">
        <div className="field"><label htmlFor="tf-inc">Included (one per line)</label><textarea id="tf-inc" name="inclusions" defaultValue={val("inclusions", tour.inclusions)} maxLength={2000} /></div>
        <div className="field"><label htmlFor="tf-exc">Not included (one per line)</label><textarea id="tf-exc" name="exclusions" defaultValue={val("exclusions", tour.exclusions)} maxLength={2000} /></div>
      </div>
      <label className="row" style={{ fontWeight: 500, marginBottom: 16 }}>
        <input type="checkbox" name="active" defaultChecked={v ? Boolean(v.active) : (tour.active ?? 1) === 1} style={{ width: "auto" }} /> Show on website
      </label>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : tour.id ? "Save changes" : "Create tour"}</button>
    </form>
  );
}
