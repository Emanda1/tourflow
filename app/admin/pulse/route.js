import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Tiny "anything new?" check used by the admin to show live notifications.
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const out = {};
  if (can(user, "bookings.view")) {
    const b = db.prepare("SELECT id, ref, contact_name, travellers FROM bookings ORDER BY id DESC LIMIT 1").get();
    out.booking = b ? { id: b.id, ref: b.ref, name: (b.contact_name || "").split(" ")[0], travellers: b.travellers } : null;
    const p = db.prepare("SELECT id, booking_id, amount FROM payments WHERE status = 'success' AND kind = 'payment' ORDER BY id DESC LIMIT 1").get();
    out.payment = p ? { id: p.id, bookingId: p.booking_id, amount: p.amount } : null;
  }
  if (can(user, "enquiries.manage")) out.enquiry = db.prepare("SELECT MAX(id) AS id FROM enquiries").get().id || 0;
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
