import { Fragment } from "react";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/permissions";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import Toast from "@/components/Toast";
import { updateUser } from "../../account-actions";
import NewUserForm from "./NewUserForm";

const ROLE_HELP = {
  owner: "Everything, including staff accounts, settings, backups and the activity log.",
  manager: "Everything except staff accounts, settings and backups. Can refund and export.",
  sales: "Bookings, payments, customers and trip requests. Cannot refund or edit tours.",
  operations: "Trips, manifests, check-in, guides and vehicles. Cannot see revenue or take payments.",
};

export default async function StaffPage({ searchParams }) {
  const me = await requireUser("staff.manage");
  const sp = await searchParams;
  const users = db.prepare("SELECT id, name, email, role, active, locked_until, last_login_at, must_change_password FROM users ORDER BY active DESC, role, name").all();
  const now = new Date().toISOString();
  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Staff accounts</h1>
      <Toast message={sp.done ? "Saved" : null} />
      {sp.error && <div className="alert alert-error" role="alert">{String(sp.error).slice(0, 200)}</div>}
      <div className="two-col">
        <section className="card">
          <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Manage</th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong>{u.id === me.id ? " (you)" : ""}<div className="small muted">{u.email}</div></td>
                <td>
                  <form action={updateUser} className="row" style={{ gap: 6 }}>
                    <input type="hidden" name="id" value={u.id} /><input type="hidden" name="action" value="role" />
                    <select name="role" defaultValue={u.role} style={{ width: "auto", padding: "5px 8px" }}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <button className="btn btn-secondary btn-sm">Save</button>
                  </form>
                </td>
                <td>
                  {!u.active ? <span className="badge badge-closed">Deactivated</span>
                    : u.locked_until && u.locked_until > now ? <span className="badge badge-cancelled">Locked</span>
                    : u.must_change_password ? <span className="badge badge-warn">Temp password</span>
                    : <span className="badge badge-ok">Active</span>}
                </td>
                <td className="small">{u.last_login_at ? date(u.last_login_at) : "Never"}</td>
                <td>
                  <details>
                    <summary className="link-btn small">Options</summary>
                    <div className="stack" style={{ marginTop: 8, minWidth: 220 }}>
                      <form action={updateUser}>
                        <input type="hidden" name="id" value={u.id} /><input type="hidden" name="action" value="reset" />
                        <input name="password" placeholder="New temporary password" minLength={10} maxLength={200} required autoComplete="off" />
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }}>Reset password</button>
                      </form>
                      <form action={updateUser}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="action" value="signout" /><button className="btn btn-secondary btn-sm">Sign out everywhere</button></form>
                      {u.id !== me.id && (u.active
                        ? <form action={updateUser}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="action" value="deactivate" /><button className="btn btn-danger btn-sm">Deactivate</button></form>
                        : <form action={updateUser}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="action" value="activate" /><button className="btn btn-secondary btn-sm">Reactivate</button></form>)}
                    </div>
                  </details>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
        <div className="stack">
          <NewUserForm roles={ROLES} />
          <section className="card card-pad">
            <h3>What each role can do</h3>
            <dl className="kv small">{Object.entries(ROLES).map(([k, v]) => <Fragment key={k}><dt>{v}</dt><dd>{ROLE_HELP[k]}</dd></Fragment>)}</dl>
            <p className="small muted">When someone leaves, deactivate their account straight away. Their history stays in the activity log.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
