import { db } from "./db.js";
import { clientIp } from "./request.js";

export async function audit(user, action, details = "") {
  try {
    db.prepare("INSERT INTO audit_log (user_id, user_name, action, details, ip) VALUES (?,?,?,?,?)")
      .run(user?.id ?? null, user?.name ?? "system", action, String(details).slice(0, 500), await clientIp());
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
