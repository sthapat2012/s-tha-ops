"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UpdateComposer({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setImage(f);
      setImageUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(f);
      });
    }
  }

  function clearImage() {
    setImage(null);
    setImageUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return "";
    });
  }

  async function submit() {
    if (!text.trim() && !image) {
      setErr("ใส่ข้อความหรือรูปภาพ");
      return;
    }
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.set("text", text);
    if (image) fd.set("image", image, "update.jpg");
    try {
      const res = await fetch(`/api/projects/${projectId}/updates`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        setErr((await res.json()).error ?? "โพสต์ไม่สำเร็จ");
        return;
      }
      setText("");
      clearImage();
      router.refresh();
    } catch {
      setErr("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="อัพเดตความคืบหน้าหน้างาน…"
        rows={2}
        className="w-full resize-none rounded-xl border border-black/10 bg-cream px-3 py-2.5 text-slate placeholder:text-slate/40 focus:outline-none focus:border-brand"
      />
      {imageUrl && (
        <div className="relative mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full h-44 object-cover rounded-xl" />
          <button
            onClick={clearImage}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7"
          >
            ✕
          </button>
        </div>
      )}
      {err && <p className="text-sm text-brand-dark mt-2">{err}</p>}
      <div className="flex items-center gap-2 mt-3">
        <label className="flex items-center gap-1.5 text-sm text-slate/70 px-3 py-2 rounded-lg bg-cream cursor-pointer">
          <span>📷</span> รูป
          <input type="file" accept="image/*" onChange={pickImage} className="hidden" />
        </label>
        <button
          onClick={submit}
          disabled={busy}
          className="ml-auto rounded-lg bg-brand px-5 py-2 text-white font-semibold disabled:opacity-50"
        >
          {busy ? "กำลังโพสต์…" : "โพสต์"}
        </button>
      </div>
    </div>
  );
}
