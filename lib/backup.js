import fs from "node:fs";
import path from "node:path";
import { db, DATA_DIR } from "./db.js";
import { envInt } from "./envnum.js";

export const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, "backups");
const KEEP = envInt("BACKUP_KEEP", 14, { min: 1, max: 365 });
const UPLOADS = path.join(DATA_DIR, "uploads");

/**
 * Makes a consistent copy of the database (safe while the app is running), and copies any new
 * photos/logos into backups/uploads. Daily and manual ("now") backups are kept separately, so
 * clicking "Back up now" many times can never push out the daily history.
 */
export async function runBackup({ manual = false } = {}) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const kind = manual ? "manual" : "daily";
  const file = path.join(BACKUP_DIR, `tourflow-${kind}-${stamp}.db`);
  await db.backup(file);
  fs.chmodSync(file, 0o600);
  copyUploads();
  for (const old of listBackups().filter((b) => b.kind === kind).slice(KEEP)) fs.rmSync(path.join(BACKUP_DIR, old.name), { force: true });
  return path.basename(file);
}

function copyUploads() {
  if (!fs.existsSync(UPLOADS)) return;
  const dest = path.join(BACKUP_DIR, "uploads");
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(UPLOADS)) {
    const to = path.join(dest, f);
    if (!fs.existsSync(to)) fs.copyFileSync(path.join(UPLOADS, f), to);
  }
}

export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^tourflow-(daily-|manual-)?[\d-]+\.db$/.test(f))
    .map((name) => ({ name, kind: name.includes("-manual-") ? "manual" : "daily", ...fs.statSync(path.join(BACKUP_DIR, name)) }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}
