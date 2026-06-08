import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import ClockClient from "./ClockClient";

export const dynamic = "force-dynamic";

export default async function ClockPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // ลงเวลาเฉพาะพนักงานหน้างานและผู้ดูแล (ฝ่ายขายไม่ต้องลงเวลา)
  if (user.role === "sales") redirect("/");
  return <ClockClient />;
}
