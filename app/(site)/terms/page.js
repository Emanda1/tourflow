import { company } from "@/lib/config";

export const metadata = { title: "Booking terms" };

export default function Terms() {
  const c = company;
  return (
    <main className="page container prose" style={{ maxWidth: 760 }}>
      <h1>Booking terms</h1>
      <p className="muted small">This is a starting template. Have it reviewed so it matches how {c.name} actually works.</p>
      <h2>Making a booking</h2>
      <p>Your seats are held for a short time while you pay online. A booking is confirmed once we receive at least the deposit shown for the tour. You'll receive a booking reference by SMS and on screen; keep it safe.</p>
      <h2>Paying the balance</h2>
      <p>If you paid a deposit, the remaining balance must be paid before the trip departs. You can pay in instalments online using your booking link, or at our office.</p>
      <h2>Cancellations and refunds</h2>
      <p>{c.cancellationPolicy}</p>
      <h2>Changes by us</h2>
      <p>If we must cancel a trip, for example because of safety concerns or too few travellers, we will offer another date or a full refund of what you have paid.</p>
      <h2>Contact</h2>
      <p>{c.name} · {c.phone} · {c.email}</p>
    </main>
  );
}
