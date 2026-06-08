"use client";

import { useState } from "react";

export default function BackupButton({
  driveConfigured,
  lastDriveBackup,
}: {
  driveConfigured: boolean;
  lastDriveBackup: string | null;
}) {
  const [busy, setBusy] = useState<"" | "download" | "drive">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string; link?: string } | null>(null);

  async function download() {
    setBusy("download");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stha-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMsg({ ok: false, text: "ดาวน์โหลดไม่สำเร็จ" });
    } finally {
      setBusy("");
    }
  }

  async function toDrive() {
    setBusy("drive");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/backup/drive", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "สำรองขึ้น Drive ไม่สำเร็จ" });
        return;
      }
      setMsg({ ok: true, text: "สำรองขึ้น Google Drive สำเร็จ", link: data.link });
    } catch {
      setMsg({ ok: false, text: "เชื่อมต่อไม่สำเร็จ" });
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">💾</span>
        <div className="flex-1">
          <p className="font-heading font-semibold">สำรองข้อมูล</p>
          <p className="text-xs text-slate/50">
            {lastDriveBackup
              ? `ขึ้น Drive ล่าสุด: ${fmt(lastDriveBackup)}`
              : "ฐานข้อมูล + เอกสาร + รูป"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={download}
          disabled={!!busy}
          className="rounded-xl bg-cream border border-black/10 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "download" ? "กำลังเตรียม…" : "⬇ ดาวน์โหลด ZIP"}
        </button>
        <button
          onClick={toDrive}
          disabled={!!busy || !driveConfigured}
          className="rounded-xl bg-success text-white py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "drive" ? "กำลังอัปโหลด…" : "☁ ขึ้น Google Drive"}
        </button>
      </div>

      {!driveConfigured && (
        <p className="text-[11px] text-slate/40 mt-2">
          * ปุ่ม Google Drive จะใช้ได้เมื่อตั้งค่า service account แล้ว (ดู DEPLOY.md)
        </p>
      )}

      {msg && (
        <p className={`text-sm mt-2 ${msg.ok ? "text-success" : "text-brand-dark"}`}>
          {msg.text}
          {msg.link && (
            <>
              {" "}
              <a href={msg.link} target="_blank" rel="noopener noreferrer" className="underline">
                เปิดดูใน Drive ↗
              </a>
            </>
          )}
        </p>
      )}
    </section>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
