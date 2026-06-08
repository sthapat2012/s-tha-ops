import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { setSetting, audit } from "@/lib/db";

/** แก้ไขข้อมูลบริษัท — เฉพาะ admin/owner */
export async function PATCH(request: Request) {
  const user = await getActiveUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const profile = {
    name: String(body.name ?? "").trim(),
    tagline: String(body.tagline ?? "").trim(),
    vision: String(body.vision ?? "").trim(),
    services: Array.isArray(body.services)
      ? body.services.map((s: unknown) => String(s).trim()).filter(Boolean)
      : String(body.services ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
    phone: String(body.phone ?? "").trim(),
    email: String(body.email ?? "").trim(),
    address: String(body.address ?? "").trim(),
    line: String(body.line ?? "").trim(),
  };
  setSetting("company_profile", JSON.stringify(profile));
  audit(user.id, "update_company", null);
  return NextResponse.json({ ok: true, profile });
}
