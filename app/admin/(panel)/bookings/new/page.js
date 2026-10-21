import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db, listDepartures } from "@/lib/db";
import { tourOptions, mainLabel } from "@/lib/pricing";
import { money, dateRange } from "@/lib/format";
import ManualBookingForm from "./ManualBookingForm";

export default async function NewBooking() {
  const user = await requireUser("bookings.edit");
  const optionsByTour = {};
  const departures = listDepartures({ upcomingOnly: true, openOnly: true }).map((d) => {
    const o = optionsByTour[d.tour_id] ??= (() => {
      const opts = tourOptions(d.tour_id);
      return { ...opts, baseLabel: mainLabel(db.prepare("SELECT price_label FROM tours WHERE id = ?").get(d.tour_id), opts) };
    })();
    return {
    id: d.id,
    price: d.price,
    types: o.types,
    extras: o.extras,
    baseLabel: o.baseLabel,
    label: `${d.tour_title} · ${dateRange(d.start_date, d.end_date)} · ${d.capacity - d.booked} seats left · ${money(d.price)}`,
    };
  });
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <h1>New booking</h1>
      <p className="muted">For walk-in, phone and WhatsApp customers. Website bookings appear automatically.</p>
      <ManualBookingForm departures={departures} />
    </div>
  );
}
