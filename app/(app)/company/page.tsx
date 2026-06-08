import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db, getSetting } from "@/lib/db";
import CompanyClient, { type CompanyProfile } from "./CompanyClient";

export const dynamic = "force-dynamic";

const DEFAULT_PROFILE: CompanyProfile = {
  name: "S-THA Building & Architect",
  tagline: "ออกแบบและก่อสร้างครบวงจร",
  vision: "",
  services: [],
  phone: "",
  email: "",
  address: "",
  line: "",
};

export default async function CompanyPage() {
  const user = (await getCurrentUser())!;
  const raw = getSetting("company_profile");
  let profile = DEFAULT_PROFILE;
  if (raw) {
    try {
      profile = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch {
      /* ใช้ค่าเริ่มต้น */
    }
  }
  const portfolio = db
    .prepare("SELECT id, title, description, image_path FROM portfolio ORDER BY order_index")
    .all() as { id: number; title: string; description: string | null; image_path: string | null }[];

  return <CompanyClient profile={profile} portfolio={portfolio} admin={isAdmin(user.role)} />;
}
