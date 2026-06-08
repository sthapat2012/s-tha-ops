import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "../_components/LogoutButton";
import BrandMark from "../_components/BrandMark";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "active") redirect("/");

  const suspended = user.status === "suspended";

  return (
    <main className="min-h-dvh flex flex-col justify-center items-center text-center px-6 bg-slate text-cream pt-safe pb-safe">
      <BrandMark className="w-16 h-16" />
      <div
        className={`mt-6 w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
          suspended ? "bg-brand-dark/30 border border-brand/40" : "bg-warn/20 border border-warn/40"
        }`}
      >
        {suspended ? "🚫" : "⏳"}
      </div>
      <h1 className="mt-5 text-xl font-heading font-bold">
        {suspended ? "บัญชีถูกระงับ" : "รอการอนุมัติ"}
      </h1>
      <p className="mt-2 text-cream/70 max-w-xs">
        {suspended
          ? "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบของบริษัท"
          : "สวัสดีคุณ " + user.name + " — บัญชีของคุณกำลังรอผู้ดูแลระบบอนุมัติ เมื่อได้รับอนุมัติแล้วจะเข้าใช้งานได้ทันที"}
      </p>
      <LogoutButton className="mt-8 rounded-xl border border-cream/30 px-6 py-3 font-semibold text-cream/90" />
    </main>
  );
}
