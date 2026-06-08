import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db, audit } from "@/lib/db";
import { getProject } from "@/lib/data";

interface PhaseInput {
  name: string;
  start_date?: string;
  end_date?: string;
  status?: "done" | "in_progress" | "pending";
  progress?: number;
}

/** แก้ไขโครงการ + geofence + แผนงานเฟส (ส่ง phases มาเพื่อแทนที่ทั้งชุด) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = Number((await params).id);
  const existing = getProject(id);
  if (!existing) return NextResponse.json({ error: "ไม่พบโครงการ" }, { status: 404 });

  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const num = (v: unknown, fallback: number | null) =>
    v != null && v !== "" ? Number(v) : fallback;

  db.prepare(
    `UPDATE projects SET name=?, description=?, status=?, progress=?, lat=?, lng=?, geofence_radius=?, due_date=?, delivered_date=? WHERE id=?`
  ).run(
    (b.name ?? existing.name).trim(),
    b.description ?? existing.description,
    b.status === "completed" ? "completed" : "active",
    num(b.progress, existing.progress),
    num(b.lat, existing.lat),
    num(b.lng, existing.lng),
    num(b.geofence_radius, existing.geofence_radius),
    b.due_date ?? existing.due_date,
    b.delivered_date ?? existing.delivered_date,
    id
  );

  // แทนที่เฟสทั้งชุด (ถ้าส่งมา)
  if (Array.isArray(b.phases)) {
    db.prepare("DELETE FROM phases WHERE project_id = ?").run(id);
    const ins = db.prepare(
      "INSERT INTO phases (project_id, name, start_date, end_date, status, progress, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    (b.phases as PhaseInput[]).forEach((ph, i) => {
      if (ph.name?.trim())
        ins.run(
          id,
          ph.name.trim(),
          ph.start_date || null,
          ph.end_date || null,
          ph.status ?? "pending",
          Number(ph.progress) || 0,
          i
        );
    });
  }

  audit(admin.id, "update_project", id, { name: b.name });
  return NextResponse.json({ ok: true });
}

/** ลบโครงการ — admin (ลบได้ถ้าไม่มีการลงเวลาผูกอยู่) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = Number((await params).id);

  // นับการลงเวลาที่ผูกอยู่ (เพื่อแจ้งให้ทราบ) — ไม่บล็อกการลบ
  const used = (
    db.prepare("SELECT COUNT(*) AS n FROM time_entries WHERE project_id = ?").get(id) as {
      n: number;
    }
  ).n;

  // ลบโครงการในธุรกรรมเดียว: ปลดลิงก์ประวัติลงเวลา (คงไว้คิดค่าแรง) แล้วลบโครงการ
  // อัพเดต/เฟส/เอกสาร/สิทธิ์โครงการ ถูกลบอัตโนมัติด้วย ON DELETE CASCADE
  const tx = db.transaction(() => {
    db.prepare("UPDATE time_entries SET project_id = NULL WHERE project_id = ?").run(id);
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  });
  tx();

  audit(admin.id, "delete_project", id, { unlinked_time_entries: used });
  return NextResponse.json({ ok: true, unlinkedTimeEntries: used });
}
