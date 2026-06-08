import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db, audit } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/** รีเซ็ตรหัสผ่านให้ผู้ใช้ — admin (เจ้าของระบบเท่านั้นที่รีเซ็ตของ admin คนอื่น) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = Number((await params).id);
  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id) as
    | { id: number; role: string }
    | undefined;
  if (!target) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  if ((target.role === "admin" || target.role === "owner") && admin.role !== "owner") {
    return NextResponse.json({ error: "เฉพาะเจ้าของระบบรีเซ็ตรหัสผู้ดูแลได้" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const password = String(body?.password ?? "");
  if (password.length < 6) {
    return NextResponse.json({ error: "รหัสผ่านอย่างน้อย 6 ตัว" }, { status: 400 });
  }
  const hash = await hashPassword(password);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
  audit(admin.id, "reset_password", id);
  return NextResponse.json({ ok: true });
}
