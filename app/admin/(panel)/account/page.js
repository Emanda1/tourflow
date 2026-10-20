import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/permissions";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import PasswordForm from "./PasswordForm";

export default async function AccountPage({ searchParams }) {
  const user = await requireUser();
  const { first } = await searchParams;
  const sessions = db.prepare("SELECT created_at, ip, user_agent FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC").all(user.id, new Date().toISOString());
  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>My account</h1>
      {(first || user.must_change_password) ? <div className="alert alert-info">Welcome! Please replace the temporary password you were given with one only you know.</div> : null}
      <section className="card card-pad" style={{ maxWidth: 480 }}>
        <dl className="kv"><dt>Name</dt><dd>{user.name}</dd><dt>Email</dt><dd>{user.email}</dd><dt>Role</dt><dd>{ROLES[user.role]}</dd></dl>
      </section>
      <PasswordForm />
      <section className="card card-pad" style={{ maxWidth: 680 }}>
        <h3>Where you're signed in</h3>
        {sessions.map((s, i) => <p key={i} className="small" style={{ margin: "4px 0" }}>{date(s.created_at)} · {s.ip} · <span className="muted">{(s.user_agent || "").slice(0, 80)}</span></p>)}
        <p className="small muted">Changing your password signs out all other devices.</p>
      </section>
    </div>
  );
}
