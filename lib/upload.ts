import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOADS_DIR, DOCS_DIR } from "./paths";

// รูปอัปโหลด เก็บใน DATA_DIR/uploads (persistent volume) เสิร์ฟผ่าน /uploads/*
const UPLOAD_ROOT = UPLOADS_DIR;
// เอกสารลับ (ใบเสร็จ/ใบกำกับภาษี) เก็บแยก เสิร์ฟผ่าน route ที่เช็คสิทธิ์เท่านั้น
const PROTECTED_ROOT = DOCS_DIR;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/**
 * บันทึกไฟล์ที่อัปโหลดลงดิสก์ (public/uploads/<subdir>) แล้วคืน path สำหรับเก็บใน DB
 * คืนค่าเป็น URL แบบ /uploads/... ที่เปิดดูได้โดยตรง
 */
export async function saveUpload(
  file: File,
  subdir: string,
  allowed: "image" | "any" = "image"
): Promise<string> {
  if (allowed === "image" && !file.type.startsWith("image/")) {
    throw new Error("ไฟล์ต้องเป็นรูปภาพเท่านั้น");
  }
  const ext = EXT[file.type] ?? "bin";
  const dir = path.join(UPLOAD_ROOT, subdir);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const name = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${subdir}/${name}`;
}

/**
 * บันทึกเอกสารลับลง data/docs/ (นอก public) แล้วคืน "ชื่อไฟล์" ที่เก็บใน DB
 * ต้องเปิดผ่าน /api/documents/<id> ที่ตรวจสิทธิ์ admin เท่านั้น
 */
export async function saveProtected(file: File): Promise<{ stored: string; mime: string }> {
  if (!existsSync(PROTECTED_ROOT)) await mkdir(PROTECTED_ROOT, { recursive: true });
  const ext = EXT[file.type] ?? "bin";
  const stored = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(PROTECTED_ROOT, stored), buffer);
  return { stored, mime: file.type };
}

export function protectedPath(stored: string): string {
  return path.join(PROTECTED_ROOT, stored);
}
