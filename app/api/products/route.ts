import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db, audit } from "@/lib/db";
import { saveUpload } from "@/lib/upload";

/** รายการสินค้าทั้งหมด */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const products = db.prepare("SELECT * FROM products ORDER BY category, name").all();
  return NextResponse.json({ products });
}

/** เพิ่มสินค้า — เฉพาะ admin/owner */
export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ error: "กรุณาใส่ชื่อสินค้า" }, { status: 400 });
  const description = (form.get("description") as string)?.trim() || null;
  const price = form.get("price") ? Number(form.get("price")) : null;
  const category = (form.get("category") as string)?.trim() || null;

  let imagePath: string | null = null;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    imagePath = await saveUpload(image, "products");
  }

  const r = db
    .prepare(
      "INSERT INTO products (name, description, price, category, image_path) VALUES (?, ?, ?, ?, ?)"
    )
    .run(name, description, price, category, imagePath);
  audit(user.id, "create_product", Number(r.lastInsertRowid), { name });
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
