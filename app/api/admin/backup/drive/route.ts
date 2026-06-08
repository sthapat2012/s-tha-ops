import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { audit, setSetting } from "@/lib/db";
import { buildBackupZip, backupFilename } from "@/lib/backup";
import { isDriveConfigured, uploadToDrive } from "@/lib/gdrive";

/** สำรองข้อมูลขึ้น Google Drive (Service Account) — admin */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้เชื่อม Google Drive (ตั้งค่า GOOGLE_SERVICE_ACCOUNT_JSON และ GDRIVE_FOLDER_ID)" },
      { status: 400 }
    );
  }

  try {
    const buffer = await buildBackupZip(admin.name);
    const { link } = await uploadToDrive(backupFilename(), buffer);
    const at = new Date().toISOString();
    setSetting("last_drive_backup", at);
    audit(admin.id, "backup", null, { bytes: buffer.length, to: "gdrive", link });
    return NextResponse.json({ ok: true, link, at });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "สำรองขึ้น Drive ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
