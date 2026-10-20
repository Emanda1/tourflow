import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import Link from "next/link";
import { listBookings } from "@/lib/db";
import BookingsTable from "@/components/BookingsTable";

export default async function BookingsPage({ searchParams }) {
  const user = await requireUser("bookings.view");
  const { status = "", q = "" } = await searchParams;
  return (
    <div className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>Bookings</h1>
        <div className="row">
          {can(user, "data.export") && <a href="/admin/export/bookings" className="btn btn-secondary">Export CSV</a>}
          {can(user, "bookings.edit") && <Link href="/admin/bookings/new" className="btn">+ New booking</Link>}
        </div>
      </div>
      <BookingsTable bookings={listBookings()} initialQuery={q} initialTab={status || "all"} />
    </div>
  );
}
