"use client";
import { useActionState } from "react";
import { resetPassword } from "../account-actions";

export default function ResetForm({ token }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  return (
    <form action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      <input type="hidden" name="t" value={token} />
      <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" autoFocus />
        <p className="small muted">At least 10 characters. A short sentence works well, e.g. "green mango by the sea".</p></div>
      <div className="field"><label htmlFor="confirm">Type it again</label><input id="confirm" name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password" /></div>
      <button className="btn btn-block" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
