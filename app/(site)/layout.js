import Link from "next/link";
import { company } from "@/lib/config";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function SiteLayout({ children }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="logo">{company.logo ? <img src={company.logo} alt="" style={{ height: 32, width: "auto" }} /> : <span className="logo-mark" />}{company.name}</Link>
          <nav className="nav">
            <Link href="/#tours">Tours</Link>
            <Link href="/custom-trip">Custom trip</Link>
            <Link href="/find" className="btn btn-sm">My booking</Link>
          </nav>
        </div>
      </header>
      {children}
      <WhatsAppButton />
      <footer className="site-footer">
        <div className="container spread">
          <div>
            <strong>{company.name}</strong><br />
            {company.phone} · {company.email}
          </div>
          <div className="small">Secure payments by mobile money and card · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/admin">Staff login</Link></div>
        </div>
      </footer>
    </>
  );
}
