import type { Metadata, Viewport } from "next";
import { Kanit, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./_components/ServiceWorkerRegister";

const kanit = Kanit({
  weight: ["500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
  display: "swap",
});

const ibm = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600"],
  subsets: ["thai", "latin"],
  variable: "--font-ibm",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "S-THA",
  title: { default: "S-THA · Building & Architect", template: "%s · S-THA" },
  description:
    "แอปบริหารงานก่อสร้างภายในบริษัท S-THA — ลงเวลางาน ติดตามหน้างาน และข้อมูลผลิตภัณฑ์",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "S-THA",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-180.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#243038",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${kanit.variable} ${ibm.variable} h-full`}>
      <body className="min-h-dvh bg-cream text-slate antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
