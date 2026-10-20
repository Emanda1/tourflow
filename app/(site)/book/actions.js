"use server";
import { redirect } from "next/navigation";
import { createBooking, BookingError, MAX_TRAVELLERS } from "@/lib/bookings";
import { startCheckout, bookingPath, CheckoutError } from "@/lib/checkout";
import { rateLimit, HOUR } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { onlinePaymentsAvailable } from "@/lib/config";
import { expireUnpaidBookings } from "@/lib/db";

export async function submitBooking(prevState, formData) {
  if (formData.get("website")) return { error: "Something went wrong. Please try again." }; // spam trap
  if (!rateLimit(`book:${await clientIp()}`, 10, HOUR)) return { error: "Too many bookings from your connection. Please call us to complete your booking." };

  const count = Math.max(1, Math.min(MAX_TRAVELLERS, Number(formData.get("count")) || 1));
  const name = String(formData.get("name") || "");
  const travellers = Array.from({ length: count }, (_, i) => ({
    name: String(formData.get(`traveller_${i}`) || (i === 0 ? name : "")),
    phone: String(formData.get(`traveller_phone_${i}`) || ""),
  }));
  if (travellers.some((t) => !t.name.trim())) return { error: "Please enter a name for every traveller." };

  expireUnpaidBookings(); // free seats from abandoned bookings before checking availability
  let booking;
  try {
    booking = createBooking({
      departureId: Number(formData.get("departureId")),
      name,
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      travellers,
      plan: formData.get("plan") === "deposit" ? "deposit" : "full",
      notes: String(formData.get("notes") || ""),
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }

  let target = bookingPath(booking);
  if (onlinePaymentsAvailable) {
    try {
      target = await startCheckout(booking);
    } catch (e) {
      console.error("Payment start failed:", e.message);
      target = bookingPath(booking, e instanceof CheckoutError ? "&error=payment" : "&error=payment");
    }
  }
  redirect(target);
}
