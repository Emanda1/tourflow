import { expireUnpaidBookings } from "./db.js";
import { runBackup, listBackups } from "./backup.js";

const HOUR = 3600_000;

export function startJobs() {
  if (globalThis.__tfJobs) return;
  globalThis.__tfJobs = true;

  // Free seats held by unpaid online bookings.
  const expire = () => {
    try {
      const n = expireUnpaidBookings();
      if (n) console.log(`[jobs] Released seats from ${n} unpaid booking(s).`);
    } catch (e) { console.error("[jobs] expire failed:", e.message); }
  };
  setInterval(expire, 5 * 60_000).unref();
  expire();

  // Daily database backup (and one at start-up if the last is over a day old).
  if (process.env.BACKUPS_ENABLED === "false") return;
  const backup = async () => {
    try {
      const last = listBackups()[0];
      if (last && Date.now() - last.mtimeMs < 23 * HOUR) return;
      console.log(`[jobs] Backup saved: ${await runBackup()}`);
    } catch (e) { console.error("[jobs] backup failed:", e.message); }
  };
  setInterval(backup, HOUR).unref();
  backup();
}
