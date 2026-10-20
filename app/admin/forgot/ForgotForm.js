"use client";
import { useActionState } from "react";
import { requestPasswordReset } from "../account-actions";

export default function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.ok) {
    return (
      <div className="card card-pad">
        <div className="alert alert-ok" role="status">If <strong>{state.email}</strong> belongs to a staff account, a reset link is on its way. It works once and expires in 30 minutes.</div>
        {state.devNote && <p className="small muted">Email isn't set up on this computer, so the link was printed in the terminal window running the app instead.</p>}
        <p className="small muted" style={{ marginBottom: 0 }}>No email after a few minutes? Check spam, or ask the owner to reset your password under Staff accounts.</p>
      </div>
    );
  }
  const v = state?.values || {};
  return (
    <form key={JSON.stringify(v)} action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      <div className="field"><label htmlFor="email">Email you sign in with</label><input id="email" name="email" type="email" required autoComplete="username" autoFocus maxLength={160} defaultValue={v.email} /></div>
      <button className="btn btn-block" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}
