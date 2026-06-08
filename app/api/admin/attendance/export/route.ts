import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
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

function toDate(iso: string) {
  return new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

/** ส่งออกการลงเวลาเป็นไฟล์ Excel — admin */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const period = new URL(request.url).searchParams.get("period") ?? "month";

  const entries = db
    .prepare(
      `SELECT t.*, u.name AS user_name, p.name AS project_name
       FROM time_entries t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE 1=1 ${periodFilter(period)}
       ORDER BY t.user_id, t.id`
    )
    .all() as TimeEntry[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "S-THA";

  // ── ชีตสรุปกะงาน (จับคู่เข้า-ออก) ──
  const summary = wb.addWorksheet("สรุปชั่วโมง");
  summary.columns = [
    { header: "พนักงาน", key: "name", width: 22 },
    { header: "วันที่", key: "date", width: 14 },
    { header: "เวลาเข้า", key: "in", width: 10 },
    { header: "เวลาออก", key: "out", width: 10 },
    { header: "ชั่วโมง", key: "hours", width: 10 },
    { header: "โครงการ", key: "project", width: 26 },
    { header: "ในรัศมี", key: "geo", width: 10 },
  ];

  // จัดกลุ่มตามผู้ใช้แล้วจับคู่
  const byUser = new Map<number, TimeEntry[]>();
  for (const e of entries) {
    if (!byUser.has(e.user_id)) byUser.set(e.user_id, []);
    byUser.get(e.user_id)!.push(e);
  }
  let totalHours = 0;
  for (const list of byUser.values()) {
    let open: TimeEntry | null = null;
    for (const e of list) {
      if (e.kind === "in") {
        open = e;
      } else if (e.kind === "out" && open) {
        const ti = toDate(open.created_at);
        const to = toDate(e.created_at);
        const hours = Math.max(0, (to.getTime() - ti.getTime()) / 3600000);
        totalHours += hours;
        summary.addRow({
          name: open.user_name,
          date: fmtDate(ti),
          in: fmtTime(ti),
          out: fmtTime(to),
          hours: Number(hours.toFixed(2)),
          project: open.project_name ?? "-",
          geo: open.within_geofence === 0 ? "นอกรัศมี" : open.within_geofence === 1 ? "ใน" : "-",
        });
        open = null;
      }
    }
    if (open) {
      const ti = toDate(open.created_at);
      summary.addRow({
        name: open.user_name,
        date: fmtDate(ti),
        in: fmtTime(ti),
        out: "(ยังไม่ออก)",
        hours: "",
        project: open.project_name ?? "-",
        geo: open.within_geofence === 0 ? "นอกรัศมี" : open.within_geofence === 1 ? "ใน" : "-",
      });
    }
  }
  summary.getRow(1).font = { bold: true };
  summary.addRow({});
  summary.addRow({ out: "รวมชั่วโมง", hours: Number(totalHours.toFixed(2)) }).font = { bold: true };

  // ── ชีตรายการดิบ ──
  const raw = wb.addWorksheet("รายการดิบ");
  raw.columns = [
    { header: "พนักงาน", key: "name", width: 22 },
    { header: "ประเภท", key: "kind", width: 10 },
    { header: "วันเวลา", key: "dt", width: 20 },
    { header: "โครงการ", key: "project", width: 26 },
    { header: "พิกัด", key: "coord", width: 24 },
    { header: "สถานที่", key: "place", width: 30 },
    { header: "ในรัศมี", key: "geo", width: 12 },
    { header: "ระยะ(ม.)", key: "dist", width: 10 },
  ];
  for (const e of entries) {
    const d = toDate(e.created_at);
    raw.addRow({
      name: e.user_name,
      kind: e.kind === "in" ? "เข้างาน" : "เลิกงาน",
      dt: `${fmtDate(d)} ${fmtTime(d)}`,
      project: e.project_name ?? "-",
      coord: `${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}`,
      place: e.place_name ?? "-",
      geo: e.within_geofence === 0 ? "นอกรัศมี" : e.within_geofence === 1 ? "ใน" : "-",
      dist: e.distance_m ?? "-",
    });
  }
  raw.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  const label =
    period === "today" ? "วันนี้" : period === "week" ? "สัปดาห์" : period === "all" ? "ทั้งหมด" : "เดือน";
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`ลงเวลา-${label}.xlsx`)}`,
    },
  });
}
