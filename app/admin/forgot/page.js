import Link from "next/link";
import { company } from "@/lib/config";
import ForgotForm from "./ForgotForm";
import LogoMark from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <main className="container" style={{ maxWidth: 420, paddingTop: 100 }}>
      <div className="logo" style={{ marginBottom: 20 }}><LogoMark />{company.name} staff</div>
      <h1 style={{ fontSize: "1.5rem" }}>Forgot your password?</h1>
      <p className="muted">Enter your email and we'll send you a link to choose a new one.</p>
      <ForgotForm />
      <p className="small" style={{ marginTop: 14 }}><Link href="/admin/login">← Back to sign in</Link></p>
    </main>
  );
}
