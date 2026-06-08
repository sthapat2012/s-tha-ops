import { ZipArchive } from "archiver";
import { existsSync } from "node:fs";
import { db } from "./db";
import { DB_PATH, DOCS_DIR, UPLOADS_DIR } from "./paths";

/** สร้างไฟล์ ZIP สำรองข้อมูล (ฐานข้อมูล + เอกสาร + รูป) เป็น Buffer */
export async function buildBackupZip(byName: string): Promise<Buffer> {
  // flush WAL ลงไฟล์หลักก่อน เพื่อให้ app.db ที่ backup มีข้อมูลครบ
  db.pragma("wal_checkpoint(TRUNCATE)");

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  const done = new Promise<void>((resolve, reject) => {
    archive.on("data", (c: Buffer) => chunks.push(c));
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });

  if (existsSync(DB_PATH)) archive.file(DB_PATH, { name: "app.db" });
  if (existsSync(DOCS_DIR)) archive.directory(DOCS_DIR, "docs");
  if (existsSync(UPLOADS_DIR)) archive.directory(UPLOADS_DIR, "uploads");
  archive.append(
    JSON.stringify({ created_at: new Date().toISOString(), by: byName }, null, 2),
    { name: "backup-info.json" }
  );

  await archive.finalize();
  await done;
  return Buffer.concat(chunks);
}

export function backupFilename(): string {
  return `stha-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`;
}
