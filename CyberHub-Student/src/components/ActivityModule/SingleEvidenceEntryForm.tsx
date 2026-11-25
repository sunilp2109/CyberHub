"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Header from "@/components/Header/Header";
import { encodeEvidenceFile, evidenceAccept, isValidEvidenceFile } from "@/components/ActivityModule/evidence";
import EntryFields, { type EntryField } from "./EntryFields";
import styles from "@/components/ActivityModule/EntryForm.module.css";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SavedDocument { id: string; fileName: string }

interface SavedEntry {
  id: string;
  type: string;
  title: string;
  status: string;
  metadata?: Record<string, string> | null;
  documents?: SavedDocument[];
}

interface EntryConfig {
  type: "CERTIFICATE" | "PUBLICATION" | "PATENT" | "AWARD";
  moduleTitle: string;
  entryLabel: string;
  path: string;
  prefix: string;
  intro: string;
  evidenceTitle: string;
  fields: EntryField[];
  legacyFields?: EntryField[];
}

export default function SingleEvidenceEntryForm({ editingId, config }: { editingId?: string; config: EntryConfig }) {
  const { type, moduleTitle, entryLabel, path, prefix, intro, evidenceTitle, fields, legacyFields = [] } = config;
  const article = /^[aeiou]/i.test(entryLabel) ? "an" : "a";
  const router = useRouter();
  const [record, setRecord] = useState<SavedEntry | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);
  const editable = !editingId || Boolean(record);
  const documents = record?.documents ?? [];

  useEffect(() => {
    if (!editingId) return;
    const controller = new AbortController();
    void fetch(`${api}/api/v1/achievements`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const { data } = await response.json() as { data: SavedEntry[] };
        const record = data.find((item) => item.id === editingId && item.type === type);
        if (record?.status !== "SUBMITTED") {
          setError(`This ${entryLabel} is unavailable for editing.`);
          return;
        }
        setRecord(record);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(`Unable to load the ${entryLabel}. Refresh to try again.`);
      });
    return () => controller.abort();
  }, [editingId, type, entryLabel]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable || saving) return;

    const form = new FormData(event.currentTarget);
    const cleanValues = { ...record?.metadata };
    for (const { key, multiple } of fields) {
      const value = multiple ? form.getAll(key).join(", ") : String(form.get(key) ?? "").trim();
      if (value) cleanValues[key] = value;
      else delete cleanValues[key];
    }
    const missing = fields.find((field) => field.required && !cleanValues[field.key]);
    if (missing) {
      setError(`Enter or select ${missing.label.toLowerCase()}.`);
      return;
    }
    if ((cleanValues.title?.length ?? 0) < 3) {
      setError("Enter a title of at least three characters.");
      return;
    }
    const urlField = fields.find((field) => field.type === "url");
    if (urlField && cleanValues[urlField.key] && !/^https?:\/\//i.test(cleanValues[urlField.key])) {
      setError("Enter a link starting with https:// or http://.");
      return;
    }
    const description = [...fields.filter((field) => field.key !== "title"), ...legacyFields]
      .filter((field) => cleanValues[field.key])
      .map((field) => `${field.label}: ${cleanValues[field.key]}`)
      .join("\n");

    setError("");
    setSaving(true);
    try {
      const evidence = file ? [await encodeEvidenceFile(file)] : [];
      const response = await fetch(`${api}/api/v1/achievements${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, title: cleanValues.title, values: cleanValues, description, evidence, status: "SUBMITTED",
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setError(payload?.error?.message ?? `The ${entryLabel} could not be saved.`);
        setSaving(false);
        return;
      }
      router.replace(path);
    } catch {
      setError(`Unable to save the ${entryLabel}. Check your connection and try again.`);
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <Header title={moduleTitle} />
      <div className={styles.content}>
        <Link href={path} className={styles.back}>← Back to {moduleTitle.toLowerCase()}</Link>
        <section className={styles.card} aria-labelledby="entry-form-heading">
          <header className={styles.heading}>
            <h2 id="entry-form-heading">{editingId ? `Edit ${entryLabel}` : `Add ${article} ${entryLabel}`}</h2>
            <p>{intro}</p>
          </header>

          <form onSubmit={(event) => void submit(event)}>
            {editable ? (
              <>
                <EntryFields fields={fields} prefix={prefix} values={{ ...record?.metadata, title: record?.title ?? "" }} />

                <section className={styles.evidence} aria-labelledby="evidence-heading">
                  <div>
                    <h3 id="evidence-heading">{evidenceTitle} <span>Optional</span></h3>
                    <p id="evidence-hint">One PDF, PNG, or JPG file, up to 5 MB.</p>
                  </div>
                  {documents.length > 0 ? (
                    <ul className={styles.savedDocuments}>
                      {documents.map((document) => (
                        <li key={document.id}>
                          <a href={`${api}/api/v1/achievements/${encodeURIComponent(editingId ?? "")}/documents/${document.id}`}>
                            {document.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : file ? (
                    <div className={styles.selectedFile}>
                      <span>{file.name}</span>
                      <button type="button" onClick={() => setFile(null)} disabled={saving}>Remove</button>
                    </div>
                  ) : (
                    <label className={styles.chooseFile}>
                      Choose file
                      <input
                        type="file" accept={evidenceAccept} disabled={saving} aria-describedby="evidence-hint"
                        onChange={(event) => {
                          const selected = event.target.files?.[0];
                          event.target.value = "";
                          if (!selected) return;
                          const valid = isValidEvidenceFile(selected);
                          setFileError(valid ? "" : "Choose a PDF, PNG, or JPG file up to 5 MB, with a filename of up to 200 characters.");
                          if (valid) setFile(selected);
                        }}
                      />
                    </label>
                  )}
                  {fileError && <p className={styles.fileError} role="alert">{fileError}</p>}
                </section>
              </>
            ) : !error && <p className={styles.message} role="status">Loading {entryLabel}…</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}

            <footer className={styles.actions}>
              <Link className={styles.cancel} href={path}>Cancel</Link>
              <button className={styles.submit} type="submit" disabled={!editable || saving}>
                {saving ? "Saving…" : `Save ${entryLabel}`}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
