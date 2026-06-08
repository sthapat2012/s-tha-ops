"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Project, Phase } from "@/lib/types";

type ProjectWithPhases = Project & { phases: Phase[] };

export default function ProjectsAdminClient({ projects }: { projects: ProjectWithPhases[] }) {
  const [editing, setEditing] = useState<ProjectWithPhases | "new" | null>(null);

  return (
    <div className="px-4 py-5">
      <Link href="/admin" className="text-slate/50 text-sm">
        ← จัดการระบบ
      </Link>
      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="font-heading font-bold text-2xl">โครงการ</h1>
        <button
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand text-white px-3 py-2 text-sm font-semibold"
        >
          + เพิ่ม
        </button>
      </div>

      <div className="space-y-2">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setEditing(p)}
            className="w-full text-left rounded-2xl bg-white p-4 shadow-sm active:scale-[0.99] transition"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-heading font-semibold">{p.name}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  p.status === "completed" ? "bg-success/15 text-success" : "bg-warn/15 text-warn"
                }`}
              >
                {p.status === "completed" ? "สำเร็จ" : "กำลังทำ"}
              </span>
            </div>
            <p className="text-xs text-slate/50 mt-1">
              {p.lat != null ? `📍 ${p.lat.toFixed(4)}, ${p.lng?.toFixed(4)} · รัศมี ${p.geofence_radius} ม.` : "ยังไม่ตั้งพิกัด geofence"}
              {" · "}
              {p.phases.length} เฟส
            </p>
          </button>
        ))}
      </div>

      {editing && (
        <ProjectModal
          project={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

interface PhaseRow {
  name: string;
  start_date: string;
  end_date: string;
  status: "pending" | "in_progress" | "done";
  progress: number;
}

function ProjectModal({
  project,
  onClose,
}: {
  project: ProjectWithPhases | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "active",
    progress: project?.progress ?? 0,
    lat: project?.lat != null ? String(project.lat) : "",
    lng: project?.lng != null ? String(project.lng) : "",
    geofence_radius: project?.geofence_radius ?? 200,
    due_date: project?.due_date ?? "",
    delivered_date: project?.delivered_date ?? "",
  });
  const [phases, setPhases] = useState<PhaseRow[]>(
    project?.phases.map((p) => ({
      name: p.name,
      start_date: p.start_date ?? "",
      end_date: p.end_date ?? "",
      status: p.status,
      progress: p.progress,
    })) ?? []
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [locating, setLocating] = useState(false);

  const set = (k: string, v: string | number) => setF((o) => ({ ...o, [k]: v }));

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("lat", pos.coords.latitude.toFixed(6));
        set("lng", pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setErr("ดึงตำแหน่งไม่สำเร็จ");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  }

  function addPhase() {
    setPhases((p) => [...p, { name: "", start_date: "", end_date: "", status: "pending", progress: 0 }]);
  }
  function updatePhase(i: number, k: keyof PhaseRow, v: string | number) {
    setPhases((p) => p.map((ph, idx) => (idx === i ? { ...ph, [k]: v } : ph)));
  }
  function removePhase(i: number) {
    setPhases((p) => p.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!f.name.trim()) {
      setErr("กรุณาใส่ชื่อโครงการ");
      return;
    }
    setBusy(true);
    setErr("");
    const body = { ...f, phases };
    const url = project ? `/api/admin/projects/${project.id}` : "/api/admin/projects";
    const method = project ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setErr((await res.json()).error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      // ถ้าสร้างใหม่และมีเฟส ต้อง PATCH เฟสตามไป
      if (!project && phases.length > 0) {
        const { id } = await res.json();
        await fetch(`/api/admin/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...f, phases }),
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

  async function remove() {
    if (!project || !confirm("ลบโครงการนี้?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
    if (!res.ok) {
      setErr((await res.json()).error ?? "ลบไม่สำเร็จ");
      setBusy(false);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-cream rounded-t-3xl p-5 pb-safe max-h-[94%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-black/15 mb-4" />
        <h3 className="font-heading font-bold text-lg mb-3">
          {project ? "แก้ไขโครงการ" : "เพิ่มโครงการ"}
        </h3>

        <div className="space-y-3">
          <Field label="ชื่อโครงการ" value={f.name} onChange={(v) => set("name", v)} />
          <div>
            <label className="block text-sm mb-1 text-slate/70">รายละเอียด</label>
            <textarea
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1 text-slate/70">สถานะ</label>
              <select
                value={f.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5"
              >
                <option value="active">กำลังทำ</option>
                <option value="completed">สำเร็จแล้ว</option>
              </select>
            </div>
            <Field
              label="ความคืบหน้า (%)"
              type="number"
              value={String(f.progress)}
              onChange={(v) => set("progress", Number(v))}
            />
          </div>

          {/* geofence */}
          <div className="rounded-xl bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">📍 พิกัดหน้างาน (geofence)</p>
              <button
                onClick={useCurrentLocation}
                disabled={locating}
                className="text-xs text-brand font-semibold"
              >
                {locating ? "กำลังดึง…" : "ใช้ตำแหน่งปัจจุบัน"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude" value={f.lat} onChange={(v) => set("lat", v)} />
              <Field label="Longitude" value={f.lng} onChange={(v) => set("lng", v)} />
            </div>
            <Field
              label="รัศมี (เมตร)"
              type="number"
              value={String(f.geofence_radius)}
              onChange={(v) => set("geofence_radius", Number(v))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ครบกำหนด" type="date" value={f.due_date} onChange={(v) => set("due_date", v)} />
            <Field
              label="วันส่งมอบ"
              type="date"
              value={f.delivered_date}
              onChange={(v) => set("delivered_date", v)}
            />
          </div>

          {/* เฟส */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">แผนงานตามเฟส</label>
              <button onClick={addPhase} className="text-xs text-brand font-semibold">
                + เพิ่มเฟส
              </button>
            </div>
            <div className="space-y-2">
              {phases.map((ph, i) => (
                <div key={i} className="rounded-xl bg-white p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={ph.name}
                      onChange={(e) => updatePhase(i, "name", e.target.value)}
                      placeholder="ชื่อเฟส"
                      className="flex-1 rounded-lg border border-black/10 px-2.5 py-2 text-sm"
                    />
                    <button onClick={() => removePhase(i)} className="text-brand-dark px-2">
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={ph.start_date}
                      onChange={(e) => updatePhase(i, "start_date", e.target.value)}
                      className="rounded-lg border border-black/10 px-2 py-2 text-xs"
                    />
                    <input
                      type="date"
                      value={ph.end_date}
                      onChange={(e) => updatePhase(i, "end_date", e.target.value)}
                      className="rounded-lg border border-black/10 px-2 py-2 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={ph.status}
                      onChange={(e) => updatePhase(i, "status", e.target.value)}
                      className="rounded-lg border border-black/10 px-2 py-2 text-sm"
                    >
                      <option value="pending">รอดำเนินการ</option>
                      <option value="in_progress">กำลังทำ</option>
                      <option value="done">เสร็จแล้ว</option>
                    </select>
                    <input
                      type="number"
                      value={ph.progress}
                      onChange={(e) => updatePhase(i, "progress", Number(e.target.value))}
                      placeholder="%"
                      className="rounded-lg border border-black/10 px-2 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {err && <p className="text-sm text-brand-dark">{err}</p>}

          <div className="flex gap-2 pt-1">
            {project && (
              <button
                onClick={remove}
                disabled={busy}
                className="rounded-xl border border-brand-dark/30 text-brand-dark px-4 py-3 font-semibold"
              >
                ลบ
              </button>
            )}
            <button
              onClick={save}
              disabled={busy}
              className="flex-1 rounded-xl bg-brand text-white py-3 font-semibold disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5"
      />
    </div>
  );
}
