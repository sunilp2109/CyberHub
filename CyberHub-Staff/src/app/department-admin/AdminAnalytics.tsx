"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, useAdmin } from "./AdminShell";
import { adminHref, classGroup, inClass } from "./adminData";
import { DemoNote, Empty, PageHeader, Status, downloadCsv, formatDate } from "./adminUi";
import { achievementTypes } from "./departmentApi";
import s from "./admin.module.css";

type Point = { label: string; value: number };
const topics = ["Student Enrollment", "Class-wise Student Count", "Faculty Distribution", "Faculty Workload",
  "Document Verification", "Student Achievements", "Academic Activity"] as const;
const countBy = (labels: string[]): Point[] => Array.from(labels.reduce((counts, label) =>
  counts.set(label, (counts.get(label) ?? 0) + 1), new Map<string, number>()), ([label, value]) => ({ label, value }));

function Chart({ points, title, subtitle }: { points: Point[]; title: string; subtitle?: string }) {
  const [selected, setSelected] = useState("");
  const max = Math.max(1, ...points.map(({ value }) => value));
  const highlight = points.find(({ label }) => label === selected);
  return <section className={s.card}>
    <div className={s.chartHeading}><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <p aria-live="polite">{highlight ? highlight.label + " · " + highlight.value : ""}</p></div>
    {points.length ? <div className={s.barChart}>{points.map(({ label, value }) => <button key={label} className={s.barRow}
      aria-pressed={selected === label} onClick={() => setSelected(selected === label ? "" : label)}>
      <span>{label}</span><meter min={0} max={max} value={value} aria-hidden="true" /><strong>{value}</strong>
    </button>)}</div> : <Empty title="No figures available" detail="Figures appear when data is available for this view." />}
  </section>;
}

const quickLinks = [
  ["Add student", "/department-admin/students/new", "users"], ["Add faculty", "/department-admin/faculty/new", "faculty"],
  ["Create class", "/department-admin/classes/new", "layers"], ["Assign faculty", "/department-admin/allocations/new", "allocation"],
];

export function Dashboard() {
  const { account, data, demo, achievements, directory } = useAdmin();
  const { records, audit } = data;
  const activeYear = records["academic-years"].find(({ status }) => status === "Active");
  const submissions = achievements.data ?? [];
  const pending = submissions.filter(({ status, documents }) => status === "SUBMITTED" && documents?.length);
  const recentStudents = [...(directory.data ?? [])].filter(({ createdAt }) => createdAt)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 4);
  const recentSubmissions = [...submissions].sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt)).slice(0, 4);
  const recentActivity = [
    ...audit.map((entry) => ({ id: entry.id, label: entry.detail, detail: `${entry.module} · Demo`, at: entry.at })),
    ...submissions.flatMap((entry) => entry.reviewedAt ? [{ id: entry.id, label: entry.title,
      detail: entry.status === "REJECTED" ? "Submission rejected" : "Submission approved", at: entry.reviewedAt }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  const metrics = [
    { label: "Total students", value: directory.data?.length, detail: directory.error ? "Directory unavailable" : "Department directory", icon: "users", route: "students" },
    { label: "Total faculty", value: demo ? records.faculty.length : undefined, detail: demo ? "Demo workforce" : "Academic data unavailable", icon: "faculty", route: "faculty" },
    { label: "Total classes", value: demo ? new Set(records.classes.map(classGroup)).size : undefined, detail: demo ? "Demo class groups" : "Academic data unavailable", icon: "layers", route: "classes" },
    { label: "Total sections", value: demo ? records.classes.length : undefined, detail: demo ? "Demo class sections" : "Academic data unavailable", icon: "calendar", route: "classes" },
    { label: "Pending documents", value: achievements.data ? pending.reduce((total, row) => total + row.documents.length, 0) : undefined, detail: achievements.error ? "Queue unavailable" : "Attachments to verify", icon: "file", route: "documents" },
    { label: "Total achievements", value: achievements.data?.length, detail: achievements.error ? "Submissions unavailable" : "Student submissions", icon: "badge", route: "achievements" },
  ];
  return <>
    <PageHeader title="Dashboard" description="An overview of your department’s enrollment, teaching, and verification work."
      actions={<Link className={s.secondary} href={adminHref("reports")}><Icon name="chart" size={17} />View reports</Link>} />
    <section className={s.hero}>
      <div><span className={s.heroLabel}><Icon name="building" size={16} /> {account.department.code}</span><h2>{account.department.name}</h2>
        <p>{activeYear ? `Demo academic year · ${activeYear.name}` : "Department administration"}</p></div>
      <Link className={s.secondary} href={adminHref("documents")}>View documents<Icon name="arrow" size={17} /></Link>
    </section>
    <div className={s.metricGrid}>{metrics.map(({ label, value, detail, icon, route }) =>
      <Link className={s.metric} href={adminHref(route)} key={label}><span className={s.metricIcon}><Icon name={icon} /></span><span>{label}</span><strong>{value ?? "—"}</strong><small>{detail}</small></Link>)}</div>
    {(directory.error || achievements.error) && <div className={s.error} role="alert">Some department data is unavailable.
      <button className={s.secondary} onClick={() => { if (directory.error) directory.refresh(); if (achievements.error) achievements.refresh(); }}>Retry data</button></div>}
    <div className={s.twoColumns}>
      <Chart title="Student enrollment overview" subtitle="Department directory · by batch" points={countBy((directory.data ?? []).map(({ batch }) => batch)).sort((a, b) => a.label.localeCompare(b.label))} />
      <section className={s.card}><h2>Quick actions</h2><div className={s.quickActions}>
        {[...(demo ? quickLinks : []), ["View documents", adminHref("documents"), "file"]].map(([label, href, icon]) => <Link key={href} href={href}>
          <span className={s.metricIcon}><Icon name={icon} size={17} /></span>{label}<Icon name="chevron" size={16} /></Link>)}
      </div>{demo && <p>Record creation and allocation use demo data.</p>}</section>
    </div>
    {demo && <div className={s.twoColumns}>
      <Chart title="Class-wise student distribution" subtitle="Demo academic records" points={records.classes.map((row) => ({
        label: `${row.name} · ${row.section}`, value: records.students.filter((student) => inClass(student, row)).length,
      }))} />
      <Chart title="Faculty allocation overview" subtitle="Demo active allocations" points={records.faculty.map(({ id, name }) => ({
        label: name, value: records.allocations.filter(({ faculty, status }) => faculty === id && status === "Active").length,
      }))} />
    </div>}
    <div className={s.twoColumns}>
      <section className={s.card}><h2>Recent student registrations</h2>
        {recentStudents.length ? <ul className={s.linkList}>{recentStudents.map(({ id, user, registerNo, createdAt }) =>
          <li key={id}><div><Link className={s.textLink} href={adminHref("students") + "/" + encodeURIComponent(id)}>{user.name}</Link><p>{registerNo}</p></div><small>{formatDate(createdAt ?? "")}</small></li>)}</ul>
          : <p>{directory.data ? "No recent registrations are available." : "Registration data is unavailable."}</p>}</section>
      <section className={s.card}><h2>Pending document verification</h2>
        {pending.length ? <ul className={s.linkList}>{pending.slice(0, 4).map((row) => <li key={row.id}><div><strong>{row.title}</strong>
          <p>{row.student?.user?.name} · {row.documents.length} attachments</p></div><Status value="Pending" /></li>)}</ul>
          : <p>{achievements.data ? "No attachments are waiting for verification." : "Verification data is unavailable."}</p>}
        <Link className={s.textLink} href={adminHref("documents")}>Open verification queue</Link></section>
      <section className={s.card}><h2>Recent achievements</h2>
        {recentSubmissions.length ? <ul className={s.linkList}>{recentSubmissions.map((row) => <li key={row.id}>
          <div><strong>{row.title}</strong><p>{achievementTypes[row.type] ?? row.type} · {row.student?.user?.name}</p></div>
          <small>{formatDate(row.submittedAt ?? row.createdAt)}</small></li>)}</ul> : <p>No achievement submissions are available.</p>}
        <Link className={s.textLink} href={adminHref("achievements")}>View achievements</Link></section>
      <section className={s.card}><h2>Department activity</h2>
        {recentActivity.length ? <ul className={s.timeline}>{recentActivity.map(({ id, label, detail, at }) =>
          <li key={id}><span className={s.metricIcon}><Icon name="history" size={16} /></span><div><strong>{label}</strong><small>{detail} · {formatDate(at)}</small></div></li>)}</ul>
          : <p>Verified submissions and demo management activity appear here.</p>}</section>
    </div>
  </>;
}

export function Reports() {
  const { data, demo, achievements, directory } = useAdmin();
  const [topic, setTopic] = useState<typeof topics[number]>("Student Enrollment");
  const [year, setYear] = useState("");
  const [filter, setFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const records = data.records;
  const academic = ["Class-wise Student Count", "Faculty Distribution", "Faculty Workload", "Academic Activity"].includes(topic);
  const usesYear = topic === "Class-wise Student Count" || topic === "Faculty Workload";
  const usesDates = ["Document Verification", "Student Achievements", "Academic Activity"].includes(topic);
  const source = topic === "Student Enrollment" ? directory : academic ? null : achievements;
  const invalid = !!(usesDates && from && to && from > to);
  const available = !academic || demo;
  const within = (date: string) => (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to);
  const students = directory.data ?? [];
  const submissions = (achievements.data ?? []).filter((row) => !filter || row.type === filter);
  let points: Point[];
  switch (topic) {
    case "Student Enrollment":
      points = countBy(students.filter(({ programme }) => !filter || filter === programme).map(({ batch }) => batch)).sort((a, b) => a.label.localeCompare(b.label));
      break;
    case "Class-wise Student Count":
      points = records.classes.filter(({ academicYear }) => !year || year === academicYear).map((row) => ({
        label: `${row.name} · ${row.section} · ${records["academic-years"].find(({ id }) => id === row.academicYear)?.name ?? "—"}`,
        value: records.students.filter((student) => inClass(student, row)).length,
      }));
      break;
    case "Faculty Distribution": points = countBy(records.faculty.filter(({ status }) => status === "Active").map(({ designation }) => designation)); break;
    case "Faculty Workload":
      points = records.faculty.map(({ id, name, employeeId }) => ({ label: `${name} · ${employeeId}`, value: records.allocations.filter((row) =>
        (!year || row.academicYear === year) && row.faculty === id && row.status === "Active").length }));
      break;
    case "Document Verification":
      points = [["Pending", "SUBMITTED"], ["Approved", "APPROVED"], ["Rejected", "REJECTED"]].map(([label, status]) => ({
        label, value: submissions.filter((row) => row.status === status).reduce((count, row) => count + row.documents.filter(({ createdAt }) =>
          within(createdAt ?? row.submittedAt ?? row.createdAt)).length, 0),
      }));
      break;
    case "Student Achievements": points = countBy(submissions.filter((row) => within(row.submittedAt ?? row.createdAt)).map((row) => achievementTypes[row.type] ?? row.type)); break;
    case "Academic Activity": points = countBy(data.audit.filter(({ at }) => within(at)).map(({ module }) => module)); break;
  }
  const programmeOptions = [...new Set(students.map(({ programme }) => programme))].sort();
  const showCategory = topic === "Document Verification" || topic === "Student Achievements";
  return <>
    <PageHeader title="Reports & Analytics" description="Explore enrollment, teaching workload, documents, and achievement data for your department."
      actions={<button className={s.secondary} disabled={invalid || !available || !points.length || (!!source && !source.data)}
        onClick={() => downloadCsv(topic.toLowerCase().replaceAll(" ", "-"), [["Category", "Count"], ...points.map(({ label, value }) => [label, value])])}>
        <Icon name="download" size={17} />Export report</button>} />
    {academic && demo && <DemoNote>These figures use sample academic records in this browser.</DemoNote>}
    <section className={s.panel} aria-label="Report filters"><div className={s.toolbar}>
      <label className={s.field}><span>Report</span><select value={topic} onChange={(e) => {
        setTopic(e.target.value as typeof topic); setFilter(""); setYear(""); setFrom(""); setTo("");
      }}>{topics.map((name) => <option key={name}>{name}</option>)}</select></label>
      {usesYear && available && <label className={s.field}><span>Academic year</span><select value={year} onChange={(e) => setYear(e.target.value)}><option value="">All years</option>
        {records["academic-years"].map(({ id, name }) => <option value={id} key={id}>{name}</option>)}</select></label>}
      {topic === "Student Enrollment" && <label className={s.field}><span>Degree programme</span><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All programmes</option>
        {programmeOptions.map((item) => <option key={item}>{item}</option>)}</select></label>}
      {showCategory && <label className={s.field}><span>Category</span><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All categories</option>
        {Object.entries(achievementTypes).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}
      {usesDates && available && <><label className={s.field}><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className={s.field}><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></>}
    </div></section>
    {!available ? <Empty title="Academic data unavailable" detail="This report requires an academic management service connection." />
      : invalid ? <p className={s.error} role="alert">Choose an end date on or after the start date.</p>
      : source?.error ? <div className={s.error} role="alert">{source.error}<button className={s.secondary} onClick={source.refresh}>Retry</button></div>
      : source && !source.data ? <p className={s.loading} role="status"><span className={s.skeleton} />Loading report…</p> : <Chart key={topic} title={topic} points={points} />}
  </>;
}
