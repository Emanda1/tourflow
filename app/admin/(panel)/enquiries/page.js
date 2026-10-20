import { db } from "@/lib/db";
import { date } from "@/lib/format";
import { setEnquiryStatus } from "../../actions";

const STATUSES = [["new", "New"], ["contacted", "Contacted"], ["won", "Booked"], ["lost", "Not interested"]];

export default async function EnquiriesPage({ searchParams }) {
  const { s = "open" } = await searchParams;
  const all = db.prepare("SELECT * FROM enquiries ORDER BY id DESC").all();
  const rows = all.filter((e) => (s === "open" ? ["new", "contacted"].includes(e.status) : s === "all" ? true : e.status === s));
  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Trip requests</h1>
      <p className="muted" style={{ margin: 0 }}>Custom trip requests from the website. Call or WhatsApp the customer, then update the status.</p>
      <div className="chips">
        {[["open", "Open"], ...STATUSES, ["all", "All"]].map(([k, l]) => (
          <a key={k} href={`/admin/enquiries?s=${k}`} className={`chip ${s === k ? "chip-on" : ""}`}>{l} ({k === "open" ? all.filter((e) => ["new", "contacted"].includes(e.status)).length : k === "all" ? all.length : all.filter((e) => e.status === k).length})</a>
        ))}
      </div>
      {rows.length === 0 && <div className="card card-pad muted">No requests here.</div>}
      <div className="grid grid-3">
        {rows.map((e) => (
          <div key={e.id} className="card card-pad stack">
            <div className="spread">
              <strong>{e.name}</strong>
              <span className={`badge ${e.status === "new" ? "badge-warn" : e.status === "won" ? "badge-ok" : e.status === "lost" ? "badge-closed" : ""}`}>{STATUSES.find(([k]) => k === e.status)?.[1]}</span>
            </div>
            <dl className="kv small" style={{ margin: 0 }}>
              <dt>Trip</dt><dd>{e.destination || "—"}</dd>
              <dt>Date</dt><dd>{e.travel_date ? date(e.travel_date) : "Flexible"}</dd>
              <dt>Group</dt><dd>{e.group_size || "—"} people</dd>
              <dt>Budget</dt><dd>{e.budget || "—"}</dd>
              <dt>Received</dt><dd>{date(e.created_at)}</dd>
            </dl>
            {e.message && <p className="small" style={{ background: "#faf9f6", padding: 10, borderRadius: 8, margin: 0 }}>{e.message}</p>}
            <div className="row">
              <a className="btn btn-sm" href={`https://wa.me/${e.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${e.name.split(" ")[0]}, thanks for your trip request${e.destination ? ` (${e.destination})` : ""}.`)}`} target="_blank" rel="noopener">WhatsApp</a>
              <a className="btn btn-sm btn-secondary" href={`tel:${e.phone}`}>Call {e.phone}</a>
            </div>
            <div className="row">
              {STATUSES.filter(([k]) => k !== e.status).map(([k, l]) => (
                <form key={k} action={setEnquiryStatus}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="status" value={k} />
                  <button className="link-btn small">Mark {l.toLowerCase()}</button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
