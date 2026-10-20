import { NextResponse } from "next/server";
import { startCheckout, bookingPath } from "@/lib/checkout";
import { getBookingForCustomer } from "@/lib/access";
import { toPesewas } from "@/lib/format";
import { rateLimit, MINUTE } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const to = (path) => NextResponse.redirect(new URL(path, appUrl), 303);
  const booking = getBookingForCustomer(url.searchParams.get("ref"), url.searchParams.get("k"));
  if (!booking) return to("/find");
  if (!rateLimit(`pay:${await clientIp()}`, 20, 10 * MINUTE)) return to(bookingPath(booking, "&error=busy"));
  const cedis = url.searchParams.get("cedis");
  try {
    return to(await startCheckout(booking, cedis ? toPesewas(cedis) : null));
  } catch (e) {
    console.error("Payment start failed:", e.message);
    return to(bookingPath(booking, "&error=payment"));
  }
}
