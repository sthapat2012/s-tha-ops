"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandMark from "../_components/BrandMark";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-slate" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      if (data.status === "active") {
        router.replace(params.get("next") || "/");
      } else {
        router.replace("/pending");
      }
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-10 pt-safe pb-safe bg-slate text-cream">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <BrandMark className="w-20 h-20" />
          <h1 className="mt-4 text-2xl font-heading font-bold tracking-wide">
            S-THA
          </h1>
          <p className="text-sm text-cream/70">BUILDING &amp; ARCHITECT</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-cream/80">
              อีเมลหรือเบอร์โทร
            </label>
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              className="w-full rounded-xl bg-cream/10 border border-cream/20 px-4 py-3 text-cream placeholder:text-cream/40 focus:outline-none focus:border-brand"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-cream/80">รหัสผ่าน</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-cream/10 border border-cream/20 px-4 py-3 text-cream placeholder:text-cream/40 focus:outline-none focus:border-brand"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm bg-brand-dark/30 border border-brand/40 text-cream rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3.5 font-semibold text-white active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-cream/70">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-brand font-semibold">
            ขอเข้าใช้งาน
          </Link>
        </p>
      </div>
    </main>
  );
}
