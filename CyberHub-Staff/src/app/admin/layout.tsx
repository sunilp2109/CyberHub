import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "./AdminShell";
import type { AdminAccount } from "./adminData";

export const metadata: Metadata = { title: { default: "Administration | CyberHub ERP", template: "%s | CyberHub ERP Admin" } };

async function getAdmin(): Promise<AdminAccount | null> {
  const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  try {
    const response = await fetch(`${api}/api/v1/auth/me`, {
      cache: "no-store", headers: { cookie }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const { data } = await response.json() as { data: AdminAccount & { role: string } };
    return data.role === "ADMIN" ? { id: data.id, name: data.name, email: data.email } : null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const account = await getAdmin();
  if (!account) redirect("/login");
  return <AdminShell account={account}>{children}</AdminShell>;
}
