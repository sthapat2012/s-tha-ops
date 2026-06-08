import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import NavShell from "./_components/NavShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "active") redirect("/pending");

  return (
    <NavShell role={user.role} name={user.name}>
      {children}
    </NavShell>
  );
}
