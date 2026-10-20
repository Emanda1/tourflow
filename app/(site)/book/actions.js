"use server";
import { redirect } from "next/navigation";
import { createBooking, BookingError } from "@/lib/bookings";
import { startCheckout } from "@/lib/checkout";

export async function submitBooking(prevState, formData) {
  const count = Math.max(1, Math.min(30, Number(formData.get("count")) || 1));
  const name = String(formData.get("name") || "");
  const travellers = Array.from({ length: count }, (_, i) => ({
    name: String(formData.get(`traveller_${i}`) || (i === 0 ? name : "")),
    phone: String(formData.get(`traveller_phone_${i}`) || ""),
  }));
  if (travellers.some((t) => !t.name.trim())) return { error: "Please enter a name for every traveller." };

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
  let target = `/booking/${booking.ref}`;
  try {
    target = await startCheckout(booking.ref);
  } catch (e) {
    console.error("Payment start failed:", e);
    target = `/booking/${booking.ref}?error=payment`;
  }
  redirect(target);
}
