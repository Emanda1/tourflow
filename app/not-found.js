import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container" style={{ maxWidth: 520, padding: "100px 20px", textAlign: "center" }}>
      <h1>Page not found</h1>
      <p className="muted">The page may have moved, or the link is incomplete. If you're looking for your booking, use "Find my booking" with your reference and phone number.</p>
      <div className="row" style={{ justifyContent: "center" }}><Link className="btn" href="/">Home</Link><Link className="btn btn-secondary" href="/find">Find my booking</Link></div>
    </main>
  );
}
