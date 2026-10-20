import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import Link from "next/link";

export default async function MessagesPage() {
  const user = await requireUser("messages.view");
  const rows = db.prepare(`SELECT n.*, b.ref FROM notifications n LEFT JOIN bookings b ON b.id = n.booking_id ORDER BY n.id DESC LIMIT 200`).all();
  const smsLive = Boolean(process.env.ARKESEL_API_KEY);
  return (
    <div className="stack">
      <h1>Messages</h1>
      {!smsLive && <div className="alert alert-info">SMS sending is off, so messages are only logged here. Add ARKESEL_API_KEY in <code>.env.local</code> to send real SMS.</div>}
      <div className="card table-wrap"><table>
        <thead><tr><th>When</th><th>To</th><th>Booking</th><th>Message</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td className="small">{date(m.created_at)}</td><td>{m.recipient}</td>
              <td>{m.ref ? <Link href={`/admin/bookings/${m.booking_id}`}>{m.ref}</Link> : "—"}</td>
              <td className="small">{m.message}</td><td><span className={`badge badge-${m.status}`}>{m.status}</span>{m.error && <div className="small muted">{m.error}</div>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="muted">No messages yet.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
