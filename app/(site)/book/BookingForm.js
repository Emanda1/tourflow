"use client";
import { useActionState, useRef, useState } from "react";
import { submitBooking } from "./actions";

const fmt = (p) => "GH₵ " + (p / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STEPS = ["Travellers", "Contact", "Payment"];

export default function BookingForm({ departureId, price, depositPercent, seatsLeft, initialCount = 1, tourTitle, dates }) {
  const [state, action, pending] = useActionState(submitBooking, null);
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(Math.min(Math.max(1, initialCount), seatsLeft));
  const [plan, setPlan] = useState("full");
  const [names, setNames] = useState([]);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const panels = useRef([]);

  const total = price * count;
  const deposit = Math.ceil((total * depositPercent) / 100);
  const travellerNames = Array.from({ length: count }, (_, i) => names[i] || (i === 0 ? contact.name : "") || `Traveller ${i + 1}`);

  function next() {
    const panel = panels.current[step];
    const invalid = panel && [...panel.querySelectorAll("input,select,textarea")].find((el) => !el.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    if (step === 0 && !contact.name) setContact((c) => ({ ...c, name: names[0] || "" }));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const setName = (i, v) => setNames((arr) => { const a = [...arr]; a[i] = v; return a; });

  return (
    <form action={action} className="card card-pad" onKeyDown={(e) => { if (e.key === "Enter" && step < 2 && e.target.tagName === "INPUT") { e.preventDefault(); next(); } }}>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "step-on" : i < step ? "step-done" : ""}>
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step}>
              <span className="step-dot">{i < step ? "✓" : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      {state?.error && <div className="alert alert-error">{state.error}</div>}
      <input type="hidden" name="departureId" value={departureId} />
      <input type="hidden" name="count" value={count} />

      {/* Step 1: travellers */}
      <div ref={(el) => (panels.current[0] = el)} hidden={step !== 0}>
        <h3>Who's travelling?</h3>
        <div className="row" style={{ marginBottom: 16 }}>
          <div className="stepper">
            <button type="button" onClick={() => setCount(Math.max(1, count - 1))} disabled={count <= 1} aria-label="Fewer travellers">−</button>
            <output aria-live="polite">{count}</output>
            <button type="button" onClick={() => setCount(Math.min(seatsLeft, count + 1))} disabled={count >= seatsLeft} aria-label="More travellers">+</button>
          </div>
          <span className="muted small">{seatsLeft} seat{seatsLeft > 1 ? "s" : ""} available</span>
        </div>
        {Array.from({ length: count }, (_, i) => (
          <div className="form-grid traveller-row" key={i}>
            <div className="field">
              <label htmlFor={`t${i}`}>Traveller {i + 1} full name {i === 0 && <span className="muted small">(lead traveller)</span>}</label>
              <input id={`t${i}`} name={`traveller_${i}`} value={names[i] || ""} onChange={(e) => setName(i, e.target.value)} required autoComplete={i === 0 ? "name" : "off"} />
            </div>
            <div className="field">
              <label htmlFor={`tp${i}`}>Phone (optional)</label>
              <input id={`tp${i}`} name={`traveller_phone_${i}`} inputMode="tel" />
            </div>
          </div>
        ))}
      </div>

      {/* Step 2: contact */}
      <div ref={(el) => (panels.current[1] = el)} hidden={step !== 1}>
        <h3>Where should we send your tickets?</h3>
        <div className="form-grid">
          <div className="field"><label htmlFor="name">Contact name</label>
            <input id="name" name="name" required autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          </div>
          <div className="field"><label htmlFor="phone">Phone (MoMo number)</label>
            <input id="phone" name="phone" required inputMode="tel" placeholder="024 123 4567" pattern="[+0-9 ]{9,16}" title="Enter a valid phone number" autoComplete="tel"
              value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          </div>
          <div className="field"><label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          </div>
        </div>
        <p className="small muted">We'll send your confirmation and pickup details by SMS.</p>
      </div>

      {/* Step 3: payment */}
      <div ref={(el) => (panels.current[2] = el)} hidden={step !== 2}>
        <h3>How would you like to pay?</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 16 }}>
          <label className={`radio-card ${plan === "full" ? "radio-on" : ""}`}>
            <input type="radio" name="plan" value="full" checked={plan === "full"} onChange={() => setPlan("full")} />
            <span>Pay in full<br /><strong>{fmt(total)}</strong><br /><span className="muted small">Nothing more to pay later</span></span>
          </label>
          <label className={`radio-card ${plan === "deposit" ? "radio-on" : ""}`}>
            <input type="radio" name="plan" value="deposit" checked={plan === "deposit"} onChange={() => setPlan("deposit")} />
            <span>Pay {depositPercent}% deposit<br /><strong>{fmt(deposit)}</strong><br /><span className="muted small">Pay {fmt(total - deposit)} in instalments before the trip</span></span>
          </label>
        </div>
        <div className="field"><label htmlFor="notes">Special requests (optional)</label><textarea id="notes" name="notes" placeholder="Dietary needs, pickup location, room sharing…" /></div>

        <div className="review">
          <h4>Review</h4>
          <dl className="kv">
            <dt>Trip</dt><dd>{tourTitle}</dd>
            <dt>Dates</dt><dd>{dates}</dd>
            <dt>Travellers</dt><dd>{travellerNames.join(", ")}</dd>
            <dt>Contact</dt><dd>{contact.name} · {contact.phone}</dd>
            <dt>Pay now</dt><dd><strong>{fmt(plan === "deposit" ? deposit : total)}</strong></dd>
          </dl>
        </div>
      </div>

      <div className="spread" style={{ marginTop: 20 }}>
        {step > 0 ? <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
        {step < 2
          ? <button key="next" type="button" className="btn" onClick={next}>Continue →</button>
          : <button key="submit" type="submit" className="btn btn-lg" disabled={pending}>{pending ? "Reserving your seats…" : `Pay ${fmt(plan === "deposit" ? deposit : total)}`}</button>}
      </div>
      {step === 2 && <p className="small muted" style={{ marginTop: 10, textAlign: "right" }}>MTN MoMo · Telecel Cash · AirtelTigo Money · Card</p>}
    </form>
  );
}
