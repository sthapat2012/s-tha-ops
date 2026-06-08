import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db, getSetting } from "@/lib/db";
import { isDriveConfigured } from "@/lib/gdrive";
import BackupButton from "./BackupButton";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: number;
  action: string;
  detail: string | null;
  created_at: string;
  actor: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  approve_user: "อนุมัติบัญชี",
  reject_user: "ปฏิเสธคำขอ",
  update_user: "แก้ไขสิทธิ์ผู้ใช้",
  reset_password: "รีเซ็ตรหัสผ่าน",
  register: "สมัครเข้าระบบ",
  owner_bootstrap: "สร้างบัญชีเจ้าของระบบ",
  create_project: "สร้างโครงการ",
  update_project: "แก้ไขโครงการ",
  delete_project: "ลบโครงการ",
  create_product: "เพิ่มสินค้า",
  update_product: "แก้ไขสินค้า",
  delete_product: "ลบสินค้า",
  upload_document: "อัปโหลดเอกสาร",
  update_company: "แก้ไขข้อมูลบริษัท",
  backup: "สำรองข้อมูล",
};

export default async function AdminHub() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) redirect("/");

  const pending = (
    db.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'pending'").get() as { n: number }
  ).n;
  const audits = db
    .prepare(
      `SELECT a.id, a.action, a.detail, a.created_at, u.name AS actor
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.id DESC LIMIT 10`
    )
    .all() as AuditRow[];

  return (
    <div className="px-4 py-5 space-y-4">
      <h1 className="font-heading font-bold text-2xl">จัดการระบบ</h1>

      {pending > 0 && (
        <Link
          href="/admin/users"
          className="block rounded-2xl bg-brand text-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <p className="font-heading font-semibold">มีคำขอเข้าใช้งานรออนุมัติ</p>
              <p className="text-sm text-white/80">{pending} คน รอการอนุมัติจากคุณ</p>
            </div>
            <span className="text-white/70">→</span>
          </div>
        </Link>
      )}

      <div className="space-y-3">
        <HubCard href="/admin/users" icon="👥" title="จัดการพนักงาน" desc="อนุมัติคำขอ กำหนดสิทธิ์ ระงับ/รีเซ็ตรหัส ตั้ง admin" />
        <HubCard href="/admin/attendance" icon="🕒" title="การลงเวลา & ส่งออก Excel" desc="ดูการลงเวลาของพนักงานทุกคน และส่งออกคิดค่าแรง" />
        <HubCard href="/admin/projects" icon="🏗️" title="โครงการ & รัศมีหน้างาน" desc="จัดการโครงการ แผนงานเฟส และพิกัด geofence" />
        <BackupButton
          driveConfigured={isDriveConfigured()}
          lastDriveBackup={getSetting("last_drive_backup")}
        />
      </div>

      {/* บันทึกการตรวจสอบ */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-heading font-semibold mb-2">บันทึกการตรวจสอบ (Audit Log)</h2>
        {audits.length === 0 ? (
          <p className="text-sm text-slate/40 text-center py-3">ยังไม่มีบันทึก</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {audits.map((a) => (
              <li key={a.id} className="py-2 flex items-center gap-2 text-sm">
                <span className="flex-1">
                  <span className="font-medium">{a.actor ?? "ระบบ"}</span>{" "}
                  <span className="text-slate/60">{ACTION_LABEL[a.action] ?? a.action}</span>
                </span>
                <span className="text-[11px] text-slate/40">{fmtDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HubCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block rounded-2xl bg-white p-4 shadow-sm active:scale-[0.99] transition">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="font-heading font-semibold">{title}</p>
          <p className="text-xs text-slate/50">{desc}</p>
        </div>
        <span className="text-slate/30">→</span>
      </div>
    </Link>
  );
}

function fmtDateTime(iso: string) {
  const d = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  return d.toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
