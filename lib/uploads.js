import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db.js";

export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const MAX_BYTES = 5 * 1024 * 1024;

/** Detects the real image type from the file's first bytes (not the name or browser-sent type). */
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return ".webp";
  return null;
}

export class UploadError extends Error {}

/** Saves an uploaded image and returns its public path, or null if no file was chosen. */
export async function saveImage(file) {
  if (!file || typeof file === "string" || !file.size) return null;
  if (file.size > MAX_BYTES) throw new UploadError("Images must be 5 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw new UploadError("Only JPG, PNG or WebP images are allowed.");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(12).toString("hex")}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf, { mode: 0o640 });
  return `/uploads/${name}`;
}
