import { db } from "./db";
import { isAdmin, type Role } from "./auth";
import type { Project } from "./types";

/**
 * โครงการที่ผู้ใช้เข้าถึงได้:
 * - admin/owner เห็นทุกโครงการ
 * - ผู้ใช้ทั่วไป: ถ้ามีการกำหนดสิทธิ์รายบัญชี (user_projects) ให้เห็นเฉพาะที่กำหนด
 *   ถ้าไม่ได้กำหนดเลย ให้เห็นทุกโครงการ (ค่าเริ่มต้น)
 */
export function getAccessibleProjects(
  userId: number,
  role: Role,
  status?: "active" | "completed"
): Project[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (!isAdmin(role)) {
    const hasRestriction = (
      db.prepare("SELECT COUNT(*) AS n FROM user_projects WHERE user_id = ?").get(userId) as {
        n: number;
      }
    ).n;
    if (hasRestriction > 0) {
      where.push("id IN (SELECT project_id FROM user_projects WHERE user_id = ?)");
      params.push(userId);
    }
  }
  if (status) {
    where.push("status = ?");
    params.push(status);
  }

  const sql =
    "SELECT * FROM projects" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY created_at DESC";
  return db.prepare(sql).all(...params) as Project[];
}

export function canAccessProject(userId: number, role: Role, projectId: number): boolean {
  if (isAdmin(role)) return true;
  const restricted = (
    db.prepare("SELECT COUNT(*) AS n FROM user_projects WHERE user_id = ?").get(userId) as {
      n: number;
    }
  ).n;
  if (restricted === 0) return true; // ไม่จำกัด = เข้าถึงทุกโครงการ
  const row = db
    .prepare("SELECT 1 FROM user_projects WHERE user_id = ? AND project_id = ?")
    .get(userId, projectId);
  return !!row;
}

export function getProject(id: number): Project | null {
  return (db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project) ?? null;
}
