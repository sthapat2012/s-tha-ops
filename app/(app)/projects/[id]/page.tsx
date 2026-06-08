import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProject, canAccessProject } from "@/lib/data";
import type { Phase, UpdateItem, DocumentItem } from "@/lib/types";
import UpdateComposer from "./UpdateComposer";
import DocumentsSection from "./DocumentsSection";

export const dynamic = "force-dynamic";

const PHASE_STATUS = {
  done: { label: "เสร็จแล้ว", dot: "bg-success", text: "text-success" },
  in_progress: { label: "กำลังทำ", dot: "bg-warn", text: "text-warn" },
  pending: { label: "รอดำเนินการ", dot: "bg-slate/30", text: "text-slate/40" },
} as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = Number((await params).id);
  const project = getProject(id);
  if (!project) notFound();
  if (!canAccessProject(user.id, user.role, id)) redirect("/projects");

  const admin = isAdmin(user.role);
  const phases = db
    .prepare("SELECT * FROM phases WHERE project_id = ? ORDER BY order_index")
    .all(id) as Phase[];
  const updates = db
    .prepare(
      `SELECT u.*, usr.name AS author FROM updates u
       JOIN users usr ON usr.id = u.user_id
       WHERE u.project_id = ? ORDER BY u.id DESC`
    )
    .all(id) as UpdateItem[];
  const docs = admin
    ? (db
        .prepare("SELECT * FROM documents WHERE project_id = ? ORDER BY id DESC")
        .all(id) as DocumentItem[])
    : [];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-slate text-cream px-4 pt-3 pb-5">
        <Link href="/projects" className="text-cream/60 text-sm">
          ← หน้างาน
        </Link>
        <div className="flex items-start justify-between gap-3 mt-2">
          <h1 className="font-heading font-bold text-xl leading-tight">{project.name}</h1>
          <span
            className={`shrink-0 text-xs px-2 py-1 rounded-full ${
              project.status === "completed" ? "bg-success/25" : "bg-warn/25"
            }`}
          >
            {project.status === "completed" ? "ส่งมอบแล้ว" : "กำลังทำ"}
          </span>
        </div>
        {project.description && (
          <p className="text-sm text-cream/70 mt-1">{project.description}</p>
        )}
        {project.status === "active" ? (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-cream/70 mb-1">
              <span>ความคืบหน้ารวม</span>
              <span className="font-bold">{project.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-cream/20 overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${project.progress}%` }} />
            </div>
            {project.due_date && (
              <p className="text-xs text-cream/60 mt-2">ครบกำหนด {fmtDate(project.due_date)}</p>
            )}
          </div>
        ) : (
          project.delivered_date && (
            <p className="text-xs text-cream/60 mt-3">ส่งมอบเมื่อ {fmtDate(project.delivered_date)}</p>
          )
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* แผนงานตามเฟส */}
        {phases.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-heading font-semibold mb-3">แผนงานและเป้าหมาย</h2>
            <ol className="relative border-l-2 border-cream ml-2">
              {phases.map((ph) => {
                const st = PHASE_STATUS[ph.status];
                return (
                  <li key={ph.id} className="ml-4 pb-5 last:pb-0">
                    <span
                      className={`absolute -left-[7px] w-3 h-3 rounded-full ${st.dot} ring-2 ring-white`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{ph.name}</p>
                      <span className={`text-xs ${st.text}`}>{st.label}</span>
                    </div>
                    {(ph.start_date || ph.end_date) && (
                      <p className="text-xs text-slate/50 mt-0.5">
                        {fmtRange(ph.start_date, ph.end_date)}
                      </p>
                    )}
                    {ph.status === "in_progress" && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-cream overflow-hidden max-w-[180px]">
                        <div className="h-full bg-warn rounded-full" style={{ width: `${ph.progress}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* ฟีดความคืบหน้า */}
        <div>
          <h2 className="font-heading font-semibold mb-2 px-1">ความคืบหน้าหน้างาน</h2>
          {user.role !== "sales" && <UpdateComposer projectId={id} />}
          <div className="space-y-3 mt-3">
            {updates.length === 0 ? (
              <p className="text-center text-slate/40 py-6 text-sm">ยังไม่มีอัพเดต</p>
            ) : (
              updates.map((u) => (
                <article key={u.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full bg-brand/15 text-brand flex items-center justify-center text-sm font-bold">
                      {u.author?.[0] ?? "?"}
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-medium">{u.author}</p>
                      <p className="text-[11px] text-slate/50">{fmtDateTime(u.created_at)}</p>
                    </div>
                  </div>
                  {u.text && <p className="text-sm whitespace-pre-wrap">{u.text}</p>}
                  {u.image_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.image_path}
                      alt=""
                      className="mt-2 w-full rounded-xl object-cover max-h-80"
                    />
                  )}
                </article>
              ))
            )}
          </div>
        </div>

        {/* เอกสาร (admin เท่านั้น) */}
        {admin && <DocumentsSection projectId={id} docs={docs} />}
      </div>
    </div>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}
function fmtRange(a: string | null, b: string | null) {
  const f = (s: string) =>
    new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  if (a && b) return `${f(a)} – ${f(b)}`;
  return a ? f(a) : b ? f(b) : "";
}
function fmtDateTime(iso: string) {
  const d = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  return d.toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
