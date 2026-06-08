// Service Worker ของ S-THA
// กลยุทธ์: network-first สำหรับหน้าเว็บ, cache-first สำหรับ asset
// เป้าหมาย: ติดตั้ง PWA ได้ + ใช้งานต่อได้ตอนสัญญาณไม่ดี
const CACHE = "stha-v1";
const APP_SHELL = ["/", "/offline.html", "/icons/icon-192.png", "/manifest.webmanifest"];

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
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ไม่ cache คำขอ API (ข้อมูลสด)
  if (url.pathname.startsWith("/api/")) return;

  // หน้าเว็บ (navigation): network-first, ตกไป cache แล้ว offline.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((m) => m || caches.match("/offline.html"))
        )
    );
    return;
  }

  // asset อื่น ๆ: cache-first
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
});
