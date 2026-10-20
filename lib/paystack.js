// Paystack handles Ghana mobile money (MTN, Telecel, AirtelTigo) and cards.
// Docs: https://paystack.com/docs/api/transaction/

const BASE = "https://api.paystack.co";

async function call(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.status) throw new Error(json.message || "Paystack request failed");
  return json.data;
}

export function initializeTransaction({ email, amount, reference, callbackUrl, metadata }) {
  return call("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount, // pesewas
      currency: "GHS",
      reference,
      callback_url: callbackUrl,
      channels: ["mobile_money", "card"],
      metadata,
    }),
  });
}

export function verifyTransaction(reference) {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}
