"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/auth";
import type { AdminUser } from "./page";

const ROLE_LABEL: Record<Role, string> = {
  owner: "เจ้าของระบบ",
  admin: "ผู้ดูแลระบบ",
  worker: "พนักงานหน้างาน",
  sales: "ฝ่ายขาย",
};
const STATUS_LABEL = { pending: "รออนุมัติ", active: "ใช้งานอยู่", suspended: "ถูกระงับ" } as const;

export default function UsersClient({
  users,
  projects,
  myRole,
}: {
  users: AdminUser[];
  projects: { id: number; name: string }[];
  myRole: Role;
  myId: number;
}) {
  const [manage, setManage] = useState<{ user: AdminUser; approve: boolean } | null>(null);

  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status === "active");
  const suspended = users.filter((u) => u.status === "suspended");

  const canManage = (u: AdminUser) =>
    u.role !== "owner" && !(u.role === "admin" && myRole !== "owner");

  return (
    <div className="px-4 py-5">
      <Link href="/admin" className="text-slate/50 text-sm">
        ← จัดการระบบ
      </Link>
      <h1 className="font-heading font-bold text-2xl mt-2 mb-4">จัดการพนักงาน</h1>

      {pending.length > 0 && (
        <Group title={`รออนุมัติ (${pending.length})`} accent>
          {pending.map((u) => (
            <UserRow key={u.id} u={u} canManage={canManage(u)}>
              <button
                onClick={() => setManage({ user: u, approve: true })}
                className="rounded-lg bg-success text-white px-3 py-1.5 text-sm font-semibold"
              >
                อนุมัติ
              </button>
            </UserRow>
          ))}
        </Group>
      )}

      <Group title={`ใช้งานอยู่ (${active.length})`}>
        {active.map((u) => (
          <UserRow key={u.id} u={u} canManage={canManage(u)}>
            {canManage(u) && (
              <button
                onClick={() => setManage({ user: u, approve: false })}
                className="rounded-lg bg-slate text-cream px-3 py-1.5 text-sm"
              >
                จัดการ
              </button>
            )}
          </UserRow>
        ))}
      </Group>

      {suspended.length > 0 && (
        <Group title={`ถูกระงับ (${suspended.length})`}>
          {suspended.map((u) => (
            <UserRow key={u.id} u={u} canManage={canManage(u)}>
              {canManage(u) && (
                <button
                  onClick={() => setManage({ user: u, approve: false })}
                  className="rounded-lg bg-slate text-cream px-3 py-1.5 text-sm"
                >
                  จัดการ
                </button>
              )}
            </UserRow>
          ))}
        </Group>
      )}

      {manage && (
        <ManageModal
          user={manage.user}
          approve={manage.approve}
          projects={projects}
          myRole={myRole}
          onClose={() => setManage(null)}
        />
      )}
    </div>
  );
}

function Group({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h2 className={`font-heading font-semibold mb-2 ${accent ? "text-brand" : ""}`}>{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function UserRow({
  u,
  canManage,
  children,
}: {
  u: AdminUser;
  canManage: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-sm flex items-center gap-3">
      <span className="w-10 h-10 rounded-full bg-brand/15 text-brand flex items-center justify-center font-bold shrink-0">
        {u.name[0]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight truncate">{u.name}</p>
        <p className="text-xs text-slate/50 truncate">{u.email || u.phone}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-cream text-slate/70">
            {ROLE_LABEL[u.role]}
          </span>
          {!canManage && u.role !== "owner" && (
            <span className="text-[11px] text-slate/40">🔒</span>
          )}
          {u.role === "owner" && <span className="text-[11px]">👑</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ManageModal({
  user,
  approve,
  projects,
  myRole,
  onClose,
}: {
  user: AdminUser;
  approve: boolean;
  projects: { id: number; name: string }[];
  myRole: Role;
  onClose: () => void;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(user.role === "owner" ? "worker" : user.role);
  const [status, setStatus] = useState(approve ? "active" : user.status);
  const [canDocs, setCanDocs] = useState(user.can_documents === 1);
  const [allProjects, setAllProjects] = useState(user.projectIds.length === 0);
  const [projIds, setProjIds] = useState<number[]>(user.projectIds);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const roleOptions: Role[] =
    myRole === "owner" ? ["worker", "sales", "admin"] : ["worker", "sales"];

  function toggleProject(id: number) {
    setProjIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          status,
          can_documents: canDocs,
          projectIds: allProjects ? [] : projIds,
        }),
      });
      if (!res.ok) {
        setErr((await res.json()).error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      if (newPassword) {
        await fetch(`/api/admin/users/${user.id}/password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        });
      }
      onClose();
      router.refresh();
    } catch {
      setErr("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!confirm("ปฏิเสธและลบคำขอนี้?")) return;
    setBusy(true);
    await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-cream rounded-t-3xl p-5 pb-safe max-h-[92%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-black/15 mb-4" />
        <h3 className="font-heading font-bold text-lg">
          {approve ? "อนุมัติ: " : "จัดการ: "}
          {user.name}
        </h3>
        <p className="text-xs text-slate/50 mb-4">{user.email || user.phone}</p>

        <div className="space-y-4">
          {/* บทบาท */}
          <div>
            <label className="block text-sm font-medium mb-1.5">บทบาท</label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-2 rounded-lg text-sm ${
                    role === r ? "bg-slate text-cream" : "bg-white text-slate/60"
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {/* สถานะ (เฉพาะตอนจัดการ ไม่ใช่อนุมัติ) */}
          {!approve && (
            <div>
              <label className="block text-sm font-medium mb-1.5">สถานะบัญชี</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStatus("active")}
                  className={`py-2 rounded-lg text-sm ${
                    status === "active" ? "bg-success text-white" : "bg-white text-slate/60"
                  }`}
                >
                  ใช้งานอยู่
                </button>
                <button
                  onClick={() => setStatus("suspended")}
                  className={`py-2 rounded-lg text-sm ${
                    status === "suspended" ? "bg-brand-dark text-white" : "bg-white text-slate/60"
                  }`}
                >
                  ระงับ
                </button>
              </div>
            </div>
          )}

          {/* สิทธิ์เอกสาร */}
          <label className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5">
            <span className="text-sm">เข้าถึงเอกสารโครงการ (ลับ)</span>
            <input
              type="checkbox"
              checked={canDocs}
              onChange={(e) => setCanDocs(e.target.checked)}
              className="w-5 h-5 accent-brand"
            />
          </label>

          {/* สิทธิ์โครงการ */}
          <div>
            <label className="block text-sm font-medium mb-1.5">สิทธิ์เข้าถึงโครงการ</label>
            <label className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 mb-2">
              <input
                type="radio"
                checked={allProjects}
                onChange={() => setAllProjects(true)}
                className="accent-brand"
              />
              <span className="text-sm">ทุกโครงการ</span>
            </label>
            <label className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5">
              <input
                type="radio"
                checked={!allProjects}
                onChange={() => setAllProjects(false)}
                className="accent-brand"
              />
              <span className="text-sm">เลือกเฉพาะบางโครงการ</span>
            </label>
            {!allProjects && (
              <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto">
                {projects.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={projIds.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                      className="w-4 h-4 accent-brand"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* รีเซ็ตรหัสผ่าน */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัว"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5"
            />
          </div>

          {err && <p className="text-sm text-brand-dark">{err}</p>}

          <div className="flex gap-2">
            {approve && (
              <button
                onClick={reject}
                disabled={busy}
                className="rounded-xl border border-brand-dark/30 text-brand-dark px-4 py-3 font-semibold"
              >
                ปฏิเสธ
              </button>
            )}
            <button
              onClick={save}
              disabled={busy}
              className="flex-1 rounded-xl bg-brand text-white py-3 font-semibold disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก…" : approve ? "อนุมัติบัญชี" : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
