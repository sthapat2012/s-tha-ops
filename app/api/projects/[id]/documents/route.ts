import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db, audit } from "@/lib/db";
import { saveProtected } from "@/lib/upload";

/** อัปโหลดเอกสารโครงการ — เฉพาะ admin/owner */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const projectId = Number((await params).id);

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "กรุณาเลือกไฟล์" }, { status: 400 });
  }
  const name = String(form.get("name") ?? file.name).trim() || file.name;
  const kind = (form.get("kind") as string) || "other";

  const { stored } = await saveProtected(file);
  const result = db
    .prepare(
      "INSERT INTO documents (project_id, name, file_path, kind, uploaded_by) VALUES (?, ?, ?, ?, ?)"
    )
    .run(projectId, name, stored, kind, user.id);

  audit(user.id, "upload_document", projectId, { name, kind });
  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}
