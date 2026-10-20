import { NextResponse } from "next/server";
import { completePayment } from "@/lib/checkout";

export const dynamic = "force-dynamic";

// Paystack redirects the customer here after payment: ?reference=...
export async function GET(request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
  const ref = reference?.split("-").slice(0, 2).join("-");
  try {
    const result = await completePayment(reference);
    if (!result) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.redirect(new URL(`/booking/${result.booking.ref}?${result.ok ? "paid=1" : "failed=1"}`, request.url));
  } catch (e) {
    console.error("Payment verification failed:", e);
    return NextResponse.redirect(new URL(`/booking/${ref}?error=payment`, request.url));
  }
}
