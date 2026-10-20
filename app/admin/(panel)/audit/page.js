import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";

export default async function AuditPage({ searchParams }) {
  await requireUser("audit.view");
  const { q = "" } = await searchParams;
  const term = String(q).slice(0, 80);
  const rows = db.prepare(`SELECT * FROM audit_log WHERE (? = '' OR action LIKE ? OR user_name LIKE ? OR details LIKE ?)
    ORDER BY id DESC LIMIT 300`).all(term, `%${term}%`, `%${term}%`, `%${term}%`);
  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Activity log</h1>
      <p className="muted" style={{ margin: 0 }}>Who did what, and when: sign-ins, payments, refunds, cancellations, price changes, exports and settings. Entries can't be edited or deleted from the app.</p>
      <form className="filters"><input name="q" defaultValue={term} placeholder="Search by person, action or booking ref" /><button className="btn btn-secondary">Search</button></form>
      <div className="card table-wrap"><table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th><th>IP</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td className="small">{dateTime(r.created_at)}</td><td>{r.user_name}</td>
              <td><span className={`badge ${/failed|locked|refund|cancel|deactivate/.test(r.action) ? "badge-warn" : ""}`}>{r.action}</span></td>
              <td className="small">{r.details}</td><td className="small muted">{r.ip}</td></tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="muted">Nothing yet.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
