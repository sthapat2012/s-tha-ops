import path from "node:path";

// ที่เก็บข้อมูลที่เปลี่ยนแปลงได้ทั้งหมด (DB + ไฟล์อัปโหลด + เอกสาร)
// production (Railway) ตั้ง DATA_DIR ให้ชี้ไป persistent volume เช่น /data
// local dev ใช้โฟลเดอร์ data/ ในโปรเจกต์
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

export const DB_PATH = path.join(DATA_DIR, "app.db");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads"); // รูป (เสิร์ฟผ่าน /uploads/*)
export const DOCS_DIR = path.join(DATA_DIR, "docs"); // เอกสารลับ (เสิร์ฟผ่าน /api/documents/:id)
