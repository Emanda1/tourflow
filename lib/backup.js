import fs from "node:fs";
import path from "node:path";
import { db, DATA_DIR } from "./db.js";

export const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, "backups");
const KEEP = Number(process.env.BACKUP_KEEP || 14);

/** Makes a consistent copy of the database (safe while the app is running). */
export async function runBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const file = path.join(BACKUP_DIR, `tourflow-${stamp}.db`);
  await db.backup(file);
  fs.chmodSync(file, 0o600);
  // Keep only the newest backups.
  const all = listBackups();
  for (const old of all.slice(KEEP)) fs.rmSync(path.join(BACKUP_DIR, old.name), { force: true });
  return path.basename(file);
}

export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^tourflow-[\d-]+\.db$/.test(f))
    .map((name) => ({ name, ...fs.statSync(path.join(BACKUP_DIR, name)) }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}
