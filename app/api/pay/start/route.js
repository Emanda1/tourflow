import { NextResponse } from "next/server";
import { startCheckout } from "@/lib/checkout";
import { toPesewas } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const cedis = url.searchParams.get("cedis");
  const amount = cedis ? toPesewas(cedis) : null;
  if (!ref) return NextResponse.redirect(new URL("/", request.url));
  try {
    const target = await startCheckout(ref, amount);
    return NextResponse.redirect(new URL(target, request.url));
  } catch (e) {
    console.error("Payment start failed:", e);
    return NextResponse.redirect(new URL(`/booking/${ref}?error=payment`, request.url));
  }
}
