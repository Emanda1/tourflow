import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { company, paystackEnabled } from "@/lib/config";
import AdminNav from "@/components/AdminNav";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }) {
  await requireAdmin();
  const counts = db.prepare(`SELECT
    (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending,
    (SELECT COUNT(*) FROM enquiries WHERE status = 'new') AS enquiries`).get();
  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/bookings", label: "Bookings", count: counts.pending },
    { href: "/admin/calendar", label: "Calendar" },
    { href: "/admin/departures", label: "Trips & manifests" },
    { href: "/admin/tours", label: "Tours" },
    { href: "/admin/enquiries", label: "Trip requests", count: counts.enquiries },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/team", label: "Guides, drivers & vehicles" },
    { href: "/admin/messages", label: "Messages" },
  ];
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Link href="/admin" className="logo"><span className="logo-mark" />{company.name}</Link>
        <AdminNav links={links} />
        <div className="bottom small">
          <p style={{ padding: "0 12px", opacity: .7 }}>Payments: {paystackEnabled ? "Paystack live" : "Demo mode"}</p>
          <Link href="/" target="_blank" style={{ display: "block", padding: "6px 12px", color: "#d6e4e2" }}>View website ↗</Link>
          <form action={logout}><button className="btn btn-sm btn-secondary" style={{ margin: "8px 12px" }}>Sign out</button></form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
