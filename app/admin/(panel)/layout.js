import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ROLES } from "@/lib/permissions";
import { company, paystackEnabled, demoPaymentsAllowed } from "@/lib/config";
import AdminNav from "@/components/AdminNav";
import LiveUpdates from "@/components/LiveUpdates";
import { logout } from "../account-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }) {
  const user = await requireUser();
  const counts = db.prepare(`SELECT
    (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending,
    (SELECT COUNT(*) FROM enquiries WHERE status = 'new') AS enquiries`).get();
  const links = [
    { href: "/admin", label: "Dashboard", perm: "dashboard.view" },
    { href: "/admin/bookings", label: "Bookings", count: counts.pending, perm: "bookings.view" },
    { href: "/admin/calendar", label: "Calendar", perm: "trips.view" },
    { href: "/admin/departures", label: "Trips & manifests", perm: "trips.view" },
    { href: "/admin/tours", label: "Tours", perm: "tours.edit" },
    { href: "/admin/enquiries", label: "Trip requests", count: counts.enquiries, perm: "enquiries.manage" },
    { href: "/admin/customers", label: "Customers", perm: "customers.view" },
    { href: "/admin/team", label: "Guides, drivers & vehicles", perm: "team.manage" },
    { href: "/admin/messages", label: "Messages", perm: "messages.view" },
    { href: "/admin/staff", label: "Staff accounts", perm: "staff.manage" },
    { href: "/admin/settings", label: "Settings", perm: "settings.manage" },
    { href: "/admin/backups", label: "Backups", perm: "backups.manage" },
    { href: "/admin/audit", label: "Activity log", perm: "audit.view" },
  ].filter((l) => can(user, l.perm)).map(({ perm, ...l }) => l);
  const payMode = paystackEnabled ? ((process.env.PAYSTACK_SECRET_KEY || "").startsWith("sk_test_") ? "Paystack (test)" : "Paystack live") : demoPaymentsAllowed ? "Demo mode" : "Staff-recorded only";

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Link href="/admin" className="logo"><span className="logo-mark" />{company.name}</Link>
        <AdminNav links={links} />
        <div className="bottom small">
          <Link href="/admin/account" className="sidebar-user">
            <strong>{user.name}</strong><span>{ROLES[user.role]}</span>
          </Link>
          <LiveUpdates />
          <p style={{ padding: "0 12px", opacity: .7 }}>Payments: {payMode}</p>
          <Link href="/" target="_blank" style={{ display: "block", padding: "6px 12px", color: "#d6e4e2" }}>View website ↗</Link>
          <form action={logout}><button className="btn btn-sm btn-secondary" style={{ margin: "8px 12px" }}>Sign out</button></form>
        </div>
      </aside>
      <main className="admin-main">
        {user.must_change_password ? <div className="alert alert-info">Please <Link href="/admin/account">choose your own password</Link> before continuing.</div> : null}
        {children}
      </main>
    </div>
  );
}
