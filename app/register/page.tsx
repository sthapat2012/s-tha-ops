"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "../_components/BrandMark";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"pending" | null>(null);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "สมัครไม่สำเร็จ");
        return;
      }
      if (data.status === "active") {
        router.replace("/");
        router.refresh();
      } else {
        setDone("pending");
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  if (done === "pending") {
    return (
      <main className="min-h-dvh flex flex-col justify-center items-center text-center px-6 bg-slate text-cream">
        <div className="w-16 h-16 rounded-full bg-warn/20 border border-warn/40 flex items-center justify-center text-3xl">
          ⏳
        </div>
        <h1 className="mt-5 text-xl font-heading font-bold">ส่งคำขอแล้ว</h1>
        <p className="mt-2 text-cream/70 max-w-xs">
          บัญชีของคุณอยู่ระหว่าง<b className="text-warn">รอผู้ดูแลระบบอนุมัติ</b>{" "}
          เมื่อได้รับอนุมัติแล้วจะเข้าใช้งานได้ทันที
        </p>
        <Link
          href="/login"
          className="mt-6 rounded-xl bg-brand px-6 py-3 font-semibold text-white"
        >
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-10 pt-safe pb-safe bg-slate text-cream">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <BrandMark className="w-16 h-16" />
          <h1 className="mt-3 text-xl font-heading font-bold">ขอเข้าใช้งานระบบ</h1>
          <p className="text-sm text-cream/70 text-center mt-1">
            กรอกข้อมูลเพื่อส่งคำขอ — ผู้ดูแลระบบจะอนุมัติก่อนเริ่มใช้งาน
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="ชื่อ-นามสกุล" required value={form.name} onChange={(v) => set("name", v)} placeholder="สมชาย ก่อสร้าง" />
          <Field label="อีเมล" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@example.com" />
          <Field label="เบอร์โทร" type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="08x-xxx-xxxx" />
          <Field label="รหัสผ่าน (อย่างน้อย 6 ตัว)" type="password" required value={form.password} onChange={(v) => set("password", v)} placeholder="••••••••" />
          <p className="text-xs text-cream/50">* กรอกอีเมลหรือเบอร์โทรอย่างน้อยหนึ่งอย่าง</p>

          {error && (
            <p className="text-sm bg-brand-dark/30 border border-brand/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3.5 font-semibold text-white active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? "กำลังส่งคำขอ…" : "ส่งคำขอเข้าใช้งาน"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-cream/70">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="text-brand font-semibold">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-cream/80">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-cream/10 border border-cream/20 px-4 py-3 text-cream placeholder:text-cream/40 focus:outline-none focus:border-brand"
      />
    </div>
  );
}
