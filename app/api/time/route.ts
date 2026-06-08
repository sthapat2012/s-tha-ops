import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/session";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/upload";
import { distanceMeters } from "@/lib/geo";
import { getProject } from "@/lib/data";

/** บันทึกการลงเวลา เข้า/ออก — บังคับมีพิกัด GPS และรูปยืนยันตัวตน */
export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const kind = String(form.get("kind") ?? "");
  if (kind !== "in" && kind !== "out") {
    return NextResponse.json({ error: "ประเภทการลงเวลาไม่ถูกต้อง" }, { status: 400 });
  }

  // ── บังคับ GPS: ไม่มีพิกัด = ลงเวลาไม่ได้เด็ดขาด ──
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return NextResponse.json(
      { error: "ต้องเปิดการระบุตำแหน่ง (GPS) ก่อนลงเวลา" },
      { status: 422 }
    );
  }
  const accuracy = Number(form.get("accuracy")) || null;
  const placeName = (form.get("place_name") as string) || null;
  const projectId = form.get("project_id") ? Number(form.get("project_id")) : null;
  const clientTime = (form.get("client_time") as string) || null;

  // ── geofence: เทียบระยะกับพิกัดหน้างาน ──
  let withinGeofence: number | null = null;
  let distance: number | null = null;
  if (projectId) {
    const project = getProject(projectId);
    if (project?.lat != null && project?.lng != null) {
      distance = distanceMeters(lat, lng, project.lat, project.lng);
      withinGeofence = distance <= project.geofence_radius ? 1 : 0;
    }
  }

  // ── รูปยืนยันตัวตน ──
  let photoPath: string | null = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await saveUpload(photo, "selfie");
    } catch {
      return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ" }, { status: 400 });
    }
  }

  // เวลาที่บันทึก: ถ้ามาจากออฟไลน์ใช้เวลาที่เครื่องบันทึกไว้จริง
  const createdAt =
    clientTime && !Number.isNaN(Date.parse(clientTime))
      ? new Date(clientTime).toISOString().replace("T", " ").slice(0, 19)
      : new Date().toISOString().replace("T", " ").slice(0, 19);

  const result = db
    .prepare(
      `INSERT INTO time_entries
        (user_id, project_id, kind, lat, lng, accuracy, place_name, photo_path, within_geofence, distance_m, client_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      projectId,
      kind,
      lat,
      lng,
      accuracy,
      placeName,
      photoPath,
      withinGeofence,
      distance,
      clientTime,
      createdAt
    );

  return NextResponse.json({
    ok: true,
    id: Number(result.lastInsertRowid),
    kind,
    within_geofence: withinGeofence,
    distance_m: distance,
  });
}
