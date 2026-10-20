import { listDepartures } from "@/lib/db";
import { money, dateRange } from "@/lib/format";
import ManualBookingForm from "./ManualBookingForm";

export default function NewBooking() {
  const departures = listDepartures({ upcomingOnly: true, openOnly: true }).map((d) => ({
    id: d.id,
    label: `${d.tour_title} · ${dateRange(d.start_date, d.end_date)} · ${d.capacity - d.booked} seats left · ${money(d.price)}`,
  }));
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <h1>New booking</h1>
      <p className="muted">For walk-in, phone and WhatsApp customers. Website bookings appear automatically.</p>
      <ManualBookingForm departures={departures} />
    </div>
  );
}
