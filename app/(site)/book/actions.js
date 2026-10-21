"use server";
import { redirect } from "next/navigation";
import { createBooking, BookingError, MAX_TRAVELLERS } from "@/lib/bookings";
import { startCheckout, bookingPath, rememberPayingBooking } from "@/lib/checkout";
import { sendBookingReceived } from "@/lib/bookings";
import { rateLimit, HOUR } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { onlinePaymentsAvailable } from "@/lib/config";
import { expireUnpaidBookings } from "@/lib/db";

export async function submitBooking(prevState, formData) {
  if (formData.get("website")) return { error: "Something went wrong. Please try again." }; // spam trap
  if (!rateLimit(`book:${await clientIp()}`, 10, HOUR)) return { error: "Too many bookings from your connection. Please call us to complete your booking." };

  const count = Math.max(1, Math.floor(Number(formData.get("count")) || 1));
  if (count > MAX_TRAVELLERS) return { error: `For groups of more than ${MAX_TRAVELLERS}, please request a custom trip or call us.` };
  const name = String(formData.get("name") || "");
  const travellers = Array.from({ length: count }, (_, i) => ({
    name: String(formData.get(`traveller_${i}`) || (i === 0 ? name : "")),
    phone: String(formData.get(`traveller_phone_${i}`) || ""),
    type: String(formData.get(`traveller_type_${i}`) || ""),
  }));
  // Extras arrive as extra_<id> = quantity.
  const extras = [...formData.keys()].filter((k) => /^extra_\d{1,9}$/.test(k)).slice(0, 20)
    .map((k) => ({ id: Number(k.slice(6)), quantity: Math.floor(Number(formData.get(k))) || 0 }));
  if (travellers.some((t) => !t.name.trim())) return { error: "Please enter a name for every traveller." };

  if (onlinePaymentsAvailable) expireUnpaidBookings(); // free seats from abandoned bookings before checking availability
  let booking;
  try {
    booking = createBooking({
      departureId: Number(formData.get("departureId")),
      name,
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      travellers,
      extras,
      plan: formData.get("plan") === "deposit" ? "deposit" : "full",
      notes: String(formData.get("notes") || ""),
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }

  await sendBookingReceived(booking); // so the customer has their reference and link even if they abandon payment
  let target = bookingPath(booking);
  if (onlinePaymentsAvailable) {
    try {
      await rememberPayingBooking(booking);
      target = await startCheckout(booking);
    } catch (e) {
      console.error("Payment start failed:", e.message);
      target = bookingPath(booking, "&error=payment");
    }
  }
  redirect(target);
}
