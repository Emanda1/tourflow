import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { db, getDeparture } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const user = await currentUser();
  if (!can(user, "data.export") || user.must_change_password) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const dep = getDeparture(Number(id));
  if (!dep) return new Response("Not found", { status: 404 });
  await audit(user, "export.manifest", `${dep.tour_title} ${dep.start_date} (#${dep.id})`);
  const rows = db.prepare(`SELECT tr.name, tr.phone, tr.checked_in, tr.price_type, b.ref,
         (SELECT group_concat(x.label || ' x' || x.quantity, '; ') FROM booking_extras x WHERE x.booking_id = b.id) AS extras, COALESCE(b.contact_name, c.name) AS contact, c.phone AS contact_phone
    FROM travellers tr JOIN bookings b ON b.id = tr.booking_id JOIN customers c ON c.id = b.customer_id
    WHERE b.departure_id = ? AND b.status != 'cancelled' ORDER BY tr.name`).all(dep.id);
  const csv = toCsv(rows, [
    ["name", "Traveller"], ["price_type", "Type"], ["phone", "Phone"], ["ref", "Booking"], ["extras", "Booking extras"], ["contact", "Lead contact"], ["contact_phone", "Contact phone"],
    [(r) => (r.checked_in ? "Yes" : "No"), "Checked in"],
  ]);
  return csvResponse(csv, `manifest-${dep.tour_slug}-${dep.start_date}.csv`);
}
