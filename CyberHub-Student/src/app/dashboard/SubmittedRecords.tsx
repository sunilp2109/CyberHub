"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import card from "@/components/ActivityModule/ActivityModule.module.css";
import { awardRecordFields } from "../awards/fields";
import { credentialFields } from "../certificates/fields";
import { competitionFields } from "../competitions/fields";
import { internshipFields } from "../internships/fields";
import { patentFields } from "../patents/fields";
import { projectFields, legacyTechnologyField } from "../projects/fields";
import { publicationFields, legacyPublicationDetails } from "../publications/fields";
import styles from "./SubmittedRecords.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const statusLabels = { SUBMITTED: "Submitted", APPROVED: "Approved", REJECTED: "Rejected" } as const;
type Status = keyof typeof statusLabels;
const filterLabels = { ALL: "Total records", ...statusLabels } as const;
type RecordFilter = keyof typeof filterLabels;
type Category = { label: string; path: string; form?: boolean; fields?: ReadonlyArray<{ key: string; label: string }> };
const categories: Record<string, Category> = {
  PROJECT: { label: "Project", path: "/projects", form: true, fields: [...projectFields, legacyTechnologyField] },
  CERTIFICATE: { label: "Certificate", path: "/certificates", form: true, fields: credentialFields },
  COMPETITION: { label: "Competition", path: "/competitions", form: true, fields: competitionFields },
  INTERNSHIP: { label: "Internship", path: "/internships", form: true, fields: internshipFields },
  PUBLICATION: { label: "Publication", path: "/publications", form: true, fields: [...publicationFields, legacyPublicationDetails] },
  PATENT: { label: "Patent", path: "/patents", form: true, fields: patentFields },
  AWARD: { label: "Award", path: "/awards", form: true, fields: awardRecordFields },
  RESEARCH: { label: "Research", path: "/research" },
  WORKSHOP: { label: "Workshop", path: "/workshops" },
  CONFERENCE: { label: "Conference", path: "/conferences" },
  VOLUNTEERING: { label: "Volunteering", path: "/volunteering" },
  HACKATHON: { label: "Hackathon", path: "/hackathons" },
  LEADERSHIP: { label: "Leadership", path: "/leadership" },
};

type RecordEntry = {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  submittedAt?: string | null;
  description?: string | null;
  metadata?: Record<string, string> | null;
  approvals?: { action: string; comment?: string | null }[];
  documents?: { id: string; fileName: string }[];
};
type Submission = RecordEntry & { status: Status };

function isSubmission(record: RecordEntry): record is Submission {
  return Object.hasOwn(statusLabels, record.status);
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

export default function SubmittedRecords() {
  const [records, setRecords] = useState<Submission[] | null>(null);
  const [filter, setFilter] = useState<RecordFilter>("ALL");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${API_URL}/api/v1/achievements`, { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load submissions.");
        const { data } = await response.json() as { data: RecordEntry[] };
        if (!controller.signal.aborted) {
          setRecords(data.filter(isSubmission).sort((a, b) =>
            Date.parse(b.submittedAt ?? b.createdAt) - Date.parse(a.submittedAt ?? a.createdAt)));
        }
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);

  const shown = records?.filter((record) => filter === "ALL" || record.status === filter) ?? [];
  return (
    <section className={styles.section} aria-labelledby="student-submissions">
      <header className={styles.heading}>
        <h2 id="student-submissions">Student records</h2>
        <div className={card.filters} role="group" aria-label="Filter dashboard records">
          {(Object.keys(filterLabels) as RecordFilter[]).map((key) => (
            <button className={key === filter ? card.filterActive : card.filter} type="button" key={key}
              aria-pressed={key === filter} onClick={() => setFilter(key)}>{filterLabels[key]}</button>
          ))}
        </div>
      </header>
      {failed ? (
        <div className={styles.message}>
          <p role="alert">Could not load your records.</p>
          <button className={card.secondaryButton} type="button" onClick={() => {
            setFailed(false);
            setAttempt((value) => value + 1);
          }}>Try again</button>
        </div>
      ) : records === null ? (
        <p className={styles.message} role="status">Loading your records…</p>
      ) : shown.length === 0 ? (
        <p className={styles.message}>{filter === "ALL" ? "No records submitted yet." : `No ${statusLabels[filter].toLowerCase()} records yet.`}</p>
      ) : (
        <div className={`${card.grid} ${styles.grid}`}>
          {shown.map((record) => {
            const status = record.status;
            const category = Object.hasOwn(categories, record.type) ? categories[record.type] : undefined;
            const date = record.submittedAt ?? record.createdAt;
            const timestamp = Date.parse(date);
            const values = record.metadata ?? {};
            const labels = new Map(category?.fields?.map(({ key, label }) => [key, label]));
            const details = Object.entries(values).filter(([key, value]) => key !== "title" && value?.trim());
            const files = record.documents ?? [];
            const rejection = record.approvals?.find((approval) => approval.action === "REJECTED")?.comment;
            return (
              <article className={card.recordCard} key={record.id}>
                <div className={card.cardTop}>
                  <span className={card.status} data-status={statusLabels[status]}>{statusLabels[status]}</span>
                  {Number.isFinite(timestamp) && <time className={card.date} dateTime={date}>{dateFormat.format(timestamp)}</time>}
                </div>
                <h3>{record.title}</h3>
                <p>{values.issuer || values.organiser || values.company || values.fundingAgency || category?.label || "Achievement"}</p>
                <details className={card.recordDetails}>
                  <summary>{category?.label ?? "Record"} details</summary>
                  {record.description && <p className={styles.description}>{record.description}</p>}
                  {details.length > 0 && <dl>{details.map(([key, value]) => (
                    <div key={key}><dt>{labels.get(key) ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase())}</dt><dd>{value}</dd></div>
                  ))}</dl>}
                  {files.map((file) => <a key={file.id} aria-label={`Download ${file.fileName} for ${record.title}`}
                    href={`${API_URL}/api/v1/achievements/${encodeURIComponent(record.id)}/documents/${encodeURIComponent(file.id)}`}>{file.fileName}</a>)}
                  {!record.description && !details.length && !files.length && <p>No additional details added yet.</p>}
                </details>
                {status === "REJECTED" && <p className={card.rejectionNotice}>{rejection || "Your submission was rejected."}</p>}
                <div className={card.cardFooter}>
                  <span>{files.length ? `${files.length} uploaded ${files.length === 1 ? "file" : "files"}` : `${details.length} details available`}</span>
                  {category && (status === "SUBMITTED" ? <Link prefetch={false}
                    href={`${category.path}${category.form ? "/new" : ""}?edit=${encodeURIComponent(record.id)}`}>Edit</Link>
                    : <Link prefetch={false} href={category.path}>View {category.label.toLowerCase()} page</Link>)}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
