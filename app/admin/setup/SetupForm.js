"use client";
import { useActionState } from "react";
import { setupOwner } from "../account-actions";

export default function SetupForm({ needsCode }) {
  const [state, action, pending] = useActionState(setupOwner, null);
  const v = state?.values || {};
  return (
    <form key={JSON.stringify(v)} action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {needsCode && <div className="field"><label htmlFor="code">Setup code</label><input id="code" name="code" type="password" required autoComplete="off" /><p className="small muted">The SETUP_CODE from the server settings.</p></div>}
      <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" defaultValue={v.name} required maxLength={120} autoComplete="name" /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" defaultValue={v.email} type="email" required maxLength={160} autoComplete="username" /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" /><p className="small muted">At least 10 characters. A short sentence is easy to remember and hard to guess.</p></div>
      <div className="field"><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password" /></div>
      <button className="btn btn-block" disabled={pending}>{pending ? "Creating…" : "Create owner account"}</button>
    </form>
  );
}
