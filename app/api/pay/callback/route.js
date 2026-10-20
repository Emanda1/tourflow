import { NextResponse } from "next/server";
import { completePayment, bookingPath, payingBookingToken } from "@/lib/checkout";
import { appUrl } from "@/lib/config";
import { getBookingForCustomer } from "@/lib/access";

export const dynamic = "force-dynamic";

// Paystack sends the customer here after payment: ?reference=...
export async function GET(request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref") || "";
  const to = (path) => NextResponse.redirect(new URL(path, appUrl));
  try {
    const result = await completePayment(reference);
    if (!result) return to("/");
    const b = result.booking;
    // Only show the booking if this browser started the payment; otherwise ask them to look it up.
    if (!getBookingForCustomer(b.ref, await payingBookingToken(b.ref))) return to(`/find?${result.ok ? "paid=1" : "failed=1"}&ref=${b.ref}`);
    return to(bookingPath(b, result.ok ? "&paid=1" : "&failed=1"));
  } catch (e) {
    console.error("Payment verification failed:", e.message);
    return to("/find?error=payment");
  }
}
