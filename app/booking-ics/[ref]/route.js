import { getBookingForCustomer } from "@/lib/access";
import { company } from "@/lib/config";

export const dynamic = "force-dynamic";

// Escape text for calendar files (RFC 5545): backslash first, then ; and , and new lines.
const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");
// Lines longer than 75 characters must be folded onto continuation lines starting with a space.
const fold = (line) => (line.length <= 74 ? line : line.match(/.{1,73}/g).join("\r\n "));
const day = (iso) => iso.replace(/-/g, "");

// "Add to calendar" file for a booking (works with Google Calendar, iPhone and Outlook).
export async function GET(request, { params }) {
  const { ref } = await params;
  const b = getBookingForCustomer(ref, new URL(request.url).searchParams.get("k"));
  if (!b) return new Response("Not found", { status: 404 });
  const end = new Date((b.end_date || b.start_date) + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 1);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TourFlow//Booking//EN", "BEGIN:VEVENT",
    `UID:${b.ref}@tourflow`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${day(b.start_date)}`, `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, "")}`,
    `SUMMARY:${esc(b.tour_title)} (${b.ref})`,
    `LOCATION:${esc(b.pickup_point || "")}`,
    `DESCRIPTION:${esc(`Booking ${b.ref} with ${company.name}. Pickup: ${b.pickup_point || "TBC"} ${b.pickup_time || ""}. Questions: ${company.phone}`)}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(b.tour_title)} tomorrow`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].map(fold).join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${b.ref}.ics"`, "Cache-Control": "no-store" } });
}
