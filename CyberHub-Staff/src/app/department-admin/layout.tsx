import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "./AdminShell";
import type { AdminAccount } from "./adminData";
import { makeWorkspace } from "./demoData";

export const metadata: Metadata = {
  title: { default: "Department Administration | CyberHub ERP", template: "%s | CyberHub ERP" },
};

async function getDepartmentAdmin(): Promise<AdminAccount | null> {
  const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  try {
    const response = await fetch(`${api}/api/v1/auth/me`, {
      cache: "no-store", headers: { cookie }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const { data } = await response.json() as { data: Omit<AdminAccount, "department"> & {
      role: string; department?: (AdminAccount["department"] & { active?: boolean }) | null;
    } };
    const department = data.department;
    if (data.role !== "DEPARTMENT_ADMIN" || !department?.id || department.active === false) return null;
    return { id: data.id, name: data.name, email: data.email, identifier: data.identifier, department: { id: department.id, code: department.code, name: department.name } };
  } catch {
    return null;
  }
}

export default async function DepartmentAdminLayout({ children }: { children: React.ReactNode }) {
  const account = await getDepartmentAdmin();
  if (!account) redirect("/login");
  const demo = process.env.NODE_ENV === "development";
  const initial = makeWorkspace(account.department, demo);
  return <AdminShell key={account.id + ":" + account.department.id} account={account} demo={demo} initial={initial}>{children}</AdminShell>;
}
