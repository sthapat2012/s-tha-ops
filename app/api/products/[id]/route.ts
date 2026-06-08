import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db, audit } from "@/lib/db";
import { saveUpload } from "@/lib/upload";
import type { Product } from "@/lib/types";

/** แก้ไขสินค้า — เฉพาะ admin/owner */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const id = Number((await params).id);
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;
  if (!existing) return NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const name = (form.get("name") as string)?.trim() || existing.name;
  const description = form.has("description")
    ? (form.get("description") as string)?.trim() || null
    : existing.description;
  const price = form.has("price")
    ? form.get("price")
      ? Number(form.get("price"))
      : null
    : existing.price;
  const category = form.has("category")
    ? (form.get("category") as string)?.trim() || null
    : existing.category;

  let imagePath = existing.image_path;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    imagePath = await saveUpload(image, "products");
  }

  db.prepare(
    "UPDATE products SET name=?, description=?, price=?, category=?, image_path=? WHERE id=?"
  ).run(name, description, price, category, imagePath, id);
  audit(user.id, "update_product", id, { name });
  return NextResponse.json({ ok: true });
}

/** ลบสินค้า — เฉพาะ admin/owner */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const id = Number((await params).id);
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  audit(user.id, "delete_product", id);
  return NextResponse.json({ ok: true });
}
