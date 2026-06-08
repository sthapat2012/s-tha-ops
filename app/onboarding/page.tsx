import Link from "next/link";
import BrandMark from "../_components/BrandMark";
import InstallPrompt from "../_components/InstallPrompt";

const FEATURES = [
  { icon: "🕒", title: "ลงเวลางาน", desc: "เข้า-ออกงานพร้อม GPS และถ่ายรูปยืนยันตัวตน" },
  { icon: "🏗️", title: "ติดตามหน้างาน", desc: "ดูความคืบหน้าและโพสต์อัพเดตแต่ละโครงการ" },
  { icon: "📦", title: "ผลิตภัณฑ์", desc: "ดูข้อมูลและราคาสินค้าสำหรับฝ่ายขาย" },
  { icon: "🏢", title: "ข้อมูลบริษัท", desc: "โปรไฟล์และผลงานของ S-THA" },
];

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh bg-slate text-cream px-6 py-10 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="w-20 h-20" />
          <h1 className="mt-4 font-heading font-bold text-2xl">ยินดีต้อนรับสู่ S-THA</h1>
          <p className="text-sm text-cream/70 mt-1">
            แอปบริหารงานก่อสร้างภายในบริษัท
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 rounded-2xl bg-cream/5 border border-cream/10 p-4">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-cream/60">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-center text-sm text-cream/60">
            แนะนำให้ติดตั้งลงหน้าจอโฮมเพื่อใช้งานสะดวกและรองรับ GPS/กล้อง
          </p>
          <InstallPrompt variant="inline" />
          <Link
            href="/login"
            className="block text-center rounded-xl border border-cream/30 py-3.5 font-semibold"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </main>
  );
}
