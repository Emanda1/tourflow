export const company = {
  name: process.env.COMPANY_NAME || "TourFlow Travels",
  phone: process.env.COMPANY_PHONE || "+233 24 000 0000",
  email: process.env.COMPANY_EMAIL || "hello@example.com",
  whatsapp: (process.env.COMPANY_WHATSAPP || process.env.COMPANY_PHONE || "+233240000000").replace(/\D/g, ""),
};

export const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const paystackEnabled = Boolean(process.env.PAYSTACK_SECRET_KEY);
