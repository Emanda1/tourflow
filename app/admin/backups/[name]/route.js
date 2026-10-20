import fs from "node:fs";
import path from "node:path";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { BACKUP_DIR } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const user = await currentUser();
  if (!can(user, "backups.manage") || user.must_change_password) return new Response("Not found", { status: 404 });
  const { name } = await params;
  if (!/^tourflow-[\d-]+\.db$/.test(name)) return new Response("Not found", { status: 404 });
  const file = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  await audit(user, "backup.download", name);
  return new Response(fs.readFileSync(file), {
    headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
