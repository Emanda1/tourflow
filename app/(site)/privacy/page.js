import { company } from "@/lib/config";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  const c = company;
  return (
    <main className="page container prose" style={{ maxWidth: 760 }}>
      <h1>Privacy policy</h1>
      <p className="muted small">This is a starting template. Have it reviewed so it matches how {c.name} actually works.</p>
      <h2>Who we are</h2>
      <p>{c.name}{c.address ? `, ${c.address}` : ""}, is responsible for the personal information you give us. Contact: {c.email}, {c.phone}.</p>
      <h2>What we collect</h2>
      <p>When you book or ask for a quote we collect your name, phone number, email, the names (and optionally phone numbers) of the people travelling with you, your trip details and any special requests. Payments are handled by Paystack; we do not see or store your card or mobile money PIN.</p>
      <h2>Why we use it</h2>
      <p>To manage your booking, take payments, send confirmations and trip reminders by SMS or email, keep accounting records, and meet our legal obligations. We do not sell your information.</p>
      <h2>Who we share it with</h2>
      <p>Only the services needed to run your trip: our payment provider (Paystack), SMS and email providers, hotels, transport and guides involved in your trip, and authorities where the law requires it.</p>
      <h2>How long we keep it</h2>
      <p>Booking and payment records are kept for as long as required for accounting and tax purposes. You can ask us to delete information we no longer need.</p>
      <h2>Your rights</h2>
      <p>Under Ghana's Data Protection Act, 2012 (Act 843) you can ask to see the information we hold about you, have it corrected, or object to its use. Contact us at {c.email}.</p>
      <h2>Security</h2>
      <p>Access to booking information is limited to staff who need it, protected by individual passwords, and all activity is logged. The website uses encrypted (https) connections.</p>
    </main>
  );
}
