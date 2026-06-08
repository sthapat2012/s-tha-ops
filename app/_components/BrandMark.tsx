/* eslint-disable @next/next/no-img-element */

/** มาร์ก S ไอโซเมตริกของแบรนด์ (ใช้ไอคอน PWA เป็นภาพ) */
export default function BrandMark({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <img
      src="/icons/icon-192.png"
      alt="S-THA"
      className={`${className} rounded-2xl shadow-lg`}
    />
  );
}
