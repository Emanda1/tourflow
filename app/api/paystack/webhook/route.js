import crypto from "node:crypto";
import { completePayment } from "@/lib/checkout";

// Set this URL as the webhook in your Paystack dashboard:
//   https://YOUR-DOMAIN/api/paystack/webhook
// It makes sure payments are recorded even if the customer closes the browser.
export async function POST(request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new Response("Not configured", { status: 404 });
  const raw = await request.text();
  if (raw.length > 100_000) return new Response("Too large", { status: 413 });
  const expected = crypto.createHmac("sha512", secret).update(raw).digest();
  const given = Buffer.from(request.headers.get("x-paystack-signature") || "", "hex");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return new Response("Bad signature", { status: 401 });

  let event;
  try { event = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (event.event === "charge.success" && typeof event.data?.reference === "string") {
    try { await completePayment(event.data.reference); } catch (e) { console.error("Webhook payment error:", e.message); return new Response("Retry", { status: 500 }); }
  }
  return new Response("ok");
}
