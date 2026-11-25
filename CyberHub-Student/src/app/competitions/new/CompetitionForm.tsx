"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Header from "@/components/Header/Header";
import { encodeEvidenceFile, evidenceAccept, isValidEvidenceFile } from "@/components/ActivityModule/evidence";
import { competitionFields } from "../fields";
import styles from "@/components/ActivityModule/EntryForm.module.css";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const maxFiles = 2;

type Document = { id: string; fileName: string };
interface RecordItem {
  id: string;
  type: string;
  title: string;
  status: string;
  metadata?: Record<string, string> | null;
  documents?: Document[];
}

export default function CompetitionForm({ editingId }: { editingId?: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({ participation: "Individual", currency: "INR" });
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [editable, setEditable] = useState(!editingId);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    const controller = new AbortController();
    void fetch(`${api}/api/v1/achievements`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = await response.json() as { data: RecordItem[] };
        const record = payload.data.find((item) => item.id === editingId && item.type === "COMPETITION");
        if (record?.status !== "SUBMITTED") {
          setError("This competition record is unavailable for editing.");
          return;
        }
        setValues({ participation: "Individual", currency: "INR", ...record.metadata, title: record.title });
        setDocuments(record.documents ?? []);
        setEditable(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Unable to load this competition record.");
      });
    return () => controller.abort();
  }, [editingId]);

  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function addFiles(selected: File[]) {
    if (!selected.length) return;
    const next = [...files, ...selected];
    if (documents.length + next.length > maxFiles) {
      setFileError("You can attach up to two files.");
    } else if (selected.some((file) => !isValidEvidenceFile(file))) {
      setFileError("Choose PDF, PNG or JPG files up to 5 MB each, with filenames of 200 characters or fewer.");
    } else {
      setFileError("");
      setFiles(next);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable || saving) return;
    const missing = competitionFields.find((field) => field.required && !values[field.key]?.trim());
    if (missing) {
      setError(`Enter or select ${missing.label.toLowerCase()}.`);
      return;
    }

    const cleaned = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    if (cleaned.title.length < 3) {
      setError("Enter a competition name of at least three characters.");
      return;
    }
    if (cleaned.prizeMoney && !/^\d{1,12}(\.\d{1,2})?$/.test(cleaned.prizeMoney)) {
      setError("Enter a prize amount with up to two decimal places.");
      return;
    }
    if ((cleaned.currency && !/^[A-Z]{3}$/.test(cleaned.currency)) || (cleaned.prizeMoney && !cleaned.currency)) {
      setError("Enter a three-letter currency code, such as INR.");
      return;
    }
    if (!cleaned.currency) delete cleaned.currency;

    const description = competitionFields
      .filter((field) => field.key !== "title" && cleaned[field.key])
      .map((field) => `${field.label}: ${cleaned[field.key]}`)
      .join("\n");
    setError("");
    setSaving(true);
    try {
      const evidence = await Promise.all(files.map(encodeEvidenceFile));
      const response = await fetch(`${api}/api/v1/achievements${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "COMPETITION", title: cleaned.title, description, values: cleaned, evidence, status: "SUBMITTED" }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setError(payload?.error?.message ?? "Unable to save this competition.");
        setSaving(false);
        return;
      }
      router.replace("/competitions");
    } catch {
      setError("The competition could not be saved. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <Header title="Competitions & Participation" />
      <div className={styles.content}>
        <Link href="/competitions" className={styles.back}>&larr; Back to competitions</Link>
        <section className={styles.card} aria-labelledby="competition-form-title">
          <header className={styles.heading}>
            <h2 id="competition-form-title">{editingId ? "Edit participation" : "Add new participation"}</h2>
            <p>Log your hackathons, CTFs, coding competitions, and results.</p>
          </header>

          <form onSubmit={(event) => void submit(event)}>
            {editable ? (
              <>
                <div className={styles.fields}>
                  {competitionFields.map((field) => {
                    const value = values[field.key] ?? "";
                    const id = `competition-${field.key}`;
                    if (field.key === "participation") return (
                      <fieldset className={styles.field} key={field.key}>
                        <legend>{field.label} <span aria-hidden="true">*</span></legend>
                        <div className={styles.radioGroup}>
                          {field.options?.map((option) => (
                            <label key={option}>
                              <input type="radio" name="participation" value={option} checked={value === option} onChange={() => update(field.key, option)} required />
                              {option}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                    return (
                      <div className={`${styles.field} ${field.fullWidth ? styles.fullWidth : ""}`} key={field.key}>
                        <label htmlFor={id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
                        {field.options ? (
                          <select id={id} required={field.required} value={value} onChange={(event) => update(field.key, event.target.value)}>
                            <option value="">Select {field.key === "competitionType" ? "type" : field.key}</option>
                            {value && !field.options.includes(value) && <option>{value}</option>}
                            {field.options.map((option) => <option key={option}>{option}</option>)}
                          </select>
                        ) : field.multiline ? (
                          <textarea id={id} rows={3} value={value} placeholder={field.placeholder} maxLength={field.maxLength} onChange={(event) => update(field.key, event.target.value)} />
                        ) : (
                          <input
                            id={id}
                            type="text"
                            inputMode={field.key === "prizeMoney" ? "decimal" : undefined}
                            value={value}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            required={field.required}
                            onChange={(event) => update(field.key, field.key === "currency" ? event.target.value.toUpperCase() : event.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <section className={styles.evidence} aria-labelledby="competition-evidence-heading">
                  <div>
                    <h3 id="competition-evidence-heading">Certificate &amp; photograph <span>Optional</span></h3>
                    <p id="competition-evidence-hint">Up to two PDF, PNG, or JPG files, 5 MB each.</p>
                  </div>
                  {documents.length + files.length < maxFiles && (
                    <label className={styles.chooseFile}>
                      Choose files
                      <input
                        type="file" multiple accept={evidenceAccept} disabled={saving}
                        aria-describedby="competition-evidence-hint"
                        onChange={(event) => {
                          addFiles(Array.from(event.target.files ?? []));
                          event.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  {fileError && <p className={styles.fileError} role="alert">{fileError}</p>}
                  {(documents.length > 0 || files.length > 0) && (
                    <ul className={styles.evidenceFiles}>
                      {documents.map((document) => (
                        <li className={styles.savedDocuments} key={document.id}>
                          <a href={`${api}/api/v1/achievements/${encodeURIComponent(editingId ?? "")}/documents/${document.id}`}>
                            {document.fileName}
                          </a>
                        </li>
                      ))}
                      {files.map((file, index) => (
                        <li className={styles.selectedFile} key={index}>
                          <span>{file.name}</span>
                          <button type="button" aria-label={`Remove ${file.name}`} disabled={saving}
                            onClick={() => { setFiles(files.filter((_, item) => item !== index)); setFileError(""); }}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : !error && <p className={styles.message} role="status">Loading competition details&hellip;</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}

            <footer className={styles.actions}>
              <Link href="/competitions" className={styles.cancel}>Cancel</Link>
              <button type="submit" className={styles.submit} disabled={!editable || saving}>
                {saving ? "Saving..." : "Save record"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
