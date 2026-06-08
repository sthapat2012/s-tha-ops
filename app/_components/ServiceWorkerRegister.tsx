"use client";

import { useEffect } from "react";

/** ลงทะเบียน service worker เพื่อให้ติดตั้ง PWA และทำงานตอนออฟไลน์ได้ */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      // ระหว่าง dev ไม่ลงทะเบียน SW เพื่อให้ hot-reload ทำงานปกติ
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* เงียบไว้ ไม่ให้กระทบการใช้งาน */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
