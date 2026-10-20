"use client";
import { useActionState } from "react";
import { login } from "../account-actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const v = state?.values || {};
  return (
    <form key={JSON.stringify(v)} action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" defaultValue={v.email} type="email" required autoComplete="username" autoFocus maxLength={160} /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" maxLength={200} /></div>
      <button className="btn btn-block" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="small" style={{ marginTop: 12, marginBottom: 0 }}><a href="/admin/forgot">Forgot your password?</a></p>
    </form>
  );
}
