import Link from "next/link";
import { company } from "@/lib/config";
import { findResetUser } from "@/lib/passwordReset";
import ResetForm from "./ResetForm";
import LogoMark from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPage({ searchParams }) {
  const { t } = await searchParams;
  const user = findResetUser(typeof t === "string" ? t : "");
  return (
    <main className="container" style={{ maxWidth: 420, paddingTop: 100 }}>
      <div className="logo" style={{ marginBottom: 20 }}><LogoMark />{company.name} staff</div>
      {user ? (
        <>
          <h1 style={{ fontSize: "1.5rem" }}>Choose a new password</h1>
          <p className="muted">For {user.email}. This also unlocks the account and signs you out on other devices.</p>
          <ResetForm token={t} />
        </>
      ) : (
        <div className="card card-pad">
          <h1 style={{ fontSize: "1.3rem" }}>{t ? "This link has expired" : "Reset link missing"}</h1>
          <p className="muted">{t ? "Reset links work once and only for 30 minutes." : "Open the link from your email, or ask for a new one."}</p>
          <Link className="btn" href="/admin/forgot">Send a new link</Link>
        </div>
      )}
    </main>
  );
}
