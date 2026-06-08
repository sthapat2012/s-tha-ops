import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import AttendanceClient from "./AttendanceClient";

export const dynamic = "force-dynamic";

export default async function AdminAttendancePage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) redirect("/");
  return <AttendanceClient />;
}
