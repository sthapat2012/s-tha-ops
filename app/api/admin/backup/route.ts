import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/db";
import { buildBackupZip, backupFilename } from "@/lib/backup";

/** สำรองข้อมูลเป็นไฟล์ ZIP (ฐานข้อมูล + เอกสาร + รูป) — ดาวน์โหลดมาเก็บเอง */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const buffer = await buildBackupZip(admin.name);
  audit(admin.id, "backup", null, { bytes: buffer.length, to: "download" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${backupFilename()}"`,
    },
  });
}
