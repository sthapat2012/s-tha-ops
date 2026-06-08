"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { distanceMeters } from "@/lib/geo";
import type { Project, TimeEntry } from "@/lib/types";
import { enqueue, flushQueue } from "./offlineQueue";

type Period = "today" | "week" | "month";

interface Pos {
  lat: number;
  lng: number;
  accuracy: number;
}

export default function ClockClient() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [geoError, setGeoError] = useState<string>("");
  const [placeName, setPlaceName] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [clockedIn, setClockedIn] = useState(false);
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [history, setHistory] = useState<TimeEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const geocodedFor = useRef<string>("");

  // ── เฝ้าตำแหน่ง GPS ตลอด ──
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGeoError("");
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
      },
      (err) => {
        setPos(null);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "ไม่ได้อนุญาตให้เข้าถึงตำแหน่ง — กรุณาเปิดการระบุตำแหน่งเพื่อลงเวลา"
            : "ระบุตำแหน่งไม่สำเร็จ ลองออกไปที่โล่ง ๆ แล้วลองใหม่"
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── reverse geocode (ชื่อสถานที่) เมื่อได้พิกัดครั้งแรก/เปลี่ยนมาก ──
  useEffect(() => {
    if (!pos) return;
    const key = `${pos.lat.toFixed(3)},${pos.lng.toFixed(3)}`;
    if (geocodedFor.current === key) return;
    geocodedFor.current = key;
    const ctrl = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&accept-language=th&lat=${pos.lat}&lon=${pos.lng}`,
      { signal: ctrl.signal, headers: { "Accept": "application/json" } }
    )
      .then((r) => r.json())
      .then((d) => setPlaceName(d.display_name ?? ""))
      .catch(() => {});
    return () => ctrl.abort();
  }, [pos]);

  const loadStatus = useCallback(async () => {
    const r = await fetch("/api/time/status");
    if (r.ok) {
      const d = await r.json();
      setClockedIn(d.clockedIn);
      setLastEntry(d.last);
    }
  }, []);

  const loadHistory = useCallback(async (p: Period) => {
    const r = await fetch(`/api/time/history?period=${p}`);
    if (r.ok) setHistory((await r.json()).entries);
  }, []);

  const loadProjects = useCallback(async () => {
    const r = await fetch("/api/projects?status=active");
    if (r.ok) {
      const d = await r.json();
      setProjects(d.projects);
      if (d.projects[0]) setProjectId((cur) => cur || String(d.projects[0].id));
    }
  }, []);

  // ── โหลดข้อมูล + ซิงค์คิวออฟไลน์เมื่อกลับมาออนไลน์ ──
  const syncPending = useCallback(async () => {
    const n = await flushQueue();
    const { getQueue } = await import("./offlineQueue");
    setPendingCount((await getQueue()).length);
    if (n > 0) {
      await loadStatus();
      await loadHistory(period);
    }
  }, [loadStatus, loadHistory, period]);

  useEffect(() => {
    loadProjects();
    loadStatus();
    syncPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadHistory(period);
  }, [period, loadHistory]);

  useEffect(() => {
    const onOnline = () => syncPending();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncPending]);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setPhoto(f);
      setPhotoUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(f);
      });
    }
  }

  const selectedProject = projects.find((p) => String(p.id) === projectId);
  const geofence =
    selectedProject && selectedProject.lat != null && selectedProject.lng != null && pos
      ? {
          distance: distanceMeters(pos.lat, pos.lng, selectedProject.lat, selectedProject.lng),
          radius: selectedProject.geofence_radius,
        }
      : null;
  const withinRadius = geofence ? geofence.distance <= geofence.radius : null;

  const action: "in" | "out" = clockedIn ? "out" : "in";
  const canSubmit = !!pos && !!photo && !submitting;

  async function submit() {
    if (!pos || !photo) return;
    setSubmitting(true);
    setMessage(null);
    const clientTime = new Date().toISOString();

    const fd = new FormData();
    fd.set("kind", action);
    if (projectId) fd.set("project_id", projectId);
    fd.set("lat", String(pos.lat));
    fd.set("lng", String(pos.lng));
    fd.set("accuracy", String(pos.accuracy));
    if (placeName) fd.set("place_name", placeName);
    fd.set("client_time", clientTime);
    fd.set("photo", photo, "selfie.jpg");

    try {
      if (!navigator.onLine) throw new Error("offline");
      const res = await fetch("/api/time", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "ลงเวลาไม่สำเร็จ" });
        return;
      }
      const out = action === "out";
      const geoMsg =
        data.within_geofence === 0
          ? ` (⚠️ อยู่นอกรัศมีหน้างาน ${data.distance_m} ม.)`
          : data.within_geofence === 1
            ? " (อยู่ในรัศมีหน้างาน ✓)"
            : "";
      setMessage({
        type: data.within_geofence === 0 ? "warn" : "ok",
        text: `${out ? "เลิกงาน" : "เข้างาน"}สำเร็จ${geoMsg}`,
      });
      clearPhoto();
      await loadStatus();
      await loadHistory(period);
    } catch {
      // ออฟไลน์ → เก็บลงคิว
      await enqueue({
        kind: action,
        project_id: projectId,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        place_name: placeName || null,
        client_time: clientTime,
        photo,
      });
      const { getQueue } = await import("./offlineQueue");
      setPendingCount((await getQueue()).length);
      setMessage({
        type: "warn",
        text: "สัญญาณไม่ดี — บันทึกไว้ในเครื่องแล้ว จะส่งขึ้นระบบอัตโนมัติเมื่อกลับมาออนไลน์",
      });
      clearPhoto();
      // อัปเดตสถานะแบบ optimistic
      setClockedIn(action === "in");
    } finally {
      setSubmitting(false);
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return "";
    });
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <h1 className="font-heading font-bold text-2xl">ลงเวลางาน</h1>

      {pendingCount > 0 && (
        <div className="rounded-xl bg-warn/15 border border-warn/40 px-3 py-2 text-sm text-slate flex items-center gap-2">
          <span>📤</span> มีรายการรอซิงค์ {pendingCount} รายการ
        </div>
      )}

      {/* สถานะปัจจุบัน */}
      <div className={`rounded-2xl p-4 text-white ${clockedIn ? "bg-success" : "bg-slate"}`}>
        <p className="text-sm opacity-80">สถานะตอนนี้</p>
        <p className="font-heading font-bold text-xl">
          {clockedIn ? "กำลังเข้างาน" : "ยังไม่เข้างาน"}
        </p>
        {lastEntry && (
          <p className="text-xs opacity-70 mt-1">
            ล่าสุด: {lastEntry.kind === "in" ? "เข้างาน" : "เลิกงาน"} ·{" "}
            {fmtDateTime(lastEntry.created_at)}
            {lastEntry.project_name ? ` · ${lastEntry.project_name}` : ""}
          </p>
        )}
      </div>

      {/* GPS */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="font-heading font-semibold">ตำแหน่งของคุณ</p>
          <GpsBadge pos={pos} error={!!geoError} />
        </div>
        {geoError ? (
          <p className="text-sm text-brand-dark mt-2">{geoError}</p>
        ) : pos ? (
          <>
            <p className="text-xs text-slate/60 mt-2">
              {placeName || "กำลังระบุชื่อสถานที่…"}
            </p>
            <p className="text-[11px] text-slate/40 mt-0.5">
              {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} · ความแม่นยำ ±{Math.round(pos.accuracy)} ม.
            </p>
            <iframe
              title="แผนที่ตำแหน่ง"
              className="mt-3 w-full h-44 rounded-xl border border-black/10"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${pos.lng - 0.004}%2C${pos.lat - 0.004}%2C${pos.lng + 0.004}%2C${pos.lat + 0.004}&layer=mapnik&marker=${pos.lat}%2C${pos.lng}`}
            />
          </>
        ) : (
          <p className="text-sm text-slate/50 mt-2">กำลังค้นหาตำแหน่ง…</p>
        )}
      </div>

      {/* เลือกโครงการ */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="font-heading font-semibold block mb-2">โครงการที่ทำ</label>
        {projects.length === 0 ? (
          <p className="text-sm text-slate/50">ยังไม่มีโครงการ (admin เพิ่มได้ในเมนูจัดการ)</p>
        ) : (
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-cream px-3 py-3 text-slate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {geofence && (
          <div
            className={`mt-3 rounded-xl px-3 py-2 text-sm flex items-center gap-2 ${
              withinRadius
                ? "bg-success/15 text-success border border-success/30"
                : "bg-warn/15 text-warn border border-warn/40"
            }`}
          >
            {withinRadius ? "✓ อยู่ในรัศมีหน้างาน" : "⚠️ อยู่นอกรัศมีหน้างาน"} · ห่าง{" "}
            {geofence.distance} ม. (รัศมี {geofence.radius} ม.)
          </div>
        )}
      </div>

      {/* ถ่ายรูปยืนยันตัวตน */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="font-heading font-semibold mb-2">รูปยืนยันตัวตน *</p>
        {photoUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="selfie" className="w-full h-56 object-cover rounded-xl" />
            <button
              onClick={clearPhoto}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-slate/20 text-slate/50 cursor-pointer">
            <span className="text-3xl">📷</span>
            <span className="text-sm mt-1">แตะเพื่อถ่ายรูป</span>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPickPhoto}
              className="hidden"
            />
          </label>
        )}
      </div>

      {message && (
        <div
          className={`rounded-xl px-3 py-3 text-sm ${
            message.type === "ok"
              ? "bg-success/15 text-success border border-success/30"
              : message.type === "warn"
                ? "bg-warn/15 text-slate border border-warn/40"
                : "bg-brand-dark/10 text-brand-dark border border-brand/30"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ปุ่มลงเวลา — เทา/กดไม่ได้ ถ้าไม่มีพิกัดหรือรูป */}
      <button
        onClick={submit}
        disabled={!canSubmit}
        className={`w-full rounded-2xl py-4 font-heading font-bold text-lg text-white transition active:scale-[0.99] ${
          !canSubmit
            ? "bg-slate/30 cursor-not-allowed"
            : action === "out"
              ? "bg-brand-dark"
              : "bg-brand"
        }`}
      >
        {submitting
          ? "กำลังบันทึก…"
          : action === "out"
            ? "เลิกงาน"
            : "เข้างาน"}
      </button>
      {!pos && !geoError && (
        <p className="text-center text-xs text-slate/50">รอสัญญาณ GPS ก่อนจึงลงเวลาได้</p>
      )}
      {!photo && pos && (
        <p className="text-center text-xs text-slate/50">ถ่ายรูปยืนยันตัวตนก่อนจึงลงเวลาได้</p>
      )}

      {/* ประวัติ */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="font-heading font-semibold">ประวัติการลงเวลา</p>
          <div className="flex gap-1 bg-cream rounded-lg p-1">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs rounded-md ${
                  period === p ? "bg-white shadow-sm font-semibold text-brand" : "text-slate/60"
                }`}
              >
                {p === "today" ? "วันนี้" : p === "week" ? "สัปดาห์" : "เดือน"}
              </button>
            ))}
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate/40 text-center py-4">ไม่มีรายการในช่วงนี้</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {history.map((h) => (
              <li key={h.id} className="py-2.5 flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${h.kind === "in" ? "bg-success" : "bg-slate/40"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {h.kind === "in" ? "เข้างาน" : "เลิกงาน"}
                    {h.project_name ? ` · ${h.project_name}` : ""}
                  </p>
                  <p className="text-[11px] text-slate/50">{fmtDateTime(h.created_at)}</p>
                </div>
                {h.within_geofence === 0 && <span className="text-xs text-warn">นอกรัศมี</span>}
                {h.photo_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.photo_path} alt="" className="w-9 h-9 rounded-lg object-cover" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GpsBadge({ pos, error }: { pos: Pos | null; error: boolean }) {
  if (error)
    return <span className="text-xs px-2 py-1 rounded-full bg-brand-dark/10 text-brand-dark">GPS ปิด</span>;
  if (!pos)
    return <span className="text-xs px-2 py-1 rounded-full bg-warn/15 text-warn">กำลังค้นหา…</span>;
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success">GPS พร้อม</span>
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
