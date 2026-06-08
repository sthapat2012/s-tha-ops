// ใส่ข้อมูลตัวอย่างสำหรับทดสอบ (ไม่แตะตาราง users)
// รัน: node scripts/seed-demo.mjs
import Database from "better-sqlite3";
import path from "node:path";

const db = new Database(path.join(process.cwd(), "data", "app.db"));
db.pragma("foreign_keys = ON");

// ล้างเฉพาะข้อมูลตัวอย่าง (คงผู้ใช้และการลงเวลาไว้ถ้ามี)
db.exec("DELETE FROM phases; DELETE FROM portfolio;");
db.prepare("DELETE FROM products").run();
// ลบโครงการที่ยังไม่ถูกอ้างโดย time_entries เพื่อกัน FK พัง
db.pragma("foreign_keys = OFF");
db.exec("DELETE FROM projects; DELETE FROM updates; DELETE FROM documents;");
db.pragma("foreign_keys = ON");

const insProject = db.prepare(`INSERT INTO projects
  (id, name, description, status, progress, lat, lng, geofence_radius, due_date, delivered_date, cover_image)
  VALUES (@id,@name,@description,@status,@progress,@lat,@lng,@geofence_radius,@due_date,@delivered_date,@cover_image)`);

const projects = [
  { id: 1, name: "อาคารสำนักงาน พระราม 9", description: "ก่อสร้างอาคารสำนักงาน 8 ชั้น พร้อมที่จอดรถใต้ดิน", status: "active", progress: 45, lat: 13.7585, lng: 100.5650, geofence_radius: 250, due_date: "2026-12-20", delivered_date: null, cover_image: null },
  { id: 2, name: "คอนโดสุขุมวิท 39", description: "งานตกแต่งภายในและระบบไฟฟ้า ชั้น 12-15", status: "active", progress: 70, lat: 13.7308, lng: 100.5826, geofence_radius: 200, due_date: "2026-08-15", delivered_date: null, cover_image: null },
  { id: 3, name: "บ้านพักอาศัย รามอินทรา", description: "สร้างบ้านเดี่ยว 2 ชั้น สไตล์โมเดิร์น", status: "active", progress: 20, lat: 13.8650, lng: 100.6700, geofence_radius: 300, due_date: "2027-03-10", delivered_date: null, cover_image: null },
  { id: 4, name: "ทดสอบรัศมีกว้าง (ทั่วประเทศ)", description: "โครงการสำหรับทดสอบ geofence — รัศมีครอบทั้งประเทศ ใช้ทดลองลงเวลาแบบ 'อยู่ในรัศมี'", status: "active", progress: 0, lat: 13.7563, lng: 100.5018, geofence_radius: 2000000, due_date: null, delivered_date: null, cover_image: null },
  { id: 5, name: "รีโนเวทร้านกาแฟ ทองหล่อ", description: "ปรับปรุงร้านกาแฟ พื้นที่ 120 ตร.ม.", status: "completed", progress: 100, lat: 13.7280, lng: 100.5790, geofence_radius: 150, due_date: "2026-04-30", delivered_date: "2026-04-28", cover_image: null },
];
projects.forEach((p) => insProject.run(p));

// แผนงานตามเฟส (โครงการ 1)
const insPhase = db.prepare(`INSERT INTO phases (project_id,name,start_date,end_date,status,progress,order_index)
  VALUES (?,?,?,?,?,?,?)`);
const phases1 = [
  ["งานเสาเข็มและฐานราก", "2026-01-10", "2026-03-15", "done", 100, 0],
  ["งานโครงสร้างคอนกรีต", "2026-03-16", "2026-07-30", "in_progress", 60, 1],
  ["งานสถาปัตยกรรมและผนัง", "2026-08-01", "2026-10-15", "pending", 0, 2],
  ["งานระบบและตกแต่ง", "2026-10-16", "2026-12-20", "pending", 0, 3],
];
phases1.forEach((ph) => insPhase.run(1, ...ph));
const phases2 = [
  ["รื้อถอนและเตรียมพื้นที่", "2026-05-01", "2026-05-20", "done", 100, 0],
  ["งานระบบไฟฟ้า-ประปา", "2026-05-21", "2026-07-10", "in_progress", 80, 1],
  ["งานตกแต่งภายใน", "2026-07-11", "2026-08-15", "in_progress", 40, 2],
];
phases2.forEach((ph) => insPhase.run(2, ...ph));

// สินค้า
const insProduct = db.prepare(`INSERT INTO products (name,description,price,category,image_path) VALUES (?,?,?,?,?)`);
const products = [
  ["ปูนซีเมนต์ปอร์ตแลนด์ ตราช้าง", "ปูนซีเมนต์สำหรับงานโครงสร้างทั่วไป 50 กก./ถุง", 175, "ปูนและคอนกรีต", null],
  ["เหล็กเส้นกลม SR24 ขนาด 9 มม.", "เหล็กเส้นกลมผิวเรียบ มอก. ความยาว 10 ม.", 145, "เหล็กและโลหะ", null],
  ["อิฐมวลเบา Q-CON 7.5 ซม.", "อิฐมวลเบา ขนาด 20x60 ซม. น้ำหนักเบา ฉนวนกันความร้อน", 28, "อิฐและบล็อก", null],
  ["กระเบื้องพอร์ซเลน 60x60", "กระเบื้องปูพื้นผิวด้าน สีเทาคอนกรีต", 320, "กระเบื้องและพื้นผิว", null],
  ["สีน้ำพลาสติกภายใน TOA SuperShield", "สีทาภายในเกรดพรีเมียม เช็ดล้างได้ 1 แกลลอน", 850, "สีและเคมีภัณฑ์", null],
  ["ท่อ PVC สีฟ้า 4 นิ้ว ชั้น 8.5", "ท่อ PVC สำหรับงานประปา ความยาว 4 ม.", 265, "ระบบประปา", null],
  ["สายไฟ THW 2.5 sq.mm.", "สายไฟทองแดงหุ้มฉนวน ม้วน 100 ม.", 1450, "ระบบไฟฟ้า", null],
  ["แผ่นยิปซัมบอร์ด 9 มม.", "แผ่นยิปซัมมาตรฐาน ขนาด 120x240 ซม.", 135, "ฝ้าและผนังเบา", null],
];
products.forEach((p) => insProduct.run(...p));

// โปรไฟล์บริษัท + ผลงาน
const setSetting = db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
setSetting.run(
  "company_profile",
  JSON.stringify({
    name: "S-THA Building & Architect",
    tagline: "ออกแบบและก่อสร้างครบวงจร ด้วยมาตรฐานสถาปนิก",
    vision: "เรามุ่งสร้างสรรค์งานก่อสร้างที่มีคุณภาพ ตรงเวลา และใส่ใจรายละเอียดทุกขั้นตอน เพื่อส่งมอบพื้นที่ที่ดีที่สุดให้ลูกค้า",
    services: ["ออกแบบสถาปัตยกรรม", "รับเหมาก่อสร้างอาคาร", "งานรีโนเวทและต่อเติม", "งานตกแต่งภายใน", "ที่ปรึกษาควบคุมงาน"],
    phone: "02-123-4567",
    email: "contact@stha.co.th",
    address: "123 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310",
    line: "@stha",
  })
);

const insPortfolio = db.prepare("INSERT INTO portfolio (title,description,image_path,order_index) VALUES (?,?,?,?)");
[
  ["บ้านเดี่ยวสไตล์โมเดิร์น ลาดพร้าว", "บ้าน 2 ชั้น 4 ห้องนอน พื้นที่ใช้สอย 320 ตร.ม.", null, 0],
  ["อาคารพาณิชย์ 4 ชั้น บางนา", "ออกแบบและก่อสร้างอาคารพาณิชย์ 6 คูหา", null, 1],
  ["รีโนเวทออฟฟิศ เอกมัย", "ปรับปรุงสำนักงาน 450 ตร.ม. ภายใน 45 วัน", null, 2],
].forEach((p) => insPortfolio.run(...p));

console.log("seed เสร็จ:");
console.log("  projects =", db.prepare("SELECT COUNT(*) n FROM projects").get().n);
console.log("  phases   =", db.prepare("SELECT COUNT(*) n FROM phases").get().n);
console.log("  products =", db.prepare("SELECT COUNT(*) n FROM products").get().n);
console.log("  portfolio=", db.prepare("SELECT COUNT(*) n FROM portfolio").get().n);
