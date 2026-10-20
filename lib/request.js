import { headers } from "next/headers";

/**
 * The visitor's IP address, used for rate limits and the activity log.
 *
 * Headers can be faked by anyone, so they are only read when the operator says a proxy is in front:
 *  - IP_HEADER=cf-connecting-ip (or x-real-ip): a single header your proxy always overwrites.
 *  - TRUST_PROXY=true: read X-Forwarded-For from the RIGHT, skipping TRUST_PROXY_HOPS-1 proxies
 *    (the left-most values are supplied by the visitor and can't be trusted).
 * Without either, every request is treated as coming from one address ("direct").
 */
export async function clientIp() {
  const h = await headers();
  const named = process.env.IP_HEADER;
  if (named) {
    const v = (h.get(named) || "").trim();
    if (v && v.length <= 45) return v;
  }
  if (process.env.TRUST_PROXY === "true") {
    const list = (h.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const hops = Math.max(1, Number(process.env.TRUST_PROXY_HOPS || 1));
    const ip = list[list.length - hops];
    if (ip && ip.length <= 45) return ip;
  }
  return "direct";
}

export async function userAgent() {
  return ((await headers()).get("user-agent") || "").slice(0, 200);
}
