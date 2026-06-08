import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { getAccessibleProjects } from "@/lib/data";

/** รายการโครงการที่ผู้ใช้เข้าถึงได้ (?status=active|completed) */
export async function GET(request: Request) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = new URL(request.url).searchParams.get("status") as
    | "active"
    | "completed"
    | null;
  const projects = getAccessibleProjects(user.id, user.role, status ?? undefined);
  return NextResponse.json({ projects });
}
