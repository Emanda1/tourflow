import { NextResponse } from "next/server";
import { startCheckout, bookingPath, rememberPayingBooking } from "@/lib/checkout";
import { getBookingForCustomer } from "@/lib/access";
import { toPesewas } from "@/lib/format";
import { rateLimit, MINUTE } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  // Our own pages stay on whatever address the visitor is using; only Paystack links are absolute.
  const to = (path) => NextResponse.redirect(path.startsWith("/") ? new URL(path, request.url) : new URL(path), 303);
  const booking = getBookingForCustomer(url.searchParams.get("ref"), url.searchParams.get("k"));
  if (!booking) return to("/find");
  if (!rateLimit(`pay:${await clientIp()}`, 20, 10 * MINUTE)) return to(bookingPath(booking, "&error=busy"));
  const cedis = url.searchParams.get("cedis");
  try {
    await rememberPayingBooking(booking);
    return to(await startCheckout(booking, cedis ? toPesewas(cedis) : null));
  } catch (e) {
    console.error("Payment start failed:", e.message);
    return to(bookingPath(booking, "&error=payment"));
  }
}
