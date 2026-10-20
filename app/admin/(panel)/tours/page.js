import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export default async function ToursPage() {
  const user = await requireUser("tours.edit");
  const tours = db.prepare(`SELECT t.*,
      (SELECT COUNT(*) FROM departures d WHERE d.tour_id = t.id AND d.start_date >= date('now') AND d.status = 'open') AS upcoming
    FROM tours t ORDER BY t.title`).all();
  return (
    <div className="stack">
      <div className="spread"><h1 style={{ margin: 0 }}>Tours & packages</h1><Link className="btn" href="/admin/tours/new">+ New tour</Link></div>
      <div className="card table-wrap"><table>
        <thead><tr><th>Tour</th><th>Category</th><th>Days</th><th className="num">Price</th><th>Deposit</th><th>Open dates</th><th>Website</th></tr></thead>
        <tbody>{tours.map((t) => (
          <tr key={t.id}>
            <td><Link href={`/admin/tours/${t.id}`}><strong>{t.title}</strong></Link><div className="small muted">{t.destination}</div></td>
            <td>{t.category}</td><td>{t.duration_days}</td><td className="num">{money(t.price)}</td><td>{t.deposit_percent}%</td>
            <td>{t.upcoming}</td>
            <td>{t.active ? <span className="badge badge-ok">Live</span> : <span className="badge badge-closed">Hidden</span>}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
