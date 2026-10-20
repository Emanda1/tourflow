import { headers } from "next/headers";

/** Best-effort client IP. Behind a proxy, set TRUST_PROXY=true so X-Forwarded-For is used. */
export async function clientIp() {
  const h = await headers();
  if (process.env.TRUST_PROXY === "true") {
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  }
  return h.get("x-real-ip") || "local";
}

export async function userAgent() {
  return ((await headers()).get("user-agent") || "").slice(0, 200);
}
