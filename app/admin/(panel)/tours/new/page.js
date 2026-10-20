import Link from "next/link";
import TourForm from "@/components/TourForm";

export default function NewTour() {
  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <Link href="/admin/tours" className="small">← All tours</Link>
      <h1>New tour</h1>
      <TourForm />
    </div>
  );
}
