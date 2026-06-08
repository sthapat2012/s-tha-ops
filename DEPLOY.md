# คู่มือ Deploy S-THA ขึ้น Railway (ใช้งานจริง)

แอปนี้ต้องการ **ดิสก์ถาวร (volume)** สำหรับเก็บฐานข้อมูล + ไฟล์อัปโหลด
และรันเป็น Node server ตลอดเวลา — Railway รองรับครบ

> ส่วนที่ผมเตรียมให้แล้ว: `Dockerfile`, `.dockerignore`, รองรับ `DATA_DIR`, เสิร์ฟรูปจาก volume
> ส่วนที่ต้องเป็นคุณ: สมัคร Railway + ผูกบัตร/จ่ายเงิน (ผมทำแทนไม่ได้)

---

## ขั้นที่ 1 — สร้างคีย์ลับ (AUTH_SECRET)
รันคำสั่งนี้ในเทอร์มินัล แล้วเก็บค่าที่ได้ไว้ (ใช้ในขั้นที่ 4):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## ขั้นที่ 2 — เอาโค้ดขึ้น GitHub
```bash
cd ~/Desktop/s-tha/s-tha-ops
git add -A && git commit -m "พร้อม deploy"
# สร้าง repo ใหม่บน github.com (ตั้งเป็น Private) แล้ว:
git remote add origin https://github.com/<ชื่อคุณ>/s-tha-ops.git
git branch -M main
git push -u origin main
```
> ทางเลือก (ไม่ใช้ GitHub): ติดตั้ง Railway CLI แล้วใช้ `railway up` อัปโหลดโฟลเดอร์นี้ตรง ๆ

## ขั้นที่ 3 — สร้างโปรเจกต์บน Railway
1. สมัคร/เข้าสู่ระบบที่ https://railway.app (ผูกการชำระเงิน — แพ็กเริ่มต้น ~$5/เดือน)
2. **New Project → Deploy from GitHub repo** → เลือก repo `s-tha-ops`
3. Railway จะตรวจเจอ `Dockerfile` และเริ่ม build อัตโนมัติ

## ขั้นที่ 4 — เพิ่ม Volume (ดิสก์ถาวร) — สำคัญมาก
1. ในหน้า service → แท็บ **Variables / Settings → Volumes → + New Volume**
2. ตั้ง **Mount path = `/data`**
> ถ้าไม่ทำขั้นนี้ ข้อมูลจะหายทุกครั้งที่ deploy ใหม่

## ขั้นที่ 5 — ตั้งค่า Environment Variables
ในแท็บ **Variables** เพิ่ม:
| ชื่อ | ค่า |
|------|-----|
| `AUTH_SECRET` | (ค่าที่ได้จากขั้นที่ 1) |
| `DATA_DIR` | `/data` |
| `NODE_ENV` | `production` |

## ขั้นที่ 6 — เปิดให้เข้าจากภายนอก
1. แท็บ **Settings → Networking → Generate Domain**
2. จะได้ URL แบบ `https://s-tha-ops-production.up.railway.app` — เป็น HTTPS ถาวร เปิดตลอด

## ขั้นที่ 7 — เริ่มใช้งาน
1. เปิด URL บนมือถือ → **กด "ขอเข้าใช้งาน" สมัครเป็นคนแรก = เจ้าของระบบ (owner) ทันที**
2. ติดตั้งลงหน้าจอโฮม (PWA) ได้เลย
3. ให้พนักงานเปิด URL เดียวกัน สมัคร แล้วคุณอนุมัติในเมนู "จัดการ"

## (ทางเลือก) ใช้โดเมนบริษัท เช่น app.stha.co.th
- Railway → Settings → Networking → **Custom Domain** → ใส่ `app.stha.co.th`
- ไปตั้ง CNAME record ที่ผู้ให้บริการโดเมนตามค่าที่ Railway บอก

---

## การสำรองข้อมูล
- เข้าเมนู **จัดการระบบ → สำรองข้อมูล** ดาวน์โหลด ZIP (ฐานข้อมูล + เอกสาร + รูป) เก็บใน Google Drive เป็นระยะ
- แนะนำสำรองทุกสัปดาห์

## อัปเดตแอปในอนาคต
แก้โค้ดแล้ว `git push` → Railway redeploy อัตโนมัติ (ข้อมูลใน volume ยังอยู่ครบ)
