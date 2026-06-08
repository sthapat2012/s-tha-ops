"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/app/_components/LogoutButton";
import type { Role } from "@/lib/auth";

const isAdmin = (r: Role) => r === "admin" || r === "owner";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  show: (r: Role) => boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "หน้าแรก", icon: <HomeIcon />, show: () => true },
  { href: "/clock", label: "ลงเวลา", icon: <ClockIcon />, show: (r) => r === "worker" || isAdmin(r) },
  { href: "/projects", label: "หน้างาน", icon: <SiteIcon />, show: () => true },
  { href: "/products", label: "ผลิตภัณฑ์", icon: <BoxIcon />, show: (r) => r === "sales" || isAdmin(r) },
  { href: "/admin", label: "จัดการ", icon: <GearIcon />, show: (r) => isAdmin(r) },
];

export default function NavShell({
  role,
  name,
  children,
}: {
  role: Role;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const tabs = ITEMS.filter((i) => i.show(role));

  const roleLabel =
    role === "owner" ? "เจ้าของระบบ" : role === "admin" ? "ผู้ดูแลระบบ" : role === "sales" ? "ฝ่ายขาย" : "พนักงานหน้างาน";

  return (
    <div className="min-h-dvh flex flex-col bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate text-cream pt-safe">
        <div className="flex items-center gap-3 px-4 h-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
          <div className="leading-tight flex-1 min-w-0">
            <p className="font-heading font-bold text-sm tracking-wide">S-THA</p>
            <p className="text-[11px] text-cream/60 truncate">{name} · {roleLabel}</p>
          </div>
          <button
            onClick={() => setDrawer(true)}
            aria-label="เมนู"
            className="p-2 -mr-2"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-black/5 pb-safe">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  active ? "text-brand" : "text-slate/50"
                }`}
              >
                <span className={active ? "scale-110 transition" : "transition"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 h-full w-72 max-w-[80%] bg-cream shadow-xl pt-safe pb-safe flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate text-cream">
              <p className="font-heading font-bold">{name}</p>
              <p className="text-xs text-cream/60">{roleLabel}</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <DrawerLink href="/" onClick={() => setDrawer(false)}>หน้าแรก</DrawerLink>
              {(role === "worker" || isAdmin(role)) && (
                <DrawerLink href="/clock" onClick={() => setDrawer(false)}>ลงเวลางาน</DrawerLink>
              )}
              <DrawerLink href="/projects" onClick={() => setDrawer(false)}>หน้างาน</DrawerLink>
              {(role === "sales" || isAdmin(role)) && (
                <DrawerLink href="/products" onClick={() => setDrawer(false)}>ผลิตภัณฑ์ที่เรามี</DrawerLink>
              )}
              <DrawerLink href="/company" onClick={() => setDrawer(false)}>Company Profile</DrawerLink>
              {isAdmin(role) && (
                <DrawerLink href="/admin" onClick={() => setDrawer(false)}>จัดการระบบ</DrawerLink>
              )}
              <div className="my-2 border-t border-black/10" />
              <DrawerLink href="/onboarding" onClick={() => setDrawer(false)}>วิธีใช้งาน &amp; ติดตั้งแอป</DrawerLink>
            </div>
            <div className="p-4">
              <LogoutButton className="w-full rounded-xl bg-slate text-cream py-3 font-semibold" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DrawerLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-5 py-3 text-slate font-medium active:bg-black/5"
    >
      {children}
    </Link>
  );
}

/* ───── ไอคอน SVG (เส้นเรียบ) ───── */
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
  );
}
function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  );
}
function SiteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01M9 13v.01M9 17v.01" /></svg>
  );
}
function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="m12 13v8" /></svg>
  );
}
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
  );
}
function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
  );
}
