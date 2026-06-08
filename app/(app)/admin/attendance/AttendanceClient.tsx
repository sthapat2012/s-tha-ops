"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TimeEntry } from "@/lib/types";

type Period = "today" | "week" | "month" | "all";
const PERIOD_LABEL: Record<Period, string> = {
  today: "วันนี้",
  week: "7 วัน",
  month: "เดือนนี้",
  all: "ทั้งหมด",
};

export default function AttendanceClient() {
  const [period, setPeriod] = useState<Period>("week");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/attendance?period=${period}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, [period]);

  // จัดกลุ่มตามพนักงาน
  const byUser = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const key = e.user_name ?? String(e.user_id);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(e);
  }

  return (
    <div className="px-4 py-5">
      <Link href="/admin" className="text-slate/50 text-sm">
        ← จัดการระบบ
      </Link>
      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="font-heading font-bold text-2xl">การลงเวลา</h1>
        <a
          href={`/api/admin/attendance/export?period=${period}`}
          className="rounded-lg bg-success text-white px-3 py-2 text-sm font-semibold flex items-center gap-1"
        >
          ⬇ Excel
        </a>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-4">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm ${
              period === p ? "bg-slate text-cream font-semibold" : "text-slate/60"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate/40 py-10">กำลังโหลด…</p>
      ) : byUser.size === 0 ? (
        <p className="text-center text-slate/40 py-10">ไม่มีการลงเวลาในช่วงนี้</p>
      ) : (
        <div className="space-y-4">
          {[...byUser.entries()].map(([name, list]) => (
            <div key={name} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-heading font-semibold mb-2">{name}</p>
              <ul className="divide-y divide-black/5">
                {list.map((e) => (
                  <li key={e.id} className="py-2 flex items-center gap-3 text-sm">
                    <span
                      className={`w-2 h-2 rounded-full ${e.kind === "in" ? "bg-success" : "bg-slate/40"}`}
                    />
                    <span className="font-medium w-16">
                      {e.kind === "in" ? "เข้างาน" : "เลิกงาน"}
                    </span>
                    <span className="text-slate/50 flex-1">{fmtDateTime(e.created_at)}</span>
                    {e.within_geofence === 0 && (
                      <span className="text-[11px] text-warn">นอกรัศมี</span>
                    )}
                    {e.photo_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.photo_path} alt="" className="w-8 h-8 rounded object-cover" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDateTime(iso: string) {
  const d = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  return d.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
