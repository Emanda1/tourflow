import crypto from "node:crypto";
import { completePayment } from "@/lib/checkout";

// Set this URL as the webhook in your Paystack dashboard:
//   https://YOUR-DOMAIN/api/paystack/webhook
// It makes sure payments are recorded even if the customer closes the browser.
export async function POST(request) {
  const raw = await request.text();
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new Response("Not configured", { status: 400 });
  const signature = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (signature !== request.headers.get("x-paystack-signature")) return new Response("Bad signature", { status: 401 });

  const event = JSON.parse(raw);
  if (event.event === "charge.success") {
    try { await completePayment(event.data.reference); } catch (e) { console.error(e); }
  }
  return new Response("ok");
}
