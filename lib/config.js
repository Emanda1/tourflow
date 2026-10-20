import { getSetting } from "./db.js";

// Company details are edited in Admin → Settings. Environment variables are used as defaults.
const pick = (key, env, fallback) => getSetting(key) || process.env[env] || fallback;

export const company = {
  get name() { return pick("company_name", "COMPANY_NAME", "TourFlow Travels"); },
  get phone() { return pick("company_phone", "COMPANY_PHONE", "+233 24 000 0000"); },
  get email() { return pick("company_email", "COMPANY_EMAIL", "hello@example.com"); },
  get address() { return pick("company_address", "COMPANY_ADDRESS", ""); },
  get whatsapp() { return pick("company_whatsapp", "COMPANY_WHATSAPP", this.phone).replace(/\D/g, ""); },
  get logo() { return getSetting("logo_url") || ""; },
  get brandColor() { const c = getSetting("brand_color") || ""; return /^#[0-9a-f]{6}$/i.test(c) ? c : ""; },
  get cancellationPolicy() {
    return getSetting("cancellation_policy") ||
      "Deposits are non-refundable within 14 days of departure. Cancellations made earlier receive a refund of payments minus the deposit. Contact us to change dates.";
  },
};

export const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const isProduction = process.env.NODE_ENV === "production";
export const paystackEnabled = Boolean(process.env.PAYSTACK_SECRET_KEY);
/** Demo payments mark bookings as paid without real money, so they are off in production by default. */
export const demoPaymentsAllowed = !paystackEnabled && (process.env.ALLOW_DEMO_PAYMENTS
  ? process.env.ALLOW_DEMO_PAYMENTS === "true"
  : !isProduction);
export const onlinePaymentsAvailable = paystackEnabled || demoPaymentsAllowed;
