import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  verifyPassword,
  signToken,
  cookieOptions,
  COOKIE_NAME,
  type Role,
  type Status,
} from "@/lib/auth";

interface UserRow {
  id: number;
  password_hash: string;
  name: string;
  role: Role;
  status: Status;
}

/** เข้าสู่ระบบด้วยอีเมลหรือเบอร์โทร + รหัสผ่าน */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const login = String(body?.login ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!login || !password) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const user = db
    .prepare(
      "SELECT id, password_hash, name, role, status FROM users WHERE lower(email) = ? OR phone = ?"
    )
    .get(login, String(body?.login ?? "").trim()) as UserRow | undefined;

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "อีเมล/เบอร์โทร หรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  if (user.status === "suspended") {
    return NextResponse.json(
      { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" },
      { status: 403 }
    );
  }

  // ออก session (รวมถึงสถานะ pending เพื่อให้เห็นหน้ารออนุมัติ)
  const token = signToken({
    uid: user.id,
    role: user.role,
    status: user.status,
    name: user.name,
  });
  const store = await cookies();
  store.set(COOKIE_NAME, token, cookieOptions);

  return NextResponse.json({
    status: user.status,
    role: user.role,
    name: user.name,
  });
}
