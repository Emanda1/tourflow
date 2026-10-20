import { redirect } from "next/navigation";
import { company } from "@/lib/config";
import { currentUser, userCount } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff sign in", robots: { index: false } };

export default async function LoginPage() {
  if (userCount() === 0) redirect("/admin/setup");
  if (await currentUser()) redirect("/admin");
  return (
    <main className="container" style={{ maxWidth: 400, paddingTop: 100 }}>
      <div className="logo" style={{ marginBottom: 20 }}><span className="logo-mark" />{company.name} staff</div>
      <LoginForm />
    </main>
  );
}
