import { company } from "@/lib/config";
import LoginForm from "./LoginForm";

export const metadata = { title: "Staff login" };

export default function LoginPage() {
  return (
    <main className="container" style={{ maxWidth: 400, paddingTop: 100 }}>
      <div className="logo" style={{ marginBottom: 20 }}><span className="logo-mark" />{company.name} Admin</div>
      <LoginForm />
      {!process.env.ADMIN_PASSWORD && <p className="small muted" style={{ marginTop: 12 }}>Default password is <code>admin123</code>. Set ADMIN_PASSWORD in .env.local.</p>}
    </main>
  );
}
