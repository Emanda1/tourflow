import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/uploads";

const TYPES = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Serves images uploaded from the admin. Names are random and checked strictly.
export async function GET(request, { params }) {
  const { name } = await params;
  if (!/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name) && !/^[a-z0-9-]+-\d+\.(jpg|jpeg|png|webp)$/.test(name)) return new Response("Not found", { status: 404 });
  const file = path.join(UPLOAD_DIR, path.basename(name));
  const type = TYPES[path.extname(name).replace(".jpeg", ".jpg")];
  if (!type || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(file), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" },
  });
}
