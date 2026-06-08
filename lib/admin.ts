import { getActiveUser } from "./session";
import { isAdmin, type Role } from "./auth";
import type { User } from "./session";

/** ตรวจว่าเป็น admin/owner — คืน user หรือ null */
export async function requireAdmin(): Promise<User | null> {
  const user = await getActiveUser();
  if (!user || !isAdmin(user.role)) return null;
  return user;
}

/** เฉพาะ owner เท่านั้นที่ตั้งบทบาท admin/owner ได้ */
export function canAssignRole(actor: Role, targetRole: Role): boolean {
  if (targetRole === "owner") return false; // เปลี่ยนใครเป็น owner ไม่ได้ผ่าน UI
  if (targetRole === "admin") return actor === "owner";
  return isAdmin(actor); // worker/sales: admin ตั้งได้
}
