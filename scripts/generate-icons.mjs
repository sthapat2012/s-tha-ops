// สร้างไอคอน PWA จากโลโก้ S-THA (ตัว S ไอโซเมตริก)
// วางมาร์กบนพื้นสเลท #243038 แบบมีระยะขอบปลอดภัย (maskable-safe)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve(
  process.cwd(),
  "../s-tha-web/content-drop/brand/logo.png"
);
const OUT = path.resolve(process.cwd(), "public/icons");
const SLATE = { r: 0x24, g: 0x30, b: 0x38, alpha: 1 };

await mkdir(OUT, { recursive: true });

// โลโก้เป็น lockup แนวนอน (มาร์ก S + ข้อความ) — crop เฉพาะคิวบ์ S ด้านซ้ายก่อน
// ต้นฉบับ 1370x554, ตัวมาร์กอยู่ราว x:160..500
const meta = await sharp(SRC).metadata();
const cropped = await sharp(SRC)
  .extract({ left: 150, top: 70, width: 380, height: Math.min(420, meta.height - 70) })
  .png()
  .toBuffer();
const mark = await sharp(cropped).trim({ threshold: 10 }).png().toBuffer();

async function makeIcon(size, padRatio, name, bg = SLATE) {
  const inner = Math.round(size * (1 - padRatio));
  const resized = await sharp(mark)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const offset = Math.round((size - inner) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: resized, top: offset, left: offset }])
    .png()
    .toFile(path.join(OUT, name));
  console.log("✓", name, `${size}x${size}`);
}

// any-purpose icons (ขอบน้อย)
await makeIcon(512, 0.18, "icon-512.png");
await makeIcon(192, 0.18, "icon-192.png");
await makeIcon(180, 0.16, "icon-180.png"); // apple touch icon
// maskable (ขอบปลอดภัย ~20% รอบด้าน เผื่อระบบครอปเป็นวงกลม)
await makeIcon(512, 0.3, "maskable-512.png");
await makeIcon(192, 0.3, "maskable-192.png");
// favicon
await makeIcon(48, 0.12, "favicon-48.png");

console.log("เสร็จสิ้น: สร้างไอคอนทั้งหมดใน public/icons/");
