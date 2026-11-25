"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, useAdmin } from "./AdminShell";
import { useSubmissions } from "./AdminDocuments";
import { DemoNote, Empty, PageHeader, downloadCsv, formatDate } from "./adminUi";
import s from "./admin.module.css";

type Point = { label: string; value: number };
const topics = ["Student Enrollment", "Department Statistics", "Faculty Distribution", "Class-wise Student Count", "Faculty Workload", "Document Verification", "Academic Activity"] as const;

function Chart({ points, title, embedded = false }: { points: Point[]; title: string; embedded?: boolean }) {
  const [selected, setSelected] = useState("");
  const max = Math.max(1, ...points.map(({ value }) => value));
  const highlight = points.find(({ label }) => label === selected);
  return <section className={s.card}>
    <div className={s.chartHeading}>{embedded ? <h3>{title}</h3> : <h2>{title}</h2>}<p aria-live="polite">{highlight ? highlight.label + " · " + highlight.value : "Select a bar for details"}</p></div>
    {points.length ? <div className={s.barChart}>{points.map(({ label, value }) => <button key={label}
      className={s.barRow} aria-pressed={selected === label} onClick={() => setSelected(selected === label ? "" : label)}>
      <span>{label}</span><meter min={0} max={max} value={value} aria-hidden="true" /><strong>{value}</strong>
    </button>)}</div> : <Empty title="No data available" detail="Choose another report or change the filters." />}
  </section>;
}

const quickLinks = [
  ["Add student", "/admin/students/new", "users"], ["Add faculty", "/admin/faculty/new", "faculty"],
  ["Create class", "/admin/classes/new", "layers"], ["Assign faculty", "/admin/allocations/new", "allocation"], ["Appoint HOD", "/admin/hod/new", "badge"],
];

export function Dashboard() {
  const { data } = useAdmin();
  const { records, error } = useSubmissions();
  const [distribution, setDistribution] = useState<"students" | "faculty">("students");
  const r = data.records;
  const activeYear = r["academic-years"].find(({ status }) => status === "Active");
  const recent = [...data.audit.map((item) => ({ ...item, key: "demo-" + item.id, module: item.module + " (demo)" })),
    ...(records ?? []).flatMap((record) => record.reviewedAt && record.documents?.length ? [{
      key: "review-" + record.id, at: record.reviewedAt, detail: record.title,
      module: record.status === "APPROVED" ? "Evidence approved" : "Evidence rejected",
    }] : [])].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const metrics = [
    { label: "Students", value: r.students.length, icon: "users", href: "/admin/students", detail: r.students.filter(({ status }) => status === "Active").length + " active" },
    { label: "Faculty", value: r.faculty.length, icon: "faculty", href: "/admin/faculty", detail: r.faculty.filter(({ status }) => status === "Active").length + " active" },
    { label: "Departments", value: r.departments.length, icon: "building", href: "/admin/departments", detail: "Academic departments" },
    { label: "Classes & sections", value: r.classes.length, icon: "layers", href: "/admin/classes", detail: "Class records" },
    { label: "Active academic year", value: activeYear?.name ?? "—", icon: "calendar", href: "/admin/academic-years", detail: activeYear ? "Current academic cycle" : "No active year" },
    { label: "Pending documents", value: records ? records.filter(({ status }) => status === "SUBMITTED").reduce((total, row) => total + (row.documents?.length ?? 0), 0) : "—",
      icon: "file", href: "/admin/documents", detail: error ? "Queue unavailable" : records ? "Attachments to review" : "Loading queue…" },
  ];
  return <>
    <PageHeader title="Dashboard" description="Monitor academic operations and find the work that needs your attention."
      actions={<Link className={s.secondary} href="/admin/reports"><Icon name="chart" size={17} />View reports</Link>} />
    <section className={s.hero}>
      <div><span>{data.settings.organization} administration</span><h2>Your academic workspace</h2>
        <p>Manage people, teaching assignments, and student evidence from one place.</p></div>
      <Link className={s.secondary} href="/admin/documents">Open review queue<Icon name="arrow" size={17} /></Link>
    </section>
    <DemoNote>Academic figures use demo records. The review queue uses the existing achievements service.</DemoNote>
    <div className={s.metricGrid}>{metrics.map(({ label, value, icon, href, detail }) => <Link className={s.metric} href={href} key={label}>
      <span className={s.metricIcon}><Icon name={icon} /></span><span>{label}</span><strong>{value}</strong><small>{detail}</small>
    </Link>)}</div>
    <div className={s.twoColumns}>
      <Chart title="Student enrollment by academic year" points={r["academic-years"].map((year) => ({
        label: year.name, value: r.students.filter(({ academicYear }) => academicYear === year.id).length,
      }))} />
      <section className={s.card}><h2>Department distribution</h2>
        <div className={s.segmented} aria-label="Department distribution metric">
          <button aria-pressed={distribution === "students"} onClick={() => setDistribution("students")}>Students</button>
          <button aria-pressed={distribution === "faculty"} onClick={() => setDistribution("faculty")}>Faculty</button>
        </div>
        <Chart key={distribution} embedded title={distribution === "students" ? "Students by department" : "Faculty by department"}
          points={r.departments.map(({ id, code }) => ({ label: code, value: r[distribution].filter(({ department }) => department === id).length }))} />
      </section>
    </div>
    <div className={s.twoColumns}>
      <section className={s.card}><h2>Recent activity</h2><ul className={s.timeline}>
        {recent.map(({ key, detail, module, at }) => <li key={key}><span className={s.metricIcon}><Icon name="history" size={16} /></span><div><strong>{detail}</strong><small>{module} · {formatDate(at)}</small></div></li>)}
      </ul><Link className={s.textLink} href="/admin/audit">View audit log <Icon name="arrow" size={15} /></Link></section>
      <section className={s.card}><h2>Quick actions</h2><div className={s.quickActions}>{quickLinks.map(([label, href, icon]) => <Link href={href} key={href}><span className={s.metricIcon}><Icon name={icon} size={17} /></span>{label}<Icon name="chevron" size={16} /></Link>)}</div></section>
    </div>
    <div className={s.twoColumns}>
      <Chart title="Students by year of study" points={["1", "2", "3", "4"].map((year) => ({ label: "Year " + year, value: r.students.filter((row) => row.year === year).length }))} />
      <Chart title="Academic activity by module" points={Array.from(new Set(data.audit.map(({ module }) => module))).map((module) =>
        ({ label: module, value: data.audit.filter((entry) => entry.module === module).length }))} />
    </div>
  </>;
}

export function Reports() {
  const { data } = useAdmin();
  const { records, error, retry } = useSubmissions();
  const [topic, setTopic] = useState<typeof topics[number]>("Student Enrollment");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const r = data.records;
  const isDocuments = topic === "Document Verification";
  const isActivity = topic === "Academic Activity";
  const usesDates = isDocuments || isActivity;
  const usesYear = !usesDates && topic !== "Faculty Distribution";
  const usesDepartment = !isActivity;
  const invalidRange = usesDates && from && to && from > to;
  const allowedDate = (date: string) => (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to);
  const academicFilter = (row: Record<string, string>) => (!year || row.academicYear === year) && (!department || row.department === department);
  const departments = isDocuments ? Array.from(new Set((records ?? []).flatMap((row) => {
    const value = row.student?.department;
    return value ? [typeof value === "string" ? value : value.name] : [];
  }))).map((name) => ({ id: name, name })) : r.departments;
  const students = r.students.filter(academicFilter);
  const faculty = r.faculty.filter((row) => !department || row.department === department);
  const visibleDepartments = r.departments.filter(({ id }) => !department || id === department);
  let points: Point[];

  switch (topic) {
    case "Student Enrollment":
      points = r["academic-years"].filter(({ id }) => !year || id === year).map(({ id, name }) => ({
        label: name, value: students.filter(({ academicYear }) => academicYear === id).length,
      }));
      break;
    case "Department Statistics":
      points = visibleDepartments.flatMap(({ id, code }) => [
        { label: code + " · Students", value: students.filter(({ department }) => department === id).length },
        { label: code + " · Classes", value: r.classes.filter((row) => academicFilter(row) && row.department === id).length },
      ]);
      break;
    case "Faculty Distribution":
      points = visibleDepartments.map(({ id, name }) => ({ label: name, value: faculty.filter(({ department }) => department === id).length }));
      break;
    case "Class-wise Student Count":
      points = r.classes.filter(academicFilter).map((row) => ({ label: row.name, value: students.filter((student) =>
        ["department", "academicYear", "degree", "year", "section", "batch"].every((key) => student[key] === row[key])).length }));
      break;
    case "Faculty Workload":
      points = faculty.map(({ id, name }) => ({
        label: name, value: r.allocations.filter((row) => academicFilter(row) && row.faculty === id && row.status === "Active").length,
      }));
      break;
    case "Document Verification":
      points = records ? [["Pending", "SUBMITTED"], ["Approved", "APPROVED"], ["Rejected", "REJECTED"]].map(([label, key]) =>
        ({ label, value: records.filter((row) => {
          const name = row.student?.department;
          return row.status === key && (!department || (typeof name === "string" ? name : name?.name) === department);
        }).reduce((total, row) => total + (row.documents ?? []).filter((file) => allowedDate(file.createdAt ?? row.createdAt)).length, 0) })) : [];
      break;
    case "Academic Activity": {
      const entries = data.audit.filter(({ at }) => allowedDate(at));
      points = Array.from(new Set(entries.map(({ module }) => module))).map((module) => ({ label: module, value: entries.filter((entry) => entry.module === module).length }));
      break;
    }
  }

  return <>
    <PageHeader title="Reports & Analytics" description="Explore enrollment, academic activity, teaching assignments, and document review."
      actions={<button className={s.secondary} disabled={!points.length || !!invalidRange} onClick={() => downloadCsv(topic.toLowerCase().replaceAll(" ", "-"), [["Category", "Count"], ...points.map(({ label, value }) => [label, value])])}><Icon name="download" />Export report</button>} />
    {!isDocuments && <DemoNote>Academic reports use demo workspace records.</DemoNote>}
    <section className={s.panel} aria-label="Report filters"><div className={s.toolbar}>
      <label className={s.field}><span>Report</span><select value={topic} onChange={(e) => {
        setTopic(e.target.value as typeof topic); setDepartment(""); setYear(""); setFrom(""); setTo("");
      }}>{topics.map((name) => <option key={name}>{name}</option>)}</select></label>
      {usesYear && <label className={s.field}><span>Academic year</span><select value={year} onChange={(e) => setYear(e.target.value)}><option value="">All years</option>{r["academic-years"].map(({ id, name }) => <option value={id} key={id}>{name}</option>)}</select></label>}
      {usesDepartment && <label className={s.field}><span>Department</span><select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}</select></label>}
      {usesDates && <><label className={s.field}><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className={s.field}><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></>}
    </div></section>
    {invalidRange ? <p className={s.error} role="alert">Choose an end date on or after the start date.</p>
      : isDocuments && error ? <div className={s.error} role="alert">{error} <button className={s.secondary} onClick={retry}>Retry</button></div>
      : isDocuments && !records ? <p className={s.loading} role="status">Loading document counts…</p> : <Chart key={topic} title={topic} points={points} />}
  </>;
}
