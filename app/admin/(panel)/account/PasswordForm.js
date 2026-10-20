"use client";
import { useActionState } from "react";
import { changePassword } from "../../account-actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="card card-pad" style={{ maxWidth: 480 }}>
      <h2>Change password</h2>
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {state?.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <div className="field"><label htmlFor="current">Current password</label><input id="current" name="current" type="password" required autoComplete="current-password" maxLength={200} /></div>
      <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" /><p className="small muted">At least 10 characters. Don't reuse a password from another site.</p></div>
      <div className="field"><label htmlFor="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password" /></div>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
