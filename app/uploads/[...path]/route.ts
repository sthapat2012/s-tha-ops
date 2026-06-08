import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getActiveUser } from "@/lib/session";
import { UPLOADS_DIR } from "@/lib/paths";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** เสิร์ฟรูปอัปโหลดจาก persistent volume (เฉพาะผู้ใช้ที่ล็อกอิน) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const segments = (await params).path ?? [];
  // กัน path traversal: รวม path แล้วตรวจว่ายังอยู่ใต้ UPLOADS_DIR
  const target = path.resolve(UPLOADS_DIR, ...segments);
  if (!target.startsWith(UPLOADS_DIR + path.sep)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  try {
    const buffer = await readFile(target);
    const ext = target.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
