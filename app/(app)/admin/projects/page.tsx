import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Project, Phase } from "@/lib/types";
import ProjectsAdminClient from "./ProjectsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) redirect("/");

  const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as Project[];
  const phases = db.prepare("SELECT * FROM phases ORDER BY order_index").all() as Phase[];
  const withPhases = projects.map((p) => ({
    ...p,
    phases: phases.filter((ph) => ph.project_id === p.id),
  }));

  return <ProjectsAdminClient projects={withPhases} />;
}
