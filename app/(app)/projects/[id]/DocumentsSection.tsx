"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocumentItem } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  quote: "ใบเสนอราคา",
  receipt: "ใบเสร็จ",
  invoice: "ใบกำกับภาษี",
  other: "เอกสารอื่น",
};

export default function DocumentsSection({
  projectId,
  docs,
}: {
  projectId: number;
  docs: DocumentItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("quote");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload() {
    if (!file) {
      setErr("เลือกไฟล์ก่อน");
      return;
    }
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("name", name || file.name);
    fd.set("kind", kind);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        setErr((await res.json()).error ?? "อัปโหลดไม่สำเร็จ");
        return;
      }
      setFile(null);
      setName("");
      setOpen(false);
      router.refresh();
    } catch {
      setErr("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading font-semibold flex items-center gap-2">
          🔒 เอกสารโครงการ
        </h2>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-sm text-brand font-semibold"
        >
          {open ? "ยกเลิก" : "+ เพิ่ม"}
        </button>
      </div>
      <p className="text-xs text-slate/40 mb-3">เปิดดูได้เฉพาะผู้ดูแลระบบ</p>

      {open && (
        <div className="rounded-xl bg-cream p-3 mb-3 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อเอกสาร"
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          >
            <option value="quote">ใบเสนอราคา</option>
            <option value="receipt">ใบเสร็จ</option>
            <option value="invoice">ใบกำกับภาษี</option>
            <option value="other">เอกสารอื่น</option>
          </select>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          {err && <p className="text-sm text-brand-dark">{err}</p>}
          <button
            onClick={upload}
            disabled={busy}
            className="w-full rounded-lg bg-slate text-cream py-2 font-semibold disabled:opacity-50"
          >
            {busy ? "กำลังอัปโหลด…" : "อัปโหลดเอกสาร"}
          </button>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-sm text-slate/40 text-center py-3">ยังไม่มีเอกสาร</p>
      ) : (
        <ul className="divide-y divide-black/5">
          {docs.map((d) => (
            <li key={d.id}>
              <a
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-2.5"
              >
                <span className="text-xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-slate/50">{KIND_LABEL[d.kind ?? "other"]}</p>
                </div>
                <span className="text-brand text-sm">เปิด ↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
