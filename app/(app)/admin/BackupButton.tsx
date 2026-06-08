"use client";

import { useState } from "react";

export default function BackupButton() {
  const [busy, setBusy] = useState(false);

  async function backup() {
    setBusy(true);
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
      alert("สำรองข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={backup}
      disabled={busy}
      className="w-full rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3 active:scale-[0.99] transition disabled:opacity-50"
    >
      <span className="text-2xl">💾</span>
      <div className="text-left flex-1">
        <p className="font-heading font-semibold">สำรองข้อมูล</p>
        <p className="text-xs text-slate/50">
          {busy ? "กำลังเตรียมไฟล์…" : "ดาวน์โหลด ZIP (ฐานข้อมูล + เอกสาร) ไปเก็บใน Google Drive"}
        </p>
      </div>
      <span className="text-slate/30">↓</span>
    </button>
  );
}
