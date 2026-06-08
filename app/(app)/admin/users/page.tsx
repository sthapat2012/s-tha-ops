import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin, type Role, type Status } from "@/lib/auth";
import { db } from "@/lib/db";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export interface AdminUser {
  id: number;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
  status: Status;
  can_documents: number;
  created_at: string;
  projectIds: number[];
}

export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  if (!me || !isAdmin(me.role)) redirect("/");

  const rows = db
    .prepare(
      `SELECT id, email, phone, name, role, status, can_documents, created_at FROM users
       ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, created_at DESC`
    )
    .all() as Omit<AdminUser, "projectIds">[];

  const links = db.prepare("SELECT user_id, project_id FROM user_projects").all() as {
    user_id: number;
    project_id: number;
  }[];
  const byUser = new Map<number, number[]>();
  for (const l of links) {
    if (!byUser.has(l.user_id)) byUser.set(l.user_id, []);
    byUser.get(l.user_id)!.push(l.project_id);
  }

  const users: AdminUser[] = rows.map((u) => ({ ...u, projectIds: byUser.get(u.id) ?? [] }));
  const projects = db
    .prepare("SELECT id, name FROM projects ORDER BY created_at DESC")
    .all() as { id: number; name: string }[];

  return (
    <UsersClient
      users={users}
      projects={projects}
      myRole={me.role}
      myId={me.id}
    />
  );
}
