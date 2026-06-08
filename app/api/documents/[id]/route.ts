import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getActiveUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { protectedPath } from "@/lib/upload";
import type { DocumentItem } from "@/lib/types";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** เปิดดูเอกสารโครงการ — เฉพาะ admin/owner เท่านั้น */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as
    | DocumentItem
    | undefined;
  if (!doc) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });

  try {
    const buffer = await readFile(protectedPath(doc.file_path));
    const ext = doc.file_path.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "เปิดไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}
