import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "./lib/auth";

// เส้นทางสาธารณะ (ไม่ต้องล็อกอิน)
const PUBLIC_PATHS = ["/login", "/register", "/pending", "/onboarding"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifyToken(token) : null;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // ยังไม่ล็อกอิน + เข้าหน้าที่ต้องล็อกอิน → ไปหน้า login
  if (!session && !isPublic) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ล็อกอินแล้วแต่ยังเข้าหน้า login/register → เด้งกลับหน้าแรก (หรือหน้า pending)
  if (session && (pathname === "/login" || pathname === "/register")) {
    const dest = session.status === "active" ? "/" : "/pending";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // ใช้กับทุกเส้นทาง ยกเว้นไฟล์ระบบ/สาธารณะ (manifest, sw, ไอคอน, รูปอัปโหลด, api/auth)
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|uploads|offline.html).*)",
  ],
};
