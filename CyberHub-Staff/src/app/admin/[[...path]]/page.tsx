import { notFound } from "next/navigation";
import AdminView from "../AdminView";
import { getModule, getSection } from "../adminData";

export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return { title: getSection(path[0] ?? "dashboard")?.label ?? "Administration" };
}

export default async function AdminPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const [section = "dashboard", record, action] = path;
  const standard = getModule(section);
  if (!getSection(section) || path.length > 3 || (record && !standard)
    || (action && (action !== "edit" || record === "new"))) notFound();
  return <AdminView key={path.join("/")} section={section} recordId={record} editing={action === "edit"} />;
}
