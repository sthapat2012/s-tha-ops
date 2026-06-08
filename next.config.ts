import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // สร้าง server แบบ standalone สำหรับ Docker/Railway (รวมไฟล์ที่จำเป็นไว้ใน .next/standalone)
  output: "standalone",
  // โมดูล native ฝั่งเซิร์ฟเวอร์ ห้าม bundle (ให้ require ตอน runtime)
  serverExternalPackages: ["better-sqlite3"],
  // อนุญาตให้เปิด dev ผ่าน tunnel (ทดสอบบนมือถือ)
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
