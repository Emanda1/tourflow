import { requireUser } from "@/lib/auth";
import { company, appUrl, paystackEnabled, demoPaymentsAllowed } from "@/lib/config";
import { getSetting } from "@/lib/db";
import Toast from "@/components/Toast";
import { saveSettings, sendTestSms } from "../../account-actions";
import { ipDiagnostics, isPrivateIp } from "@/lib/request";

export default async function SettingsPage({ searchParams }) {
  await requireUser("settings.manage");
  const sp = await searchParams;
  const sms = Boolean(process.env.ARKESEL_API_KEY);
  // Show only what the owner has actually saved; the built-in defaults appear as grey hints.
  const saved = (k) => getSetting(k) || "";
  const email = Boolean(process.env.SMTP_HOST);
  const ip = await ipDiagnostics();
  const ipOk = !isPrivateIp(ip.detected);
  const status = (ok, on, off) => <span className={`badge ${ok ? "badge-ok" : "badge-warn"}`}>{ok ? on : off}</span>;
  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <h1 style={{ margin: 0 }}>Settings</h1>
      <Toast message={sp.saved ? "Settings saved" : sp.smsok ? "Test SMS sent. Check the phone." : null} />
      {sp.welcome && <div className="alert alert-ok">Your owner account is ready. Start by filling in your company details below, then add your staff under Staff accounts.</div>}
      {sp.error && <div className="alert alert-error" role="alert">{String(sp.error).slice(0, 200)}</div>}

      <form action={saveSettings} className="card card-pad">
        <h2>Company details</h2>
        <p className="small muted">Shown on the website, receipts, emails and SMS.</p>
        <div className="form-grid">
          <div className="field"><label htmlFor="cn">Company name</label><input id="cn" name="company_name" defaultValue={saved("company_name") || company.name} required maxLength={80} /></div>
          <div className="field"><label htmlFor="cp">Phone</label><input id="cp" name="company_phone" defaultValue={saved("company_phone")} placeholder="024 123 4567" maxLength={30} inputMode="tel" /></div>
          <div className="field"><label htmlFor="cw">WhatsApp number</label><input id="cw" name="company_whatsapp" defaultValue={saved("company_whatsapp")} placeholder="Same as phone if empty" maxLength={30} inputMode="tel" /></div>
          <div className="field"><label htmlFor="ce">Email</label><input id="ce" name="company_email" type="email" defaultValue={saved("company_email")} placeholder="bookings@yourcompany.com" maxLength={160} /></div>
        </div>
        <div className="field"><label htmlFor="ca">Address</label><input id="ca" name="company_address" defaultValue={saved("company_address")} placeholder="e.g. 12 Oxford Street, Osu, Accra" maxLength={200} /></div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="logo">Logo (JPG, PNG or WebP)</label>
            {company.logo && <img src={company.logo} alt="Current logo" style={{ maxHeight: 48, display: "block", marginBottom: 8 }} />}
            <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
            {company.logo && <label className="inline-check small" style={{ marginTop: 6 }}><input type="checkbox" name="remove_logo" /> Remove logo</label>}
          </div>
          <div className="field"><label htmlFor="bc">Brand colour</label><input id="bc" name="brand_color" type="color" defaultValue={company.brandColor || "#0f766e"} style={{ height: 44 }} /></div>
        </div>
        <div className="field"><label htmlFor="cpol">Cancellation & refund policy</label><textarea id="cpol" name="cancellation_policy" defaultValue={saved("cancellation_policy") || company.cancellationPolicy} maxLength={2000} rows={4} /></div>
        <button className="btn">Save settings</button>
      </form>

      <section className="card card-pad">
        <h2>Connections</h2>
        <p className="small muted">These are set in the server's environment settings (not here) because they contain secret keys. See DEPLOYMENT.md.</p>
        <dl className="kv">
          <dt>Website address</dt><dd>{appUrl}</dd>
          <dt>Online payments</dt><dd>{status(paystackEnabled, (process.env.PAYSTACK_SECRET_KEY || "").startsWith("sk_test_") ? "Paystack test mode" : "Paystack live", demoPaymentsAllowed ? "Demo mode (no real money)" : "Off: staff record payments")}</dd>
          <dt>SMS</dt><dd>{status(sms, "Arkesel connected", "Off: messages are only logged")}</dd>
          <dt>SMS sender name</dt><dd>{process.env.SMS_SENDER_ID || "TourFlow"}</dd>
          <dt>Email receipts</dt><dd>{status(email, "Email connected", "Off")}</dd>
          <dt>Visitor addresses</dt><dd>{status(ipOk, "Working", "Needs setting up")} <span className="small muted">Your address as the system sees it: {ip.detected}</span></dd>
        </dl>
        {!ipOk && (
          <details className="small" style={{ marginTop: 8 }}>
            <summary>Why this matters and how to fix it</summary>
            <p>The system uses each visitor's address to stop spam bookings and to record who signed in. Right now it sees your hosting company's address instead of yours, so the server's IP settings need adjusting (see "Visitor addresses" in DEPLOYMENT.md). What the server received:</p>
            <ul>
              <li>X-Forwarded-For: <code>{ip.xff || "(none)"}</code></li>
              <li>True-Client-IP: <code>{ip.trueClientIp || "(none)"}</code></li>
              <li>CF-Connecting-IP: <code>{ip.cfConnectingIp || "(none)"}</code></li>
              <li>X-Real-IP: <code>{ip.xRealIp || "(none)"}</code></li>
            </ul>
          </details>
        )}
        <form action={sendTestSms} className="row" style={{ marginTop: 16 }}>
          <input name="phone" placeholder="Your phone, e.g. 024 123 4567" maxLength={30} required style={{ maxWidth: 260 }} />
          <button className="btn btn-secondary">Send test SMS</button>
        </form>
      </section>
    </div>
  );
}
