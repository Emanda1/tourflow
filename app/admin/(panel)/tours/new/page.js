import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import Link from "next/link";
import TourForm from "@/components/TourForm";

export default async function NewTour({ searchParams }) {
  const user = await requireUser("tours.edit");
  const sp = await searchParams;
  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <Link href="/admin/tours" className="small">← All tours</Link>
      <h1>New tour</h1>
      {sp.error && <div className="alert alert-error" role="alert">{String(sp.error).slice(0, 200)}</div>}
      <TourForm />
    </div>
  );
}
