"use client";

import Link from "next/link";
import { useAdmin } from "./AdminShell";
import { Dashboard, Reports } from "./AdminAnalytics";
import ReviewQueue from "./AdminDocuments";
import { Profile, SettingsPage } from "./AdminAccount";
import { DepartmentStudentProfile, DepartmentStudents } from "./DepartmentStudents";
import { RecordDetails, RecordEditor, RecordList } from "./AdminRecords";
import { adminHref, getModule } from "./adminData";
import { Empty, PageHeader } from "./adminUi";
import s from "./admin.module.css";

export default function AdminView({ section, recordId, editing }: { section: string; recordId?: string; editing: boolean }) {
  const { data, demo, account } = useAdmin();
  const config = getModule(section);
  if (config) {
    if (section === "students" && !recordId) return <DepartmentStudents />;
    const root = adminHref(section);
    const row = recordId && demo ? data.records[config.id].find(({ id, departmentId }) => id === recordId && departmentId === account.department.id) : undefined;
    if (section === "students" && recordId && recordId !== "new" && !row && !editing) return <DepartmentStudentProfile id={recordId} />;
    if (!demo || (recordId && recordId !== "new" && !row)) return <>
      <PageHeader title={config.label} description={config.description}
        actions={recordId && <Link className={s.secondary} href={root}>Back to {config.label.toLowerCase()}</Link>} />
      <section className={s.card}><Empty title={demo ? "Record unavailable" : "Academic management unavailable"}
        detail={demo ? "The requested record is unavailable in this department." : "This workflow requires an academic management service connection."} /></section>
    </>;
    if (!recordId) return <RecordList module={config} />;
    if (recordId === "new" || editing) return <RecordEditor module={config} row={row} />;
    return row ? <RecordDetails module={config} row={row} /> : null;
  }
  switch (section) {
    case "documents": return <ReviewQueue documents />;
    case "achievements": return <ReviewQueue />;
    case "reports": return <Reports />;
    case "profile": return <Profile />;
    case "settings": return <SettingsPage />;
    default: return <Dashboard />;
  }
}
