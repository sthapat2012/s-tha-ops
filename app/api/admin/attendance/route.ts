import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import type { TimeEntry } from "@/lib/types";

function periodFilter(period: string): string {
  if (period === "week")
    return "AND date(t.created_at,'localtime') >= date('now','localtime','-6 days')";
  if (period === "month")
    return "AND strftime('%Y-%m',t.created_at,'localtime') = strftime('%Y-%m','now','localtime')";
  if (period === "all") return "";
  return "AND date(t.created_at,'localtime') = date('now','localtime')";
}

/** การลงเวลาของพนักงานทุกคน (admin) — ?period=today|week|month|all&userId= */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? "week";
  const userId = url.searchParams.get("userId");

  const entries = db
    .prepare(
      `SELECT t.*, u.name AS user_name, p.name AS project_name
       FROM time_entries t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE 1=1 ${periodFilter(period)} ${userId ? "AND t.user_id = " + Number(userId) : ""}
       ORDER BY t.user_id, t.id`
    )
    .all() as TimeEntry[];

  return NextResponse.json({ entries });
}
