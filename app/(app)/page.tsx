import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import InstallPrompt from "@/app/_components/InstallPrompt";

export const dynamic = "force-dynamic";

interface ClockedRow { id: number; name: string; project: string | null; since: string }
interface UpdateRow { id: number; text: string | null; project: string; author: string; created_at: string }

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;

  const activeProjects = (
    db.prepare("SELECT COUNT(*) AS n FROM projects WHERE status = 'active'").get() as { n: number }
  ).n;

  // ใครกำลังเข้างานอยู่ตอนนี้: รายการลงเวลาล่าสุดของแต่ละคนเป็น 'in'
  const clockedIn = db
    .prepare(
      `SELECT u.id, u.name, p.name AS project, t.created_at AS since
       FROM time_entries t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.id IN (
         SELECT MAX(id) FROM time_entries GROUP BY user_id
       ) AND t.kind = 'in'
       ORDER BY t.created_at DESC`
    )
    .all() as ClockedRow[];

  const updates = db
    .prepare(
      `SELECT up.id, up.text, p.name AS project, u.name AS author, up.created_at
       FROM updates up
       JOIN projects p ON p.id = up.project_id
       JOIN users u ON u.id = up.user_id
       ORDER BY up.created_at DESC LIMIT 6`
    )
    .all() as UpdateRow[];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <p className="text-slate/60 text-sm">{greeting}</p>
        <h1 className="font-heading font-bold text-2xl">{user.name}</h1>
      </div>

      <InstallPrompt />

      {/* การ์ดสรุป */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="โครงการกำลังทำ" value={activeProjects} accent="brand" />
        <StatCard label="กำลังเข้างานตอนนี้" value={clockedIn.length} accent="success" />
      </div>

      {/* กำลังเข้างาน */}
      <Section title="กำลังเข้างานอยู่ตอนนี้">
        {clockedIn.length === 0 ? (
          <Empty>ยังไม่มีใครลงเวลาเข้างาน</Empty>
        ) : (
          <ul className="divide-y divide-black/5">
            {clockedIn.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <span className="font-medium">{c.name}</span>
                {c.project && <span className="text-sm text-slate/50">· {c.project}</span>}
                <span className="ml-auto text-xs text-slate/40">{fmtTime(c.since)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* อัพเดตล่าสุด */}
      <Section title="อัพเดตล่าสุดจากหน้างาน">
        {updates.length === 0 ? (
          <Empty>ยังไม่มีอัพเดตจากหน้างาน</Empty>
        ) : (
          <ul className="space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="border-l-2 border-brand/40 pl-3">
                <p className="text-sm">{u.text || "(รูปภาพ)"}</p>
                <p className="text-xs text-slate/50 mt-0.5">
                  {u.project} · {u.author} · {fmtDateTime(u.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: "brand" | "success" }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className={`font-heading font-bold text-3xl ${accent === "brand" ? "text-brand" : "text-success"}`}>{value}</p>
      <p className="text-xs text-slate/60 mt-1">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-heading font-semibold text-base mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate/40 py-3 text-center">{children}</p>;
}

function fmtTime(iso: string) {
  // เก็บเป็น UTC จาก datetime('now'); แสดงเวลาแบบไทย
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(iso: string) {
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
