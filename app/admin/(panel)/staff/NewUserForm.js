"use client";
import { useActionState, useRef, useEffect } from "react";
import { createUser } from "../../account-actions";

export default function NewUserForm({ roles }) {
  const [state, action, pending] = useActionState(createUser, null);
  const v = state?.values || {};
  const ref = useRef(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} key={JSON.stringify(v)} action={action} className="card card-pad">
      <h3>Add a staff member</h3>
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {state?.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <div className="field"><label htmlFor="nu-name">Name</label><input id="nu-name" name="name" defaultValue={v.name} required maxLength={120} /></div>
      <div className="field"><label htmlFor="nu-email">Email (used to sign in)</label><input id="nu-email" name="email" defaultValue={v.email} type="email" required maxLength={160} autoComplete="off" /></div>
      <div className="field"><label htmlFor="nu-role">Role</label>
        <select id="nu-role" name="role" defaultValue={v.role || "sales"}>{Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <div className="field"><label htmlFor="nu-pw">Temporary password</label><input id="nu-pw" name="password" type="text" required minLength={10} maxLength={200} autoComplete="new-password" />
        <p className="small muted">Give this to them privately. They must change it when they first sign in.</p></div>
      <button className="btn" disabled={pending}>{pending ? "Adding…" : "Add staff member"}</button>
    </form>
  );
}
