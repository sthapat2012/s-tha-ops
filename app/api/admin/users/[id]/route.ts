import { NextResponse } from "next/server";
import { requireAdmin, canAssignRole } from "@/lib/admin";
import { db, audit } from "@/lib/db";
import type { Role, Status } from "@/lib/auth";

interface Target {
  id: number;
  role: Role;
  status: Status;
  name: string;
}

function getTarget(id: number): Target | undefined {
  return db.prepare("SELECT id, role, status, name FROM users WHERE id = ?").get(id) as
    | Target
    | undefined;
}

/** อนุมัติ/เปลี่ยนสถานะ/บทบาท/สิทธิ์ของผู้ใช้ */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = Number((await params).id);
  const target = getTarget(id);
  if (!target) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

  // ปกป้องบัญชี owner และห้าม admin ไปยุ่งกับ admin/owner คนอื่น (เฉพาะ owner ทำได้)
  if (target.role === "owner")
    return NextResponse.json({ error: "ไม่สามารถแก้ไขบัญชีเจ้าของระบบ" }, { status: 403 });
  if (target.role === "admin" && admin.role !== "owner")
    return NextResponse.json({ error: "เฉพาะเจ้าของระบบแก้ไขบัญชีผู้ดูแลได้" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const changes: Record<string, unknown> = {};

  // เปลี่ยนบทบาท
  if (body.role && body.role !== target.role) {
    if (!canAssignRole(admin.role, body.role)) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์กำหนดบทบาทนี้ (ตั้ง admin ได้เฉพาะเจ้าของระบบ)" },
        { status: 403 }
      );
    }
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(body.role, id);
    changes.role = body.role;
  }

  // เปลี่ยนสถานะ (อนุมัติ = active)
  if (body.status && ["pending", "active", "suspended"].includes(body.status)) {
    const approving = target.status === "pending" && body.status === "active";
    db.prepare(
      "UPDATE users SET status = ?, approved_at = COALESCE(approved_at, CASE WHEN ?='active' THEN datetime('now') END), approved_by = ? WHERE id = ?"
    ).run(body.status, body.status, admin.id, id);
    changes.status = body.status;
    if (approving) audit(admin.id, "approve_user", id, { name: target.name });
  }

  // สิทธิ์เข้าถึงเอกสาร
  if (typeof body.can_documents === "boolean") {
    db.prepare("UPDATE users SET can_documents = ? WHERE id = ?").run(body.can_documents ? 1 : 0, id);
    changes.can_documents = body.can_documents;
  }

  // สิทธิ์เข้าถึงโครงการ (array = จำกัดเฉพาะ, null/ละไว้ข้าม, [] ทั้งหมด→ลบข้อจำกัด)
  if ("projectIds" in body) {
    db.prepare("DELETE FROM user_projects WHERE user_id = ?").run(id);
    if (Array.isArray(body.projectIds) && body.projectIds.length > 0) {
      const ins = db.prepare("INSERT OR IGNORE INTO user_projects (user_id, project_id) VALUES (?, ?)");
      for (const pid of body.projectIds) ins.run(id, Number(pid));
      changes.projectIds = body.projectIds;
    } else {
      changes.projectIds = "all";
    }
  }

  audit(admin.id, "update_user", id, changes);
  return NextResponse.json({ ok: true, changes });
}

/** ปฏิเสธคำขอ (ลบได้เฉพาะบัญชีที่ยังรออนุมัติ) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = Number((await params).id);
  const target = getTarget(id);
  if (!target) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  if (target.status !== "pending") {
    return NextResponse.json(
      { error: "ลบได้เฉพาะบัญชีที่รออนุมัติ — บัญชีที่ใช้งานแล้วให้ระงับแทน" },
      { status: 400 }
    );
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  audit(admin.id, "reject_user", id, { name: target.name });
  return NextResponse.json({ ok: true });
}
