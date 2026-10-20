"use client";
import { useActionState, useState } from "react";
import { submitEnquiry } from "./actions";

const IDEAS = ["Beach weekend", "Safari", "Hiking & waterfalls", "Heritage & culture", "Dubai", "Zanzibar", "School excursion", "Company retreat"];

export default function EnquiryForm() {
  const [state, action, pending] = useActionState(submitEnquiry, null);
  const v = state?.values || {};
  const [dest, setDest] = useState("");
  const [size, setSize] = useState(4);

  if (state?.ok) {
    return (
      <div className="card card-pad success-card">
        <div className="success-icon">✓</div>
        <h2>Thank you, {state.name}!</h2>
        <p className="muted">We've received your request. One of our travel planners will call you within 24 hours with ideas and a quote.</p>
        <a className="btn" href="/">Browse our tours</a>
      </div>
    );
  }

  return (
    <form key={JSON.stringify(v)} action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error">{state.error}</div>}
      <div className="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="field">
        <label htmlFor="destination">Where or what kind of trip?</label>
        <input id="destination" name="destination" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="e.g. Cape Coast, a safari, Dubai…" />
        <div className="chips" style={{ marginTop: 8 }}>
          {IDEAS.map((i) => <button type="button" key={i} className={`chip ${dest === i ? "chip-on" : ""}`} onClick={() => setDest(i)}>{i}</button>)}
        </div>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="travel_date">Preferred date</label><input id="travel_date" name="travel_date" defaultValue={v.travel_date} type="date" /></div>
        <div className="field">
          <label htmlFor="group_size">Group size: <strong>{size}{size >= 50 ? "+" : ""}</strong></label>
          <input id="group_size" name="group_size" type="range" min="1" max="50" value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </div>
        <div className="field"><label htmlFor="budget">Budget per person</label>
          <select id="budget" name="budget" defaultValue={v.budget || ""}>
            <option value="">Not sure yet</option><option>Under GH₵ 1,000</option><option>GH₵ 1,000 – 3,000</option><option>GH₵ 3,000 – 10,000</option><option>Above GH₵ 10,000</option>
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="ename">Your name</label><input id="ename" name="name" defaultValue={v.name} required maxLength={120} /></div>
        <div className="field"><label htmlFor="ephone">Phone / WhatsApp</label><input id="ephone" name="phone" defaultValue={v.phone} required inputMode="tel" maxLength={30} /></div>
        <div className="field"><label htmlFor="eemail">Email (optional)</label><input id="eemail" name="email" defaultValue={v.email} type="email" /></div>
      </div>
      <div className="field"><label htmlFor="message">Anything else?</label><textarea id="message" name="message" defaultValue={v.message} maxLength={2000} placeholder="Occasion, hotel preferences, activities you'd love…" /></div>
      <button className="btn btn-block btn-lg" disabled={pending}>{pending ? "Sending…" : "Send my request"}</button>
    </form>
  );
}
