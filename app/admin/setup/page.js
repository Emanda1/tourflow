import { redirect } from "next/navigation";
import { userCount } from "@/lib/auth";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up", robots: { index: false } };

export default function SetupPage() {
  if (userCount() > 0) redirect("/admin/login");
  return (
    <main className="container" style={{ maxWidth: 440, paddingTop: 80 }}>
      <h1>Welcome to TourFlow</h1>
      <p className="muted">Create the owner account. The owner can add staff, change company settings and download backups.</p>
      <SetupForm needsCode={process.env.NODE_ENV === "production"} />
    </main>
  );
}
