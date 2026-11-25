"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "./AdminShell";
import { RecordList } from "./AdminRecords";
import { adminHref, getModule } from "./adminData";
import { Empty, PageHeader, Status, formatDate } from "./adminUi";
import { achievementTypes } from "./departmentApi";
import s from "./admin.module.css";

const base = adminHref("students");
const columns = [{ key: "name", label: "Student" }, { key: "registerNo", label: "Register number" },
  { key: "programme", label: "Degree programme" }, { key: "batch", label: "Batch" }, { key: "semester", label: "Semester" }, { key: "status", label: "Account status" }] as const;
type SortKey = typeof columns[number]["key"];

export function DepartmentStudents() {
  const { account, directory, demo } = useAdmin();
  const params = useSearchParams();
  const tab = demo && params.get("view") === "demo" ? "demo" : "directory";
  const [query, setQuery] = useState("");
  const [programme, setProgramme] = useState("");
  const [batch, setBatch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; direction: number }>({ key: "name", direction: 1 });
  const records = (directory.data ?? []).map((student) => ({ ...student, name: student.user.name,
    status: student.user.active === undefined ? "" : student.user.active ? "Active" : "Inactive" }));
  const term = query.trim().toLowerCase();
  const filtered = records.filter((student) => (!programme || student.programme === programme) && (!batch || student.batch === batch) && (!status || student.status === status)
    && [student.name, student.registerNo, student.user.email].some((value) => value?.toLowerCase().includes(term)))
    .sort((a, b) => sort.direction * String(a[sort.key]).localeCompare(String(b[sort.key]), undefined, { numeric: true }));
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages - 1);

  return <>
    <PageHeader title="Students" description={`Student records for ${account.department.name}.`}
      actions={demo ? <Link className={s.primary} href={base + "/new"}>Add demo student</Link> : undefined} />
    {demo && <nav className={s.tabs} aria-label="Student record source">
      <Link href={base} aria-current={tab === "directory" ? "page" : undefined}>Department directory</Link>
      <Link href={base + "?view=demo"} aria-current={tab === "demo" ? "page" : undefined}>Demo management</Link>
    </nav>}
    {tab === "demo" ? <RecordList module={getModule("students")!} embedded />
      : directory.error ? <div className={s.error} role="alert">{directory.error} <button className={s.secondary} onClick={directory.refresh}>Retry</button></div>
      : !directory.data ? <p className={s.loading} role="status"><span className={s.skeleton} />Loading department students…</p>
      : <section className={s.panel} aria-label="Department student directory">
        <div className={s.toolbar}>
          <label className={s.field}><span>Search students</span><input type="search" placeholder="Name, register number, or email" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} /></label>
          <label className={s.field}><span>Degree programme</span><select value={programme} onChange={(e) => { setProgramme(e.target.value); setPage(0); }}><option value="">All programmes</option>
            {[...new Set(records.map((row) => row.programme))].sort().map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className={s.field}><span>Batch</span><select value={batch} onChange={(e) => { setBatch(e.target.value); setPage(0); }}><option value="">All batches</option>
            {[...new Set(records.map((row) => row.batch))].sort().map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className={s.field}><span>Account status</span><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All statuses</option><option>Active</option><option>Inactive</option></select></label>
        </div>
        {filtered.length ? <div className={s.tableWrap} tabIndex={0} aria-label="Scrollable student directory"><table className={s.table}>
          <thead><tr>{columns.map(({ key, label }) => <th key={key} scope="col" aria-sort={key === sort.key ? sort.direction === 1 ? "ascending" : "descending" : undefined}>
            <button className={s.sort} onClick={() => { setSort({ key, direction: key === sort.key ? -sort.direction : 1 }); setPage(0); }}>{label}{key === sort.key ? sort.direction === 1 ? " ↑" : " ↓" : ""}</button></th>)}</tr></thead>
          <tbody>{filtered.slice(current * 8, (current + 1) * 8).map((student) => <tr key={student.id}>
            <td><Link className={s.textLink} href={base + "/" + encodeURIComponent(student.id)}>{student.name}</Link><small>{student.user.email}</small></td>
            <td>{student.registerNo}</td><td>{student.programme}</td><td>{student.batch}</td><td>{student.semester}</td><td>{student.status ? <Status value={student.status} /> : "—"}</td>
          </tr>)}</tbody>
        </table></div> : <Empty title={records.length ? "No matching students" : "No students in this directory"} detail={records.length ? "Try a different search or filter." : "Department students will appear when they are assigned in the ERP."} />}
        <div className={s.pagination}><span>{filtered.length} students · Page {current + 1} of {pages}</span><div className={s.actions}>
          <button className={s.secondary} disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
          <button className={s.secondary} disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next</button>
        </div></div>
      </section>}
  </>;
}

export function DepartmentStudentProfile({ id }: { id: string }) {
  const { account, directory } = useAdmin();
  const student = directory.data?.find((entry) => entry.id === id);
  const back = <Link className={s.secondary} href={base}>Back to students</Link>;
  if (directory.error) return <><PageHeader title="Student profile" description="Department student directory" actions={back} />
    <div role="alert" className={s.error}>{directory.error} <button className={s.secondary} onClick={directory.refresh}>Retry</button></div></>;
  if (!directory.data) return <p className={s.loading} role="status"><span className={s.skeleton} />Loading student profile…</p>;
  if (!student) return <PageHeader title="Student unavailable" description="This student record could not be found in your department directory." actions={back} />;
  const documents = student.achievements.reduce((sum, row) => sum + row.documents.length, 0);
  return <>
    <PageHeader title={student.user.name} description={`${student.registerNo} · ${account.department.name}`} actions={back} />
    <section className={s.card}><h2>Academic profile</h2><dl className={s.details}>
      {[["Register number", student.registerNo], ["Department", account.department.name], ["Email", student.user.email], ["Degree programme", student.programme],
        ["Batch", student.batch], ["Semester", student.semester], ["Phone", student.user.phone],
        ["Account status", student.user.active === undefined ? null : student.user.active ? "Active" : "Inactive"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}
    </dl></section>
    <section className={s.card}><h2>Documents</h2><p>{documents} supporting {documents === 1 ? "file" : "files"} across submitted achievements.</p>
      <Link className={s.textLink} href={adminHref("documents") + "?student=" + encodeURIComponent(id)}>View student documents</Link></section>
    <section className={s.card}><h2>Achievements</h2>{student.achievements.length ? <ul className={s.linkList}>
      {student.achievements.map((row) => <li key={row.id}><div><strong>{row.title}</strong>
        <p>{achievementTypes[row.type] ?? row.type} · {formatDate(row.submittedAt ?? row.createdAt)}</p></div>
        <Status value={row.status === "SUBMITTED" ? "Pending" : row.status === "APPROVED" ? "Approved" : "Rejected"} /></li>)}
    </ul> : <p>There are no submitted achievements for this student.</p>}
      <Link className={s.textLink} href={adminHref("achievements") + "?student=" + encodeURIComponent(id)}>Open student achievements</Link>
    </section>
  </>;
}
