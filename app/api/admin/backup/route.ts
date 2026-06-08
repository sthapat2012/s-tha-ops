import { NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import path from "node:path";
import { existsSync } from "node:fs";
import { requireAdmin } from "@/lib/admin";
import { db, audit } from "@/lib/db";

/** สำรองข้อมูลเป็นไฟล์ ZIP (ฐานข้อมูล + เอกสารโครงการ + รูปอัปโหลด) — admin
 *  ดาวน์โหลดไปเก็บใน Google Drive ของบริษัทได้ */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // flush WAL ลงไฟล์หลักก่อน เพื่อให้ไฟล์ app.db ที่ backup มีข้อมูลครบ
  db.pragma("wal_checkpoint(TRUNCATE)");

  const root = process.cwd();
  const dbPath = path.join(root, "data", "app.db");
  const docsDir = path.join(root, "data", "docs");
  const uploadsDir = path.join(root, "public", "uploads");

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  const done = new Promise<void>((resolve, reject) => {
    archive.on("data", (c: Buffer) => chunks.push(c));
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });

  if (existsSync(dbPath)) archive.file(dbPath, { name: "app.db" });
  if (existsSync(docsDir)) archive.directory(docsDir, "docs");
  if (existsSync(uploadsDir)) archive.directory(uploadsDir, "uploads");
  archive.append(
    JSON.stringify({ created_at: new Date().toISOString(), by: admin.name }, null, 2),
    { name: "backup-info.json" }
  );

  await archive.finalize();
  await done;
  const buffer = Buffer.concat(chunks);

  audit(admin.id, "backup", null, { bytes: buffer.length });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="stha-backup-${stamp}.zip"`,
    },
  });
}
