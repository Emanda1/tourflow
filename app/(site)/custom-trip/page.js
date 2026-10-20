import EnquiryForm from "./EnquiryForm";

export const metadata = { title: "Request a custom trip" };

export default function CustomTripPage() {
  return (
    <main className="page container" style={{ maxWidth: 760 }}>
      <h1>Plan a custom trip</h1>
      <p className="muted">Family holiday, school excursion, church retreat or company team-building: tell us what you have in mind and we'll design it around your dates and budget.</p>
      <EnquiryForm />
    </main>
  );
}
