// Checks the server settings at start-up. In production, unsafe settings stop the app from starting.
export function checkEnvironment() {
  const prod = process.env.NODE_ENV === "production";
  const problems = [];
  const warnings = [];

  if (prod) {
    const url = process.env.APP_URL || "";
    if (!/^https:\/\//.test(url)) problems.push("APP_URL must be set to your https:// website address.");
    if (process.env.ALLOW_DEMO_PAYMENTS === "true") warnings.push("ALLOW_DEMO_PAYMENTS is on: anyone can mark bookings as paid without real money. Turn it off before taking real customers.");
    if (!process.env.PAYSTACK_SECRET_KEY) warnings.push("PAYSTACK_SECRET_KEY is not set: customers cannot pay online (staff can still record payments).");
    if ((process.env.PAYSTACK_SECRET_KEY || "").startsWith("sk_test_")) warnings.push("Paystack is in TEST mode: no real money will be collected.");
    if (process.env.SETUP_CODE && process.env.SETUP_CODE.length < 12) problems.push("SETUP_CODE must be at least 12 characters.");
    if (process.env.SEED_DEMO_DATA === "true") warnings.push("SEED_DEMO_DATA is on: sample tours and bookings will be created in an empty database.");
  }
  if (process.env.ADMIN_PASSWORD) warnings.push("ADMIN_PASSWORD is no longer used. Staff now sign in with their own accounts; you can delete it.");

  for (const w of warnings) console.warn(`[config] WARNING: ${w}`);
  if (problems.length) {
    for (const p of problems) console.error(`[config] ERROR: ${p}`);
    throw new Error("Unsafe server settings. Fix the errors above and restart.");
  }
}
