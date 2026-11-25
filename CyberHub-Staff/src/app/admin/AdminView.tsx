"use client";

import Link from "next/link";
import { useAdmin } from "./AdminShell";
import { Dashboard, Reports } from "./AdminAnalytics";
import AdminDocuments from "./AdminDocuments";
import { AdminSettings, Audit, Roles } from "./AdminOperations";
import { RecordDetails, RecordEditor, RecordList } from "./AdminRecords";
import { adminHref, getModule } from "./adminData";
import { PageHeader } from "./adminUi";
import s from "./admin.module.css";

export default function AdminView({ section, recordId, editing }: { section: string; recordId?: string; editing: boolean }) {
  const { data } = useAdmin();
  const config = getModule(section);
  if (config) {
    if (!recordId) return <RecordList module={config} />;
    if (recordId === "new") return <RecordEditor module={config} />;
    const row = data.records[config.id].find(({ id }) => id === recordId);
    if (!row) return <PageHeader title="Record unavailable" description="This record could not be found in your demo workspace."
      actions={<Link className={s.secondary} href={adminHref(config.id)}>Back to {config.label.toLowerCase()}</Link>} />;
    return editing ? <RecordEditor module={config} row={row} /> : <RecordDetails module={config} row={row} />;
  }

  switch (section) {
    case "documents": return <AdminDocuments />;
    case "reports": return <Reports />;
    case "roles": return <Roles />;
    case "audit": return <Audit />;
    case "settings": return <AdminSettings />;
    default: return <Dashboard />;
  }
}
