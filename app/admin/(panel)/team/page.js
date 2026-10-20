import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Toast from "@/components/Toast";
import { addStaff, addVehicle, updateTeamMember, updateVehicle } from "../../actions";

export default async function TeamPage({ searchParams }) {
  await requireUser("team.manage");
  const sp = await searchParams;
  const staff = db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM departures d WHERE (d.guide_id = s.id OR d.driver_id = s.id) AND d.start_date >= date('now') AND d.status != 'cancelled') AS upcoming
    FROM staff s ORDER BY s.active DESC, role, name`).all();
  const vehicles = db.prepare(`SELECT v.*, (SELECT COUNT(*) FROM departures d WHERE d.vehicle_id = v.id AND d.start_date >= date('now') AND d.status != 'cancelled') AS upcoming
    FROM vehicles v ORDER BY v.active DESC, name`).all();
  return (
    <div className="stack">
      <h1>Guides, drivers & vehicles</h1>
      <Toast message={sp.saved ? "Saved" : null} />
      {sp.error && <div className="alert alert-error" role="alert">{String(sp.error).slice(0, 200)}</div>}
      <p className="muted" style={{ margin: 0 }}>People and vehicles marked <strong>not in use</strong> disappear from the trip lists but stay on past trips.</p>
      <div className="two-col">
        <section className="card">
          <div className="card-pad"><h2 style={{ margin: 0 }}>Team</h2></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Upcoming trips</th><th></th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} style={s.active ? undefined : { opacity: 0.55 }}>
                  <td>{s.name}{!s.active && <span className="badge badge-closed" style={{ marginLeft: 6 }}>not in use</span>}</td><td>{s.role}</td><td>{s.phone || "—"}</td><td>{s.upcoming}</td>
                  <td>
                    <details>
                      <summary className="link-btn small">Edit</summary>
                      <form action={updateTeamMember} className="stack" style={{ marginTop: 8, minWidth: 220, gap: 6 }}>
                        <input type="hidden" name="id" value={s.id} />
                        <input name="name" aria-label="Name" defaultValue={s.name} required maxLength={120} />
                        <select name="role" aria-label="Role" defaultValue={s.role}><option>Guide</option><option>Driver</option></select>
                        <input name="phone" aria-label="Phone" defaultValue={s.phone || ""} maxLength={30} placeholder="Phone" />
                        <button className="btn btn-secondary btn-sm">Save</button>
                      </form>
                      <form action={updateTeamMember} style={{ marginTop: 6 }}>
                        <input type="hidden" name="id" value={s.id} /><input type="hidden" name="toggle" value="1" />
                        <button className="link-btn small">{s.active ? "Mark not in use" : "Back in use"}</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && <tr><td colSpan={5} className="muted">No guides or drivers yet. Add them on the right.</td></tr>}
            </tbody>
          </table></div>
        </section>
        <form action={addStaff} className="card card-pad">
          <h3>Add team member</h3>
          <div className="field"><label htmlFor="ts-name">Name</label><input id="ts-name" name="name" required maxLength={120} /></div>
          <div className="field"><label htmlFor="ts-role">Role</label><select id="ts-role" name="role"><option>Guide</option><option>Driver</option></select></div>
          <div className="field"><label htmlFor="ts-phone">Phone</label><input id="ts-phone" name="phone" maxLength={30} inputMode="tel" /></div>
          <button className="btn">Add</button>
        </form>
      </div>
      <div className="two-col">
        <section className="card">
          <div className="card-pad"><h2 style={{ margin: 0 }}>Vehicles</h2></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Vehicle</th><th>Plate</th><th>Seats</th><th>Upcoming trips</th><th></th></tr></thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} style={v.active ? undefined : { opacity: 0.55 }}>
                  <td>{v.name}{!v.active && <span className="badge badge-closed" style={{ marginLeft: 6 }}>not in use</span>}</td><td>{v.plate || "—"}</td><td>{v.seats}</td><td>{v.upcoming}</td>
                  <td>
                    <details>
                      <summary className="link-btn small">Edit</summary>
                      <form action={updateVehicle} className="stack" style={{ marginTop: 8, minWidth: 200, gap: 6 }}>
                        <input type="hidden" name="id" value={v.id} />
                        <input name="name" aria-label="Vehicle name" defaultValue={v.name} required maxLength={80} />
                        <input name="plate" aria-label="Number plate" defaultValue={v.plate || ""} maxLength={20} placeholder="Number plate" />
                        <input name="seats" aria-label="Seats" type="number" min="1" max="100" defaultValue={v.seats} />
                        <button className="btn btn-secondary btn-sm">Save</button>
                      </form>
                      <form action={updateVehicle} style={{ marginTop: 6 }}>
                        <input type="hidden" name="id" value={v.id} /><input type="hidden" name="toggle" value="1" />
                        <button className="link-btn small">{v.active ? "Mark not in use" : "Back in use"}</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td colSpan={5} className="muted">No vehicles yet. Add them on the right.</td></tr>}
            </tbody>
          </table></div>
        </section>
        <form action={addVehicle} className="card card-pad">
          <h3>Add vehicle</h3>
          <div className="field"><label htmlFor="tv-name">Name / model</label><input id="tv-name" name="name" required maxLength={80} /></div>
          <div className="field"><label htmlFor="tv-plate">Number plate</label><input id="tv-plate" name="plate" maxLength={20} /></div>
          <div className="field"><label htmlFor="tv-seats">Seats</label><input id="tv-seats" name="seats" type="number" min="1" max="100" defaultValue="14" /></div>
          <button className="btn">Add</button>
        </form>
      </div>
    </div>
  );
}
