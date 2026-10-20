import Link from "next/link";
import { listBookings } from "@/lib/db";
import BookingsTable from "@/components/BookingsTable";

export default async function BookingsPage({ searchParams }) {
  const { status = "", q = "" } = await searchParams;
  return (
    <div className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>Bookings</h1>
        <div className="row">
          <a href="/admin/export/bookings" className="btn btn-secondary">Export CSV</a>
          <Link href="/admin/bookings/new" className="btn">+ New booking</Link>
        </div>
      </div>
      <BookingsTable bookings={listBookings()} initialQuery={q} initialTab={status || "all"} />
    </div>
  );
}
