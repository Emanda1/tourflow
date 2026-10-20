"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card card-pad">
      {state?.error && <div className="alert alert-error">{state.error}</div>}
      <div className="field"><label htmlFor="password">Admin password</label><input id="password" name="password" type="password" required autoFocus /></div>
      <button className="btn btn-block" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
