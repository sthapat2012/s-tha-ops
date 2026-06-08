"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";

export default function ProjectsList({
  active,
  completed,
}: {
  active: Project[];
  completed: Project[];
}) {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const list = tab === "active" ? active : completed;

  return (
    <div className="px-4 py-5">
      <h1 className="font-heading font-bold text-2xl mb-4">หน้างาน</h1>

      <div className="flex bg-white rounded-xl p-1 shadow-sm mb-4">
        <TabBtn active={tab === "active"} onClick={() => setTab("active")}>
          กำลังดำเนินการ ({active.length})
        </TabBtn>
        <TabBtn active={tab === "completed"} onClick={() => setTab("completed")}>
          สำเร็จแล้ว ({completed.length})
        </TabBtn>
      </div>

      {list.length === 0 ? (
        <p className="text-center text-slate/40 py-10">
          ยังไม่มีโครงการ{tab === "active" ? "ที่กำลังดำเนินการ" : "ที่สำเร็จ"}
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
        active ? "bg-slate text-cream" : "text-slate/50"
      }`}
    >
      {children}
    </button>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm active:scale-[0.99] transition"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading font-semibold text-lg leading-tight">{p.name}</h2>
        {p.status === "completed" ? (
          <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-success/15 text-success">
            ส่งมอบแล้ว
          </span>
        ) : (
          <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-warn/15 text-warn">
            กำลังทำ
          </span>
        )}
      </div>
      {p.description && (
        <p className="text-sm text-slate/60 mt-1 line-clamp-2">{p.description}</p>
      )}

      {p.status === "active" ? (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate/60 mb-1">
            <span>ความคืบหน้า</span>
            <span className="font-semibold text-brand">{p.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-cream overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${p.progress}%` }} />
          </div>
          {p.due_date && (
            <p className="text-xs text-slate/50 mt-2">ครบกำหนด {fmtDate(p.due_date)}</p>
          )}
        </div>
      ) : (
        p.delivered_date && (
          <p className="text-xs text-slate/50 mt-3">ส่งมอบเมื่อ {fmtDate(p.delivered_date)}</p>
        )
      )}
    </Link>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
