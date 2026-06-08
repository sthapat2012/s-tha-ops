"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface CompanyProfile {
  name: string;
  tagline: string;
  vision: string;
  services: string[];
  phone: string;
  email: string;
  address: string;
  line: string;
}

interface PortfolioItem {
  id: number;
  title: string;
  description: string | null;
  image_path: string | null;
}

export default function CompanyClient({
  profile,
  portfolio,
  admin,
}: {
  profile: CompanyProfile;
  portfolio: PortfolioItem[];
  admin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <div>
      {/* ส่วนหัวแบรนด์ */}
      <div className="bg-slate text-cream px-4 pt-6 pb-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="w-20 h-20 rounded-2xl mx-auto shadow-lg" />
        <h1 className="font-heading font-bold text-2xl mt-3">{profile.name || "S-THA"}</h1>
        {profile.tagline && <p className="text-sm text-cream/70 mt-1">{profile.tagline}</p>}
        {admin && (
          <button
            onClick={() => setEditing(true)}
            className="mt-4 text-sm rounded-lg border border-cream/30 px-4 py-2"
          >
            แก้ไขข้อมูลบริษัท
          </button>
        )}
      </div>

      <div className="px-4 py-5 space-y-4">
        {profile.vision && (
          <Section title="วิสัยทัศน์">
            <p className="text-sm leading-relaxed text-slate/80">{profile.vision}</p>
          </Section>
        )}

        {profile.services.length > 0 && (
          <Section title="บริการของเรา">
            <ul className="grid grid-cols-2 gap-2">
              {profile.services.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm bg-cream rounded-lg px-3 py-2">
                  <span className="text-brand">✓</span> {s}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {portfolio.length > 0 && (
          <Section title="ผลงานที่ผ่านมา">
            <div className="space-y-3">
              {portfolio.map((p) => (
                <div key={p.id} className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl bg-cream shrink-0 flex items-center justify-center overflow-hidden">
                    {p.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_path} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl opacity-30">🏗️</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{p.title}</p>
                    {p.description && (
                      <p className="text-xs text-slate/50 mt-0.5 line-clamp-3">{p.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="ติดต่อเรา">
          <div className="space-y-2 text-sm">
            {profile.phone && <ContactRow icon="📞" value={profile.phone} href={`tel:${profile.phone}`} />}
            {profile.email && <ContactRow icon="✉️" value={profile.email} href={`mailto:${profile.email}`} />}
            {profile.line && <ContactRow icon="💬" value={`LINE: ${profile.line}`} />}
            {profile.address && <ContactRow icon="📍" value={profile.address} />}
          </div>
        </Section>
      </div>

      {editing && (
        <EditForm
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-heading font-semibold mb-2">{title}</h2>
      {children}
    </section>
  );
}

function ContactRow({ icon, value, href }: { icon: string; value: string; href?: string }) {
  const content = (
    <span className="flex items-start gap-2">
      <span>{icon}</span>
      <span className="text-slate/80">{value}</span>
    </span>
  );
  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
}

function EditForm({
  profile,
  onClose,
  onSaved,
}: {
  profile: CompanyProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    ...profile,
    services: profile.services.join("\n"),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k: string, v: string) {
    setF((old) => ({ ...old, [k]: v }));
  }

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) {
        setErr((await res.json()).error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      onSaved();
    } catch {
      setErr("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-cream rounded-t-3xl p-5 pb-safe max-h-[90%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-black/15 mb-4" />
        <h3 className="font-heading font-bold text-lg mb-3">แก้ไขข้อมูลบริษัท</h3>
        <div className="space-y-3">
          <Field label="ชื่อบริษัท" value={f.name} onChange={(v) => set("name", v)} />
          <Field label="สโลแกน" value={f.tagline} onChange={(v) => set("tagline", v)} />
          <FieldArea label="วิสัยทัศน์" value={f.vision} onChange={(v) => set("vision", v)} />
          <FieldArea
            label="บริการ (บรรทัดละ 1 รายการ)"
            value={f.services}
            onChange={(v) => set("services", v)}
          />
          <Field label="เบอร์โทร" value={f.phone} onChange={(v) => set("phone", v)} />
          <Field label="อีเมล" value={f.email} onChange={(v) => set("email", v)} />
          <Field label="LINE" value={f.line} onChange={(v) => set("line", v)} />
          <FieldArea label="ที่อยู่" value={f.address} onChange={(v) => set("address", v)} />
          {err && <p className="text-sm text-brand-dark">{err}</p>}
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-xl bg-brand text-white py-3 font-semibold disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5"
      />
    </div>
  );
}
function FieldArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate/70">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5"
      />
    </div>
  );
}
