import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db, audit } from "@/lib/db";

/** สร้างโครงการใหม่ — admin */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = await request.json().catch(() => null);
  if (!b?.name) return NextResponse.json({ error: "กรุณาใส่ชื่อโครงการ" }, { status: 400 });

  const r = db
    .prepare(
      `INSERT INTO projects (name, description, status, progress, lat, lng, geofence_radius, due_date, delivered_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(b.name).trim(),
      b.description ?? null,
      b.status === "completed" ? "completed" : "active",
      Number(b.progress) || 0,
      b.lat != null && b.lat !== "" ? Number(b.lat) : null,
      b.lng != null && b.lng !== "" ? Number(b.lng) : null,
      Number(b.geofence_radius) || 200,
      b.due_date || null,
      b.delivered_date || null
    );
  audit(admin.id, "create_project", Number(r.lastInsertRowid), { name: b.name });
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
