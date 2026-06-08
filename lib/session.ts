import { cookies } from "next/headers";
import { db } from "./db";
import { COOKIE_NAME, verifyToken, type Role, type Status } from "./auth";

export interface User {
  id: number;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
  status: Status;
  can_documents: number;
  created_at: string;
}

/**
 * ดึงผู้ใช้ปัจจุบันจาก cookie แล้ว "อ่านสถานะล่าสุดจาก DB เสมอ"
 * เพื่อให้การระงับบัญชี/เปลี่ยนสิทธิ์มีผลทันที ไม่ต้องรอ token หมดอายุ
 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = db
    .prepare(
      "SELECT id, email, phone, name, role, status, can_documents, created_at FROM users WHERE id = ?"
    )
    .get(payload.uid) as User | undefined;
  return user ?? null;
}

/** ผู้ใช้ที่ใช้งานได้จริง (อนุมัติแล้วเท่านั้น) */
export async function getActiveUser(): Promise<User | null> {
  const user = await getCurrentUser();
  return user && user.status === "active" ? user : null;
}
