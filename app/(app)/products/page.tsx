import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Product } from "@/lib/types";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // ผลิตภัณฑ์สำหรับฝ่ายขายและผู้ดูแล
  if (user.role === "worker") redirect("/");

  const products = db.prepare("SELECT * FROM products ORDER BY category, name").all() as Product[];
  return <ProductsClient initial={products} admin={isAdmin(user.role)} />;
}
