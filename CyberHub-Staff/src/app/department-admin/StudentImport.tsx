"use client";

import { useRef, useState } from "react";
import { Modal, useAdmin } from "./AdminShell";
import { getModule, moduleFields, validateRow, type Row } from "./adminData";
import { downloadCsv } from "./adminUi";
import s from "./admin.module.css";

const moduleConfig = getModule("students")!;
const fields = moduleFields(moduleConfig);

function parseCsv(text: string) {
  const records: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closedQuote = false;
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i <= source.length; i++) {
    const ch = source[i];
    if (quoted && ch !== undefined) {
      if (ch === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; closedQuote = true; }
      else field += ch;
    } else if (quoted) throw new Error("The CSV contains an unclosed quote.");
    else if (ch === "," || ch === "\n" || ch === undefined) {
      row.push(field.trim()); field = ""; closedQuote = false;
      if (ch !== ",") { if (row.some(Boolean)) records.push(row); row = []; }
    } else if (ch === '"' && !field && !closedQuote) quoted = true;
    else if (closedQuote || ch === '"') throw new Error("Check quotes around CSV fields.");
    else field += ch;
  }
  return records;
}

export default function StudentImport({ onClose }: { onClose: () => void }) {
  const { account, data, update, notice } = useAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const upload = useRef(0);
  const years = data.records["academic-years"];
  const example: Record<string, string> = {
    name: "Sample Student", registerNumber: "DEMO-NEW-01", email: "sample@example.edu", academicYear: years.find(({ id }) => id === data.settings.defaultYear)?.name ?? years[0]?.name ?? "",
    admissionYear: "2026", degree: "B.Tech", year: "1", section: "A", batch: "2026–2030",
  };
  const template = [fields.map(({ key }) => key), fields.map(({ key, defaultValue }) => example[key] ?? defaultValue ?? "")];

  async function inspect(file: File | undefined) {
    const request = ++upload.current;
    setRows([]); setErrors([]);
    if (!file) { setLoading(false); return; }
    setLoading(true);
    try {
      if (!file.name.toLowerCase().endsWith(".csv") || file.size > 500_000) throw new Error("Choose a CSV file under 500 KB.");
      const [header, ...lines] = parseCsv(await file.text());
      if (!header || !lines.length || lines.length > 200) throw new Error("Include a header and between 1 and 200 student rows.");
      if (new Set(header).size !== header.length || header.some((key) => !fields.some((field) => field.key === key))) {
        throw new Error("Use the template columns. Department and account identifiers are assigned automatically.");
      }
      const reviewed: Row[] = [], problems: string[] = [];
      lines.forEach((line, index) => {
        if (line.length !== header.length) { problems.push(`Record ${index + 1} has the wrong number of columns.`); return; }
        const input = Object.fromEntries(header.map((key, column) => [key, line[column]]));
        const row: Row = { ...Object.fromEntries(fields.map(({ key, defaultValue }) => [key, input[key] || defaultValue || ""])),
          id: crypto.randomUUID(), departmentId: account.department.id };
        row.academicYear = years.find(({ id, name }) => row.academicYear === name || row.academicYear === id)?.id ?? row.academicYear;
        const validation = Object.values(validateRow(moduleConfig, row, { ...data.records, students: [...data.records.students, ...reviewed] }));
        if (validation.length) problems.push(`Record ${index + 1}. ${validation.join(" ")}`);
        else reviewed.push(row);
      });
      if (upload.current === request) { setRows(reviewed); setErrors(problems); }
    } catch (error) {
      if (upload.current === request) setErrors([error instanceof Error ? error.message : "Could not read this CSV."]);
    } finally {
      if (upload.current === request) setLoading(false);
    }
  }

  return <Modal title="Bulk student import" onClose={onClose}>
    <p>Import up to 200 sample students into {account.department.name}. Use the template and enter academic years by their displayed name.</p>
    <button className={s.secondary} onClick={() => downloadCsv("department-student-import", template)}>Download CSV template</button>
    <label className={s.field}><span>Student CSV</span><input type="file" accept=".csv,text/csv" onChange={(event) => void inspect(event.target.files?.[0])} /></label>
    {loading && <p role="status">Checking rows…</p>}
    {!!errors.length && <div className={s.error} role="alert"><div><strong>Correct all errors before importing.</strong><ul className={s.errorList}>{errors.slice(0, 12).map((error, index) => <li key={index}>{error}</li>)}</ul>
      {errors.length > 12 && <p>{errors.length - 12} more records have errors.</p>}</div></div>}
    {!!rows.length && <section><h3>{rows.length} {rows.length === 1 ? "record" : "records"} ready</h3>
      <ul className={s.linkList}>{rows.slice(0, 5).map(({ id, name, registerNumber }) => <li key={id}>{name}<span>{registerNumber}</span></li>)}</ul>
      {rows.length > 5 && <p>Showing the first five validated records.</p>}</section>}
    <div className={s.formActions}><button className={s.secondary} onClick={onClose}>Cancel</button>
      <button className={s.primary} disabled={loading || !rows.length || !!errors.length} onClick={() => {
        update((current) => ({ ...current, records: { ...current.records, students: [...current.records.students, ...rows] } }),
          { action: "Imported", module: "Students", detail: `${rows.length} demo student records` });
        notice(`${rows.length} student ${rows.length === 1 ? "record" : "records"} imported into the demo workspace.`);
        onClose();
      }}>Import students</button></div>
  </Modal>;
}
