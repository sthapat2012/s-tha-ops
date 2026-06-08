"use client";

import { useEffect, useState } from "react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "stha_install_dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ รายงานตัวเป็น Mac
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** แบนเนอร์/ปุ่มแนะนำติดตั้งแอป — แยกวิธีสำหรับ iPhone (Safari) และ Android (Chrome) */
export default function InstallPrompt({ variant = "banner" }: { variant?: "banner" | "inline" }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [sheet, setSheet] = useState<null | "ios" | "android">(null);

  useEffect(() => {
    if (isStandalone()) return; // ติดตั้งแล้ว ไม่ต้องแสดง
    if (variant === "banner" && localStorage.getItem(DISMISS_KEY)) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS ไม่มี beforeinstallprompt → แสดงคำแนะนำเอง
    if (isIOS()) setShow(true);

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, [variant]);

  async function onInstall() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setShow(false);
    } else {
      // iOS หรือยังไม่มี event → แสดงขั้นตอน
      setSheet(isIOS() ? "ios" : "android");
    }
  }

  function dismiss() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  const InstructionSheet = sheet && (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setSheet(null)}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full bg-cream rounded-t-3xl p-6 pb-safe max-h-[85%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-black/15 mb-4" />
        {sheet === "ios" ? (
          <>
            <h3 className="font-heading font-bold text-lg mb-3">ติดตั้งบน iPhone / iPad</h3>
            <ol className="space-y-3 text-slate/90">
              <Step n={1}>
                เปิดแอปนี้ด้วยเบราว์เซอร์ <b>Safari</b>
              </Step>
              <Step n={2}>
                แตะปุ่ม <b>แชร์</b> <ShareGlyph /> ที่แถบล่าง
              </Step>
              <Step n={3}>
                เลื่อนหาแล้วแตะ <b>“เพิ่มไปยังหน้าจอโฮม”</b> <PlusGlyph />
              </Step>
              <Step n={4}>
                แตะ <b>“เพิ่ม”</b> มุมขวาบน — เสร็จแล้วจะมีไอคอน S-THA บนหน้าจอ
              </Step>
            </ol>
          </>
        ) : (
          <>
            <h3 className="font-heading font-bold text-lg mb-3">ติดตั้งบน Android</h3>
            <ol className="space-y-3 text-slate/90">
              <Step n={1}>
                เปิดแอปนี้ด้วย <b>Chrome</b>
              </Step>
              <Step n={2}>
                แตะปุ่มเมนู <b>⋮</b> มุมขวาบน
              </Step>
              <Step n={3}>
                แตะ <b>“ติดตั้งแอป”</b> หรือ <b>“เพิ่มลงในหน้าจอหลัก”</b>
              </Step>
              <Step n={4}>ยืนยัน — ไอคอน S-THA จะปรากฏบนหน้าจอหลัก</Step>
            </ol>
          </>
        )}
        <button
          onClick={() => setSheet(null)}
          className="mt-6 w-full rounded-xl bg-slate text-cream py-3 font-semibold"
        >
          เข้าใจแล้ว
        </button>
      </div>
    </div>
  );

  // โหมด inline (เช่นในหน้า onboarding) — แสดงปุ่มเสมอ
  if (variant === "inline") {
    return (
      <>
        <button
          onClick={onInstall}
          className="w-full rounded-xl bg-brand text-white py-3.5 font-semibold flex items-center justify-center gap-2"
        >
          <DownloadGlyph /> ติดตั้งแอปลงหน้าจอโฮม
        </button>
        {InstructionSheet}
      </>
    );
  }

  if (!show) return null;

  return (
    <>
      <div className="rounded-2xl bg-slate text-cream p-4 flex items-center gap-3 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">ติดตั้งแอป S-THA</p>
          <p className="text-xs text-cream/60">เพิ่มลงหน้าจอโฮม ใช้งานเหมือนแอปจริง</p>
        </div>
        <button
          onClick={onInstall}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold shrink-0"
        >
          ติดตั้ง
        </button>
        <button onClick={dismiss} aria-label="ปิด" className="p-1 text-cream/50 shrink-0">
          ✕
        </button>
      </div>
      {InstructionSheet}
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="pt-0.5 leading-relaxed">{children}</span>
    </li>
  );
}

function ShareGlyph() {
  return (
    <span className="inline-flex align-middle">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m8 8 4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
    </span>
  );
}
function PlusGlyph() {
  return (
    <span className="inline-flex align-middle ml-0.5 w-[18px] h-[18px] rounded border border-slate/40 items-center justify-center text-xs">＋</span>
  );
}
function DownloadGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 11 5 4 5-4" /><path d="M5 21h14" /></svg>
  );
}
