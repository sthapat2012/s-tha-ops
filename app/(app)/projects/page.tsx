import { getCurrentUser } from "@/lib/session";
import { getAccessibleProjects } from "@/lib/data";
import ProjectsList from "./ProjectsList";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = (await getCurrentUser())!;
  const active = getAccessibleProjects(user.id, user.role, "active");
  const completed = getAccessibleProjects(user.id, user.role, "completed");
  return <ProjectsList active={active} completed={completed} />;
}
