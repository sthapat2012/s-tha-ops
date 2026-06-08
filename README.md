# S-THA · ระบบบริหารงานก่อสร้าง (PWA)

แอปใช้งานภายในบริษัท S-THA (Building & Architect) — ลงเวลางาน ติดตามหน้างาน
ดูผลิตภัณฑ์ และจัดการระบบ ออกแบบให้ใช้บนมือถือเป็นหลัก ติดตั้งเป็น PWA ได้

## เทคโนโลยี
| ส่วน | ใช้ |
|------|-----|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| UI | Tailwind CSS v4 · ฟอนต์ Kanit (หัวข้อ) + IBM Plex Sans Thai (เนื้อหา) |
| ฐานข้อมูล | SQLite ผ่าน `better-sqlite3` (ไฟล์ `data/app.db`) |
| ล็อกอิน | JWT ใน httpOnly cookie + bcrypt · กั้นเส้นทางด้วย `proxy.ts` |
| แผนที่/GPS | (เฟส 2) Leaflet + OpenStreetMap + Nominatim |
| PWA | `app/manifest.ts` + `public/sw.js` + ไอคอนใน `public/icons/` |

## เริ่มใช้งาน
```bash
npm install
npm run dev        # http://localhost:3000
```

### บัญชีเจ้าของระบบ (owner)
ฐานข้อมูลเริ่มต้นว่างเปล่า — **ผู้ที่สมัครเป็นคนแรกสุดจะกลายเป็นเจ้าของระบบ (owner)
โดยอัตโนมัติและใช้งานได้ทันที** จากนั้นผู้สมัครคนถัดไปจะอยู่สถานะ "รออนุมัติ"
จนกว่า owner/admin จะอนุมัติ (หน้าอนุมัติอยู่ในเฟส 5)

## โครงสร้าง
```
lib/            db.ts (schema ทุกตาราง), auth.ts (JWT/bcrypt), session.ts
proxy.ts        กั้นเส้นทางตามการล็อกอิน (แทน middleware ใน Next 16)
app/
  layout.tsx          ฟอนต์ + PWA metadata + service worker
  manifest.ts         web app manifest
  login, register, pending, onboarding   หน้าก่อนเข้าระบบ
  (app)/              หน้าหลังล็อกอิน (มี header + bottom nav)
    page.tsx          หน้าแรก / Dashboard
    clock, projects, products, company, admin
  api/auth/           login, register, logout
scripts/generate-icons.mjs   สร้างไอคอน PWA จากโลโก้
```

## สถานะการพัฒนา (เสร็จครบทุกเฟส ✓)
- [x] **เฟส 1** — PWA + ล็อกอิน + ฐานข้อมูล + โครงสร้างเมนู + Dashboard
- [x] **เฟส 2** — ลงเวลางาน (GPS บังคับ, geofencing, ถ่ายรูปยืนยัน, ออฟไลน์ซิงค์, ประวัติ)
- [x] **เฟส 3** — หน้างาน (แท็บสถานะ, แผนงานตามเฟส, ฟีดอัพเดต, เอกสาร admin-only)
- [x] **เฟส 4** — ผลิตภัณฑ์ (ค้นหา/กรอง/CRUD) + Company Profile (แสดง + admin แก้ไข)
- [x] **เฟส 5** — จัดการระบบ (อนุมัติบัญชี+สิทธิ์, ส่งออก Excel, geofence/โครงการ, backup ZIP, audit log)

### หมายเหตุ Google Drive backup
ปุ่ม "สำรองข้อมูล" ดาวน์โหลดไฟล์ ZIP (ฐานข้อมูล + เอกสาร + รูป) มาที่เครื่อง แล้วนำไปวางใน
Google Drive ของบริษัทได้ทันที การเชื่อม Google Drive อัตโนมัติผ่าน OAuth (อัปโหลดเองโดยไม่ต้อง
ดาวน์โหลด) ต้องตั้งค่า Google API credentials เพิ่ม — เป็นขั้นตอนถัดไปเมื่อพร้อม

## หมายเหตุการนำขึ้น production
- ตั้งค่า `AUTH_SECRET` เป็นค่าสุ่มที่ปลอดภัย (ดู `.env.example`)
- ต้องรันบน **HTTPS** เพื่อให้ GPS/กล้อง และการติดตั้ง PWA ทำงาน
