import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { db } from "@/lib/db";
import type { TimeEntry } from "@/lib/types";

/** สถานะลงเวลาล่าสุดของผู้ใช้ — บอกว่าตอนนี้กำลังเข้างานอยู่หรือไม่ */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const last = db
    .prepare(
      `SELECT t.*, p.name AS project_name
       FROM time_entries t LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.user_id = ? ORDER BY t.id DESC LIMIT 1`
    )
    .get(user.id) as TimeEntry | undefined;

  const clockedIn = last?.kind === "in";
  return NextResponse.json({ clockedIn, last: last ?? null });
}
