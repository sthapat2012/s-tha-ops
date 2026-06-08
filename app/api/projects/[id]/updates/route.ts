import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/data";
import { saveUpload } from "@/lib/upload";

/** โพสต์อัพเดตความคืบหน้าหน้างาน (ข้อความ + รูปภาพ) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const projectId = Number((await params).id);
  if (!canAccessProject(user.id, user.role, projectId)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงโครงการนี้" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const text = String(form.get("text") ?? "").trim();
  const image = form.get("image");
  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imagePath = await saveUpload(image, "updates");
    } catch {
      return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ" }, { status: 400 });
    }
  }
  if (!text && !imagePath) {
    return NextResponse.json({ error: "กรุณาใส่ข้อความหรือรูปภาพ" }, { status: 400 });
  }

  const result = db
    .prepare(
      "INSERT INTO updates (project_id, user_id, text, image_path) VALUES (?, ?, ?, ?)"
    )
    .run(projectId, user.id, text || null, imagePath);

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}
