"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DirectoryStudent } from "@/lib/staffDirectory";
import DocumentPreview from "./DocumentPreview";
import styles from "./page.module.css";

type Achievement = DirectoryStudent["achievements"][number];
type StudentDocument = Achievement["documents"][number] & Pick<Achievement, "title" | "type" | "status" | "yearOfStudy" | "academicYear"> & { recordId: string };
export type StudentUploads = Pick<DirectoryStudent, "id" | "registerNo" | "programme" | "batch" | "semester"> & {
  name: string;
  documents: StudentDocument[];
};

const initialFilters = { event: "", student: "", yearOfStudy: "", academicYear: "", category: "", batch: "", semester: "", status: "", format: "", from: "", to: "" };
type SelectFilter = "yearOfStudy" | "academicYear" | "category" | "batch" | "semester" | "status" | "format";
const statusLabels = { DRAFT: "Draft", SUBMITTED: "Pending review", APPROVED: "Approved", REJECTED: "Rejected" };
const formats: Record<string, string> = { "application/pdf": "PDF", "image/png": "PNG", "image/jpeg": "JPG" };
const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" });
const pageSize = 8;
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function categoryLabel(type: string) {
  return type === "CERTIFICATE" ? "Course or certificate" : type[0] + type.slice(1).toLowerCase().replaceAll("_", " ");
}

function options(values: (string | number)[]) {
  return [...new Set(values.map(String))].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function searchText(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export default function DocumentLibrary({ students }: { students: StudentUploads[] | null }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<{ name: string; title: string; student: string; url: string } | null>(null);

  function setFilter(key: keyof typeof initialFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  if (students === null) return (
    <div className={styles.message} role="alert">
      Student documents could not be loaded.{" "}
      <button type="button" className={styles.button} disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
        {refreshing ? "Retrying…" : "Try again"}
      </button>
    </div>
  );

  const allDocuments = students.flatMap(({ documents }) => documents);
  const selects: { key: SelectFilter; label: string; all: string; values: string[]; format?: (value: string) => string }[] = [
    { key: "yearOfStudy", label: "Year of study", all: "All years", values: ["1", "2", "3", "4", "unrecorded"],
      format: (value) => value === "unrecorded" ? "Year not recorded" : `Year ${value}` },
    { key: "academicYear", label: "Academic year", all: "All academic years", values: options(allDocuments.map(({ academicYear }) => academicYear ?? "")) },
    { key: "category", label: "Category", all: "All categories", values: options(allDocuments.map(({ type }) => type)), format: categoryLabel },
    { key: "batch", label: "Batch", all: "All batches", values: options(students.map(({ batch }) => batch)) },
    { key: "semester", label: "Current semester", all: "All semesters", values: options(students.map(({ semester }) => semester)) },
    { key: "status", label: "Review status", all: "All statuses", values: ["SUBMITTED", "APPROVED", "REJECTED"], format: (value) => statusLabels[value as keyof typeof statusLabels] },
    { key: "format", label: "File format", all: "All formats", values: options(allDocuments.map(({ mimeType }) => mimeType)), format: (value) => formats[value] ?? value },
  ];
  const eventQuery = searchText(filters.event).split(" ").filter(Boolean);
  const studentQuery = searchText(filters.student);
  const invalidDates = Boolean(filters.from && filters.to && filters.from > filters.to);
  const activeFilters = Object.values(filters).some(Boolean);
  const matching = invalidDates ? [] : students.flatMap((student) => {
    if ((filters.batch && student.batch !== filters.batch)
      || (filters.semester && String(student.semester) !== filters.semester)
      || !searchText(`${student.name} ${student.registerNo}`).includes(studentQuery)) return [];

    const documents = student.documents.filter((file) => {
      const date = file.createdAt?.slice(0, 10) ?? "";
      const title = searchText(file.title);
      return eventQuery.every((word) => title.includes(word))
        && (!filters.yearOfStudy || filters.yearOfStudy === String(file.yearOfStudy ?? "unrecorded"))
        && (!filters.academicYear || file.academicYear === filters.academicYear)
        && (!filters.category || file.type === filters.category)
        && (!filters.status || file.status === filters.status)
        && (!filters.format || file.mimeType === filters.format)
        && (!filters.from || (date && date >= filters.from))
        && (!filters.to || (date && date <= filters.to));
    }).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return documents.length ? [{ ...student, documents }] : [];
  }).sort((a, b) => (
    (sort === "newest" ? (b.documents[0].createdAt ?? "").localeCompare(a.documents[0].createdAt ?? "") : 0)
    || a.name.localeCompare(b.name) || a.registerNo.localeCompare(b.registerNo)
  ));
  const resultCount = matching.reduce((total, student) => total + student.documents.length, 0);
  const lastPage = Math.max(1, Math.ceil(matching.length / pageSize));
  const currentPage = Math.min(page, lastPage);
  const visible = matching.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <section className={styles.filters} aria-label="Document filters">
        <div className={styles.searchGrid}>
          <label className={styles.field}>Event or record name
            <input type="search" placeholder="e.g. Smart India Hackathon" value={filters.event} onChange={(e) => setFilter("event", e.target.value)} />
          </label>
          <label className={styles.field}>Student
            <input type="search" placeholder="Name or register number" value={filters.student} onChange={(e) => setFilter("student", e.target.value)} />
          </label>
        </div>
        <div className={styles.filterGrid}>
          {selects.map(({ key, label, all, values, format }) => (
            <div className={styles.field} key={key}>
              <label htmlFor={`document-${key}`}>{label}</label>
              <select id={`document-${key}`} value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}>
                <option value="">{all}</option>
                {values.map((value) => <option key={value} value={value}>{format?.(value) ?? value}</option>)}
              </select>
            </div>
          ))}
          <label className={styles.field}>Uploaded from
            <input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
          </label>
          <label className={styles.field}>Uploaded through
            <input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
          </label>
        </div>
        {invalidDates && <p className={styles.error} role="alert">The end date must be on or after the start date.</p>}
      </section>

      <section aria-label="Matching student uploads">
        <div className={styles.resultsBar}>
          <p role="status"><strong>{matching.length}</strong> {matching.length === 1 ? "student" : "students"} · <strong>{resultCount}</strong> {resultCount === 1 ? "file" : "files"}</p>
          <div className={styles.actions}>
            {activeFilters && <button type="button" className={styles.button} onClick={clearFilters}>Clear filters</button>}
            <select aria-label="Sort students" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              <option value="newest">Newest uploads</option>
              <option value="name">Student name A–Z</option>
            </select>
          </div>
        </div>
        {!visible.length && !invalidDates && (
          <div className={styles.message}>
            <h2>{allDocuments.length ? "No matching documents" : "No student documents yet"}</h2>
            <p>{allDocuments.length ? "Try a different event name or clear the filters." : "Files appear here after students submit records with attachments."}</p>
          </div>
        )}
        <div className={styles.results}>
          {visible.map((student) => (
            <article className={styles.studentCard} key={student.id}>
              <header className={styles.studentHeader}>
                <div>
                  <h2><Link href={`/student-records/${encodeURIComponent(student.id)}`} prefetch={false}>{student.name}</Link></h2>
                  <p>{student.registerNo} · {student.programme} · {student.batch} · Semester {student.semester}</p>
                </div>
                <span>{student.documents.length} {student.documents.length === 1 ? "file" : "files"}</span>
              </header>
              <ul className={styles.files}>
                {student.documents.map((file) => {
                  const url = `${api}/api/v1/achievements/${encodeURIComponent(file.recordId)}/documents/${encodeURIComponent(file.id)}`;
                  return (
                    <li className={styles.file} key={file.id}>
                      <div className={styles.fileDetails}>
                        <h3>{file.title}</h3>
                        <p>{file.fileName}</p>
                        <p>{categoryLabel(file.type)} · {formats[file.mimeType] ?? file.mimeType} · {Math.ceil(file.sizeBytes / 1024)} KB
                          {file.createdAt && <> · {dateFormat.format(new Date(file.createdAt))}</>}
                        </p>
                        <p>{file.yearOfStudy ? `Year ${file.yearOfStudy}` : "Year not recorded"}
                          {file.academicYear && <> · {file.academicYear}</>}
                        </p>
                      </div>
                      <span className={styles.status} data-status={file.status}>{statusLabels[file.status]}</span>
                      <div className={styles.actions}>
                        <button type="button" className={styles.button} aria-label={`Preview ${file.fileName} for ${student.name}`} aria-haspopup="dialog"
                          onClick={() => setPreview({ name: file.fileName, title: file.title, student: student.name, url })}>Preview</button>
                        <a className={styles.button} href={url} aria-label={`Download ${file.fileName} for ${student.name}`}>Download</a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
        {lastPage > 1 && (
          <nav className={styles.pagination} aria-label="Document results pages">
            <button className={styles.button} type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <span>Page {currentPage} of {lastPage}</span>
            <button className={styles.button} type="button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button>
          </nav>
        )}
      </section>
      {preview && <DocumentPreview {...preview} onClose={() => setPreview(null)} />}
    </>
  );
}
