import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** รายชื่อผู้ใช้ทั้งหมด (จัดกลุ่มตามสถานะ) — admin */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const users = db
    .prepare(
      `SELECT id, email, phone, name, role, status, can_documents, created_at, approved_at
       FROM users ORDER BY
         CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
         created_at DESC`
    )
    .all();
  return NextResponse.json({ users });
}
