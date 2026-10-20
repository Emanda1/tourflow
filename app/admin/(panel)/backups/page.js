import { requireUser } from "@/lib/auth";
import { listBackups } from "@/lib/backup";
import { dateTime } from "@/lib/format";
import Toast from "@/components/Toast";
import { backupNow } from "../../account-actions";

export default async function BackupsPage({ searchParams }) {
  await requireUser("backups.manage");
  const sp = await searchParams;
  const backups = listBackups();
  const size = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="spread">
        <h1 style={{ margin: 0 }}>Backups</h1>
        <form action={backupNow}><button className="btn">Back up now</button></form>
      </div>
      <Toast message={sp.done ? "Backup created" : null} />
      <div className="alert alert-info">
        A backup of all bookings, payments, staff and settings is made automatically every day (the last {process.env.BACKUP_KEEP || 14} are kept), and tour photos and the logo are copied into the backups folder too.
        <strong> Download one at least once a week and keep it somewhere safe</strong> (e.g. Google Drive), so you're protected even if the server is lost.
      </div>
      <section className="card table-wrap">
        <table>
          <thead><tr><th>Backup</th><th>Type</th><th>Created</th><th>Size</th><th></th></tr></thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.name}><td>{b.name}</td><td>{b.kind === "manual" ? "Manual" : "Daily"}</td><td>{dateTime(new Date(b.mtimeMs).toISOString())}</td><td>{size(b.size)}</td>
                <td><a className="btn btn-secondary btn-sm" href={`/admin/backups/${b.name}`}>Download</a></td></tr>
            ))}
            {backups.length === 0 && <tr><td colSpan={5} className="muted">No backups yet. Click "Back up now".</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="small muted">To restore, follow "Restoring a backup" in DEPLOYMENT.md.</p>
    </div>
  );
}
