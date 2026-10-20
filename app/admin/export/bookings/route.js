import { isAdmin } from "@/lib/auth";
import { listBookings } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";
const cedis = (p) => (p / 100).toFixed(2);

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const csv = toCsv(listBookings(), [
    ["ref", "Reference"], ["created_at", "Booked on"], ["customer_name", "Customer"], ["customer_phone", "Phone"],
    ["customer_email", "Email"], ["tour_title", "Tour"], ["start_date", "Travel date"], ["travellers", "Travellers"],
    ["status", "Status"], ["payment_plan", "Plan"], ["source", "Source"],
    [(b) => cedis(b.total), "Total (GHS)"], [(b) => cedis(b.paid), "Paid (GHS)"], [(b) => cedis(b.balance), "Balance (GHS)"],
  ]);
  return csvResponse(csv, `bookings-${new Date().toISOString().slice(0, 10)}.csv`);
}
