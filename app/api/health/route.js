import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// For uptime monitors and hosting health checks. Reveals nothing sensitive.
export function GET() {
  try {
    db.prepare("SELECT 1").get();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
