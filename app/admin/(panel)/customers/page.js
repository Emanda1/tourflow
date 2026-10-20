import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { money, date } from "@/lib/format";
import Link from "next/link";

export default async function CustomersPage({ searchParams }) {
  const user = await requireUser("customers.view");
  const { q = "" } = await searchParams;
  const digits = String(q).replace(/\D/g, "");
  const phoneQ = digits.length >= 4 ? (digits.startsWith("0") ? "233" + digits.slice(1) : digits) : "";
  const customers = db.prepare(`SELECT c.*,
      COUNT(DISTINCT b.id) AS trips,
      COALESCE((SELECT SUM(CASE WHEN p.kind = 'refund' THEN -p.amount ELSE p.amount END) FROM payments p JOIN bookings b2 ON b2.id = p.booking_id WHERE b2.customer_id = c.id AND p.status = 'success'), 0) AS spent,
      MAX(d.start_date) AS last_trip
    FROM customers c
    LEFT JOIN bookings b ON b.customer_id = c.id AND b.status != 'cancelled'
    LEFT JOIN departures d ON d.id = b.departure_id
    WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR (? != '' AND replace(c.phone, '+', '') LIKE ?)
    GROUP BY c.id ORDER BY spent DESC`).all(`%${q}%`, `%${q}%`, `%${q}%`, phoneQ, `%${phoneQ}%`);
  return (
    <div className="stack">
      <h1>Customers</h1>
      <form className="filters"><input name="q" defaultValue={q} placeholder="Search name, phone or email" /><button className="btn btn-secondary">Search</button></form>
      <div className="card table-wrap"><table>
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Trips</th><th>Last trip</th><th className="num">Total spent</th></tr></thead>
        <tbody>{customers.map((c) => (
          <tr key={c.id}>
            <td><Link href={`/admin/bookings?q=${encodeURIComponent(c.phone)}`}><strong>{c.name}</strong></Link></td>
            <td>{c.phone}</td><td>{c.email || "—"}</td><td>{c.trips}</td><td>{c.last_trip ? date(c.last_trip) : "—"}</td>
            <td className="num">{money(c.spent)}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
