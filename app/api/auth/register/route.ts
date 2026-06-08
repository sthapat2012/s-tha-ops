import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, audit } from "@/lib/db";
import {
  hashPassword,
  signToken,
  cookieOptions,
  COOKIE_NAME,
} from "@/lib/auth";

/** สมัครสมาชิก — บัญชีใหม่อยู่สถานะ "รออนุมัติ"
 *  ยกเว้นบัญชีแรกสุดของระบบ = เจ้าของ (owner) ใช้งานได้ทันที */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const password = String(body.password ?? "");

  if (!name || (!email && !phone) || password.length < 6) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อ, อีเมลหรือเบอร์โทร และรหัสผ่านอย่างน้อย 6 ตัว" },
      { status: 400 }
    );
  }

  // ตรวจซ้ำ
  const dup = db
    .prepare("SELECT id FROM users WHERE (email IS NOT NULL AND email = ?) OR (phone IS NOT NULL AND phone = ?)")
    .get(email, phone);
  if (dup) {
    return NextResponse.json(
      { error: "อีเมลหรือเบอร์โทรนี้มีผู้ใช้แล้ว" },
      { status: 409 }
    );
  }

  const isFirstUser =
    (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n === 0;

  const role = isFirstUser ? "owner" : "worker";
  const status = isFirstUser ? "active" : "pending";
  const hash = await hashPassword(password);

  const result = db
    .prepare(
      `INSERT INTO users (email, phone, password_hash, name, role, status, can_documents, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      email,
      phone,
      hash,
      name,
      role,
      status,
      isFirstUser ? 1 : 0,
      isFirstUser ? new Date().toISOString() : null
    );

  const uid = Number(result.lastInsertRowid);
  audit(uid, isFirstUser ? "owner_bootstrap" : "register", uid, { role, status });

  // บัญชีแรก = owner: ล็อกอินให้เลย
  if (isFirstUser) {
    const token = signToken({ uid, role, status, name });
    const store = await cookies();
    store.set(COOKIE_NAME, token, cookieOptions);
    return NextResponse.json({ status: "active", role, name });
  }

  // บัญชีทั่วไป: รออนุมัติ ยังไม่ออก session
  return NextResponse.json({ status: "pending" });
}
