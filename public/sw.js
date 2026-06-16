// Service Worker ของ S-THA
// กลยุทธ์: cache-first เฉพาะไฟล์ static (รูป/js/css ที่มี hash) เท่านั้น
//          ส่วนหน้าเว็บ + ข้อมูล (RSC) + API → network-first เสมอ เพื่อให้ข้อมูลสดตลอด
// เป้าหมาย: ติดตั้ง PWA ได้ + ใช้ต่อได้ตอนสัญญาณไม่ดี + ไม่ค้างข้อมูลเก่า
const CACHE = "stha-v2";
const APP_SHELL = ["/offline.html", "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ไฟล์ static ที่เปลี่ยนยาก (มี hash ในชื่อ) → cache ได้ปลอดภัย
function isStaticAsset(url, request) {
  if (url.pathname.startsWith("/_next/static")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  return ["style", "script", "image", "font"].includes(request.destination);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API + ข้อมูลหน้า (RSC) → ไม่แคช ดึงสดเสมอ
  if (url.pathname.startsWith("/api/")) return;

  // ไฟล์ static → cache-first (เร็ว + ประหยัดเน็ต)
  if (isStaticAsset(url, request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  // ทุกอย่างอื่น (หน้าเว็บ, RSC, ข้อมูล dynamic) → network-first เสมอ
  // ออฟไลน์เท่านั้นจึงตกไปใช้ cache / offline.html
  event.respondWith(
    fetch(request).catch(() => {
      if (request.mode === "navigate") {
        return caches.match("/offline.html");
      }
      return caches.match(request);
    })
  );
});
