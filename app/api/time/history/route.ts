import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { db } from "@/lib/db";
import type { TimeEntry } from "@/lib/types";

/** ประวัติการลงเวลาของผู้ใช้ (?period=today|week|month) */
export async function GET(request: Request) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const period = new URL(request.url).searchParams.get("period") ?? "today";
  // ใช้เวลาท้องถิ่นของเซิร์ฟเวอร์ (localtime) ในการตัดช่วงวัน/สัปดาห์/เดือน
  const filter =
    period === "week"
      ? "AND date(t.created_at, 'localtime') >= date('now', 'localtime', '-6 days')"
      : period === "month"
        ? "AND strftime('%Y-%m', t.created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')"
        : "AND date(t.created_at, 'localtime') = date('now', 'localtime')";

  const entries = db
    .prepare(
      `SELECT t.*, p.name AS project_name
       FROM time_entries t LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.user_id = ? ${filter}
       ORDER BY t.id DESC`
    )
    .all(user.id) as TimeEntry[];

  return NextResponse.json({ entries });
}
