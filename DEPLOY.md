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
| `GOOGLE_SERVICE_ACCOUNT_JSON` | (เนื้อหาไฟล์ JSON — ดูภาคผนวก Google Drive) |
| `GDRIVE_FOLDER_ID` | (id โฟลเดอร์ Drive — ดูภาคผนวก) |

> 2 ตัวล่างเป็น **ตัวเลือก** — ถ้ายังไม่ตั้ง แอปก็ใช้ได้ปกติ แค่ปุ่ม "สำรองขึ้น Google Drive"
> จะใช้ไม่ได้ (ยังกดดาวน์โหลด ZIP เองได้)

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
- เข้าเมนู **จัดการระบบ → สำรองข้อมูล**
  - **⬇ ดาวน์โหลด ZIP** — โหลดมาเก็บเอง (ใช้ได้เสมอ)
  - **☁ ขึ้น Google Drive** — อัปโหลดเข้าโฟลเดอร์ Drive บริษัทอัตโนมัติ (ต้องตั้งค่าในภาคผนวก)
- แนะนำสำรองทุกสัปดาห์

---

## ภาคผนวก — เชื่อม Google Drive (สำรองอัตโนมัติ)
ใช้ **Service Account** ของ Google (บัญชีหุ่นยนต์) อัปโหลดไฟล์เข้าโฟลเดอร์ Drive ที่เราแชร์ให้ —
เซิร์ฟเวอร์ทำงานเองได้โดยไม่ต้องล็อกอินซ้ำ

1. ไปที่ https://console.cloud.google.com → สร้างโปรเจกต์ใหม่ (เช่น "STHA Backup")
2. เมนู **APIs & Services → Library** → ค้นหา **Google Drive API** → กด **Enable**
3. **APIs & Services → Credentials → Create Credentials → Service account**
   - ตั้งชื่อ เช่น `stha-backup` → Create → ข้ามสิทธิ์ → Done
4. คลิกที่ service account ที่สร้าง → แท็บ **Keys → Add Key → Create new key → JSON** → ดาวน์โหลดไฟล์ JSON มา
   - **คัดลอกเนื้อหาทั้งไฟล์** ไปใส่ค่า env `GOOGLE_SERVICE_ACCOUNT_JSON` บน Railway
   - ในไฟล์จะมี `"client_email": "stha-backup@....iam.gserviceaccount.com"` — จำอีเมลนี้ไว้
5. เปิด Google Drive ของบริษัท → สร้างโฟลเดอร์ เช่น **"STHA Backup"**
   - คลิกขวา → **แชร์** → ใส่อีเมล service account (จากข้อ 4) → ให้สิทธิ์ **Editor**
6. เปิดโฟลเดอร์นั้น → ดู URL `https://drive.google.com/drive/folders/XXXXXXXX`
   - เอา `XXXXXXXX` ไปใส่ค่า env `GDRIVE_FOLDER_ID` บน Railway
7. Redeploy → เข้าเมนูสำรองข้อมูล → กด **☁ ขึ้น Google Drive** → ไฟล์จะไปโผล่ในโฟลเดอร์

> ความปลอดภัย: service account เห็นเฉพาะไฟล์ที่ตัวเองสร้าง (scope `drive.file`) เข้าถึง Drive อื่นไม่ได้

## อัปเดตแอปในอนาคต
แก้โค้ดแล้ว `git push` → Railway redeploy อัตโนมัติ (ข้อมูลใน volume ยังอยู่ครบ)
