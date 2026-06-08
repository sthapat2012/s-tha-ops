"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";

export default function ProductsClient({
  initial,
  admin,
}: {
  initial: Product[];
  admin: boolean;
}) {
  const [products, setProducts] = useState<Product[]>(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[],
    [products]
  );

  const filtered = products.filter((p) => {
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(q.toLowerCase());
    const matchCat = !cat || p.category === cat;
    return matchQ && matchCat;
  });

  async function refresh() {
    const r = await fetch("/api/products");
    if (r.ok) setProducts((await r.json()).products);
  }

  async function remove(id: number) {
    if (!confirm("ลบสินค้านี้?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-2xl">ผลิตภัณฑ์ที่เรามี</h1>
        {admin && (
          <button
            onClick={() => setEditing("new")}
            className="rounded-lg bg-brand text-white px-3 py-2 text-sm font-semibold"
          >
            + เพิ่ม
          </button>
        )}
      </div>

      {/* ค้นหา */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาสินค้า…"
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 mb-3 focus:outline-none focus:border-brand"
      />

      {/* หมวดหมู่ */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4">
        <Chip active={cat === ""} onClick={() => setCat("")}>
          ทั้งหมด
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-slate/40 py-10">ไม่พบสินค้า</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="aspect-square bg-cream flex items-center justify-center">
                {p.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_path} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl opacity-30">📦</span>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                {p.category && <p className="text-[11px] text-brand mb-0.5">{p.category}</p>}
                <p className="font-medium text-sm leading-tight line-clamp-2">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-slate/50 mt-1 line-clamp-2">{p.description}</p>
                )}
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="font-heading font-bold text-brand">
                    {p.price != null ? `฿${p.price.toLocaleString("th-TH")}` : "—"}
                  </span>
                  {admin && (
                    <span className="flex gap-1">
                      <button onClick={() => setEditing(p)} className="text-xs text-slate/60 px-1.5 py-1">
                        แก้ไข
                      </button>
                      <button onClick={() => remove(p.id)} className="text-xs text-brand-dark px-1.5 py-1">
                        ลบ
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Chip({
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
      className={`shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
        active ? "bg-slate text-cream" : "bg-white text-slate/60"
      }`}
    >
      {children}
    </button>
  );
}

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!name.trim()) {
      setErr("กรุณาใส่ชื่อสินค้า");
      return;
    }
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("price", price);
    fd.set("category", category);
    if (image) fd.set("image", image);
    const url = product ? `/api/products/${product.id}` : "/api/products";
    const method = product ? "PATCH" : "POST";
    try {
      const res = await fetch(url, { method, body: fd });
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
        <h3 className="font-heading font-bold text-lg mb-3">
          {product ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}
        </h3>
        <div className="space-y-3">
          <Input label="ชื่อสินค้า" value={name} onChange={setName} />
          <div>
            <label className="block text-sm mb-1 text-slate/70">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="ราคา (บาท)" value={price} onChange={setPrice} type="number" />
            <Input label="หมวดหมู่" value={category} onChange={setCategory} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate/70">รูปสินค้า</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
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

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5"
      />
    </div>
  );
}
