import { NextResponse } from "next/server";
import { completePayment, bookingPath } from "@/lib/checkout";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

// Paystack sends the customer here after payment: ?reference=...
export async function GET(request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref") || "";
  const to = (path) => NextResponse.redirect(new URL(path, appUrl));
  try {
    const result = await completePayment(reference);
    if (!result) return to("/");
    return to(bookingPath(result.booking, result.ok ? "&paid=1" : "&failed=1"));
  } catch (e) {
    console.error("Payment verification failed:", e.message);
    return to("/find?error=payment");
  }
}
