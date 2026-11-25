"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Header from "@/components/Header/Header";
import styles from "./ActivityModule.module.css";

export interface ActivityField {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

export interface ActivityModuleProps {
  activityType: "PROJECT" | "INTERNSHIP" | "CERTIFICATE" | "COMPETITION" | "PUBLICATION" | "PATENT" | "RESEARCH" | "WORKSHOP" | "CONFERENCE" | "HACKATHON" | "LEADERSHIP" | "VOLUNTEERING" | "AWARD";
  title: string;
  subtitle: string;
  eyebrow: string;
  itemLabel: string;
  fields: ActivityField[];
  formHref?: string;
}

interface ActivityDocument { id: string; fileName: string }

const statuses = ["Submitted", "Approved", "Rejected"] as const;
type SubmissionStatus = typeof statuses[number];
const statusLabels = new Map<string, SubmissionStatus>(statuses.map((status) => [status.toUpperCase(), status]));

interface ActivityRecord {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  values: Record<string, string>;
  rejectionReason?: string;
  documents?: ActivityDocument[];
}

interface ApiActivityRecord {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  status: string;
  metadata?: Record<string, string> | null;
  createdAt: string;
  approvals?: Array<{ action: string; comment?: string | null }>;
  documents?: ActivityDocument[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ActivityModule({
  activityType,
  title,
  subtitle,
  eyebrow,
  itemLabel,
  fields,
  formHref,
}: ActivityModuleProps) {
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ActivityRecord["status"]>("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`${API_URL}/api/v1/achievements`, { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load records.");
      const payload = await response.json() as { data: ApiActivityRecord[] };
      const nextRecords = payload.data.flatMap((record) => {
        const status = statusLabels.get(record.status);
        if (record.type !== activityType || !status) return [];
        return [{
          id: record.id,
          status,
          createdAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(record.createdAt)),
          values: { ...(record.metadata ?? {}), title: record.title, description: record.description ?? "" },
          documents: record.documents,
          rejectionReason: record.approvals?.find((approval) => approval.action === "REJECTED")?.comment?.trim(),
        }];
      });
      setRecords(nextRecords);
      if (!formHref) {
        const url = new URL(window.location.href);
        const record = nextRecords.find((item) => item.id === url.searchParams.get("edit") && item.status === "Submitted");
        if (record) {
          url.searchParams.delete("edit");
          window.history.replaceState(null, "", url);
          setEditingId(record.id);
          setValues(record.values);
          setError("");
          setFormOpen(true);
        }
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [activityType, formHref]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRecords(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = statusFilter === "All" || record.status === statusFilter;
      const matchesSearch =
        !query ||
        Object.values(record.values).some((value) =>
          value.toLowerCase().includes(query),
        );
      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  const openForm = () => {
    setEditingId(null);
    setValues({});
    setError("");
    setFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstField = fields[0];
    if (!firstField || !values[firstField.key]?.trim()) {
      setError(`Enter a ${firstField?.label.toLowerCase() ?? "title"} to continue.`);
      return;
    }

    const title = values[firstField.key].trim();
    const description = Object.entries(values)
      .filter(([key]) => key !== firstField.key)
      .map(([key, value]) => `${fields.find((field) => field.key === key)?.label ?? key}: ${value}`)
      .filter(Boolean)
      .join("\n");
    setError("");
    setSaving(true);
    try {
      const response = await fetch(
      `${API_URL}/api/v1/achievements${editingId !== null ? `/${editingId}` : ""}`,
      {
        method: editingId !== null ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: activityType,
          title,
          description,
          status: "SUBMITTED",
          values,
        }),
      },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setError(payload?.error?.message ?? "Unable to save this record. Please try again.");
        return;
      }
      setValues({});
      setEditingId(null);
      setFormOpen(false);
      await loadRecords();
    } catch {
      setError("Unable to reach the submission service. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <Header title={title} subtitle={subtitle} />
      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 className={styles.heading}>Build your {itemLabel.toLowerCase()} record</h2>
            <p className={styles.description}>
              Track your work, add supporting details, and keep your achievement portfolio current.
            </p>
          </div>
          <div className={styles.actions}>
            {formHref ? (
              <Link className={styles.primaryButton} href={formHref} prefetch={false}>
                <span aria-hidden="true">+</span> Add {itemLabel}
              </Link>
            ) : (
              <button type="button" className={styles.primaryButton} onClick={openForm}>
                <span aria-hidden="true">+</span> Add {itemLabel}
              </button>
            )}
          </div>
        </section>

        <section className={styles.stats} aria-label={`${title} summary`}>
          {statuses.map((status) => (
            <div className={styles.statCard} key={status}>
              <span>{status}</span>
              <strong>{loading || loadError ? "—" : records.filter((record) => record.status === status).length}</strong>
            </div>
          ))}
        </section>

        <section className={styles.toolbar}>
          <label className={styles.search}>
            <span className={styles.srOnly}>Search {title}</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className={styles.filters} aria-label="Filter records">
            {(["All", ...statuses] as const).map((filter) => (
              <button
                type="button"
                key={filter}
                className={statusFilter === filter ? styles.filterActive : styles.filter}
                aria-pressed={statusFilter === filter}
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {loadError ? (
          <section className={styles.empty} role="alert">
            <h3>Unable to load your records</h3>
            <button type="button" className={styles.secondaryButton} onClick={() => void loadRecords()}>Retry</button>
          </section>
        ) : loading ? (
          <section className={styles.empty}><h3>Loading your records…</h3></section>
        ) : filteredRecords.length > 0 ? (
          <section className={styles.grid} aria-label={`${title} records`}>
            {filteredRecords.map((record) => (
              <article className={styles.recordCard} key={record.id}>
                <div className={styles.cardTop}>
                  <span className={styles.status} data-status={record.status}>
                    {record.status}
                  </span>
                  <span className={styles.date}>{record.createdAt}</span>
                </div>
                <h3>{record.values[fields[0]?.key] || itemLabel}</h3>
                <p>{record.values[fields[1]?.key] || (activityType === "PROJECT" && record.values.technology) || "No additional details added yet."}</p>
                {formHref && (
                  <details className={styles.recordDetails}>
                    <summary>{itemLabel} details</summary>
                    <dl>
                      {fields.slice(2).filter((field) => record.values[field.key]).map((field) => (
                        <div key={field.key}><dt>{field.label}</dt><dd>
                          {field.key === "publicationLink" && /^https?:\/\//i.test(record.values[field.key])
                            ? <a href={record.values[field.key]} target="_blank" rel="noreferrer">{record.values[field.key]}</a>
                            : record.values[field.key]}
                        </dd></div>
                      ))}
                      {record.values.result && <div><dt>Result or recognition</dt><dd>{record.values.result}</dd></div>}
                    </dl>
                    {record.documents?.map((document) => (
                      <a key={document.id} href={`${API_URL}/api/v1/achievements/${record.id}/documents/${document.id}`}>
                        {document.id.startsWith("offer-letter-") ? "Offer letter · " : document.id.startsWith("completion-certificate-") ? "Completion certificate · " : ""}
                        {document.fileName}
                      </a>
                    ))}
                  </details>
                )}
                {record.status === "Rejected" && (
                  <div className={styles.rejectionNotice}>
                    <strong>Your submission was rejected.</strong>
                    {record.rejectionReason && (
                      <div><strong>Reviewer’s reason</strong><div>{record.rejectionReason}</div></div>
                    )}
                  </div>
                )}
                <div className={styles.cardFooter}>
                  <span>{formHref && activityType !== "PROJECT" ? `${record.documents?.length ?? 0} attachment(s)`
                    : `${activityType === "PROJECT" ? fields.slice(1).filter((field) => record.values[field.key]).length : fields.length} details available`}</span>
                  {record.status === "Submitted" && (
                    formHref ? <Link href={`${formHref}?edit=${encodeURIComponent(record.id)}`} prefetch={false}>Edit</Link> : <button
                      type="button"
                      onClick={() => {
                        setEditingId(record.id);
                        setValues(record.values);
                        setError("");
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden="true">✦</div>
            <h3>{search || statusFilter !== "All" ? "No matching records" : `No ${title.toLowerCase()} added yet`}</h3>
            <p>
              {search || statusFilter !== "All"
                ? "Try a different search or filter."
                : `Start by adding your first ${itemLabel.toLowerCase()}.`}
            </p>
            {!search && statusFilter === "All" && (
              formHref
                ? <Link className={styles.primaryButton} href={formHref} prefetch={false}>Add your first {itemLabel}</Link>
                : <button type="button" className={styles.primaryButton} onClick={openForm}>Add your first {itemLabel}</button>
            )}
          </section>
        )}

      </div>

      {formOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="activity-form-title">
            <div className={styles.modalHeader}>
              <div>
                <h2 id="activity-form-title">{editingId ? "Edit" : "Add"} {itemLabel}</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setFormOpen(false)} aria-label="Close form">×</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {fields.map((field) => (
                <label key={field.key} className={styles.field}>
                  <span>{field.label}</span>
                  {field.multiline ? (
                    <textarea
                      rows={4}
                      placeholder={field.placeholder}
                      value={values[field.key] ?? ""}
                      onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={values[field.key] ?? ""}
                      onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  )}
                </label>
              ))}
              {error && <p className={styles.formError} role="alert">{error}</p>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setFormOpen(false)}>Cancel</button>
                <button type="submit" disabled={saving} className={styles.primaryButton}>{saving ? "Submitting…" : "Submit record"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
