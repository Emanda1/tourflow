import { isAdmin } from "@/lib/auth";
import { db, getDeparture } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const dep = getDeparture(Number(id));
  if (!dep) return new Response("Not found", { status: 404 });
  const rows = db.prepare(`SELECT tr.name, tr.phone, tr.checked_in, b.ref, c.name AS contact, c.phone AS contact_phone
    FROM travellers tr JOIN bookings b ON b.id = tr.booking_id JOIN customers c ON c.id = b.customer_id
    WHERE b.departure_id = ? AND b.status != 'cancelled' ORDER BY tr.name`).all(dep.id);
  const csv = toCsv(rows, [
    ["name", "Traveller"], ["phone", "Phone"], ["ref", "Booking"], ["contact", "Lead contact"], ["contact_phone", "Contact phone"],
    [(r) => (r.checked_in ? "Yes" : "No"), "Checked in"],
  ]);
  return csvResponse(csv, `manifest-${dep.tour_slug}-${dep.start_date}.csv`);
}
