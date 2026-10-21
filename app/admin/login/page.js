import { redirect } from "next/navigation";
import { company } from "@/lib/config";
import { currentUser, userCount } from "@/lib/auth";
import LoginForm from "./LoginForm";
import LogoMark from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }) {
  const { reset } = await searchParams;
  if (userCount() === 0) redirect("/admin/setup");
  if (await currentUser()) redirect("/admin");
  return (
    <main className="container" style={{ maxWidth: 400, paddingTop: 100 }}>
      <div className="logo" style={{ marginBottom: 20 }}><LogoMark />{company.name} staff</div>
      {reset && <div className="alert alert-ok" role="status">Password changed. Sign in with your new password.</div>}
      <LoginForm />
    </main>
  );
}
