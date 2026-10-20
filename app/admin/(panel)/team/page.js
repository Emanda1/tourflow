import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { addStaff, addVehicle } from "../../actions";

export default async function TeamPage({ searchParams }) {
  const user = await requireUser("team.manage");
  const sp = await searchParams;
  const staff = db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM departures d WHERE (d.guide_id = s.id OR d.driver_id = s.id) AND d.start_date >= date('now') AND d.status != 'cancelled') AS upcoming
    FROM staff s ORDER BY role, name`).all();
  const vehicles = db.prepare(`SELECT v.*, (SELECT COUNT(*) FROM departures d WHERE d.vehicle_id = v.id AND d.start_date >= date('now') AND d.status != 'cancelled') AS upcoming
    FROM vehicles v ORDER BY name`).all();
  return (
    <div className="stack">
      <h1>Guides, drivers & vehicles</h1>
      {sp.error && <div className="alert alert-error" role="alert">{String(sp.error).slice(0, 200)}</div>}
      <div className="two-col">
        <section className="card">
          <div className="card-pad"><h2 style={{ margin: 0 }}>Team</h2></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Upcoming trips</th></tr></thead>
            <tbody>{staff.map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.role}</td><td>{s.phone}</td><td>{s.upcoming}</td></tr>)}</tbody>
          </table></div>
        </section>
        <form action={addStaff} className="card card-pad">
          <h3>Add team member</h3>
          <div className="field"><label>Name</label><input name="name" required /></div>
          <div className="field"><label>Role</label><select name="role"><option>Guide</option><option>Driver</option></select></div>
          <div className="field"><label>Phone</label><input name="phone" /></div>
          <button className="btn">Add</button>
        </form>
      </div>
      <div className="two-col">
        <section className="card">
          <div className="card-pad"><h2 style={{ margin: 0 }}>Vehicles</h2></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Vehicle</th><th>Plate</th><th>Seats</th><th>Upcoming trips</th></tr></thead>
            <tbody>{vehicles.map((v) => <tr key={v.id}><td>{v.name}</td><td>{v.plate}</td><td>{v.seats}</td><td>{v.upcoming}</td></tr>)}</tbody>
          </table></div>
        </section>
        <form action={addVehicle} className="card card-pad">
          <h3>Add vehicle</h3>
          <div className="field"><label>Name / model</label><input name="name" required /></div>
          <div className="field"><label>Number plate</label><input name="plate" /></div>
          <div className="field"><label>Seats</label><input name="seats" type="number" defaultValue="14" /></div>
          <button className="btn">Add</button>
        </form>
      </div>
    </div>
  );
}
