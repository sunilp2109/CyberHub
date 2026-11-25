"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Header from "@/components/Header/Header";
import { encodeEvidenceFile, evidenceAccept, isValidEvidenceFile } from "@/components/ActivityModule/evidence";
import EntryFields from "@/components/ActivityModule/EntryFields";
import styles from "@/components/ActivityModule/EntryForm.module.css";
import { internshipFields } from "../fields";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const evidenceSlots = [
  { kind: "offer-letter", label: "Offer letter" },
  { kind: "completion-certificate", label: "Completion certificate" },
] as const;

type EvidenceKind = typeof evidenceSlots[number]["kind"];
type SavedInternship = {
  id: string;
  type: string;
  title: string;
  status: string;
  metadata?: Record<string, string> | null;
  documents?: { id: string; fileName: string }[];
};

export default function InternshipForm({ editingId }: { editingId?: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<SavedInternship | null>(null);
  const [files, setFiles] = useState<Partial<Record<EvidenceKind, File>>>({});
  const [fileError, setFileError] = useState<Partial<Record<EvidenceKind, string>>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const ready = !editingId || Boolean(record);

  useEffect(() => {
    if (!editingId) return;
    const controller = new AbortController();
    void fetch(`${api}/api/v1/achievements`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const { data } = await response.json() as { data: SavedInternship[] };
        const internship = data.find(({ id, type }) => id === editingId && type === "INTERNSHIP");
        if (internship?.status === "SUBMITTED") setRecord(internship);
        else setError("This internship is unavailable for editing.");
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Unable to load this internship. Refresh to try again.");
      });
    return () => controller.abort();
  }, [editingId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || saving) return;

    const form = new FormData(event.currentTarget);
    const values = { ...record?.metadata };
    for (const { key } of internshipFields) {
      const value = String(form.get(key) ?? "").trim();
      if (value) values[key] = value;
      else delete values[key];
    }
    if ((values.title?.length ?? 0) < 3 || !values.company) {
      setError("Enter an internship title of at least three characters and the company or organisation.");
      return;
    }
    if (values.endDate && values.endDate < values.startDate) {
      setError("The end date must be on or after the start date.");
      return;
    }
    const description = internshipFields.slice(1)
      .filter((field) => values[field.key])
      .map((field) => `${field.label}: ${values[field.key]}`)
      .join("\n");

    setError("");
    setSaving(true);
    try {
      const evidence = await Promise.all(Object.entries(files).map(async ([kind, file]) => ({
        ...await encodeEvidenceFile(file), kind,
      })));
      const response = await fetch(`${api}/api/v1/achievements${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "INTERNSHIP", title: values.title, values, description, evidence, status: "SUBMITTED" }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setError(payload?.error?.message ?? "The internship could not be saved.");
        setSaving(false);
        return;
      }
      router.replace("/internships");
    } catch {
      setError("Unable to save the internship. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <Header title="Internships" />
      <div className={styles.content}>
        <Link href="/internships" className={styles.back}>← Back to internships</Link>
        <section className={styles.card} aria-labelledby="internship-form-heading">
          <header className={styles.heading}>
            <h2 id="internship-form-heading">{editingId ? "Edit internship" : "Add an internship"}</h2>
            <p>Record your role, organisation, and start date. Leave the end date blank if the internship is ongoing.</p>
          </header>

          <form onSubmit={(event) => void submit(event)}>
            {ready ? (
              <>
                <EntryFields fields={internshipFields} prefix="internship" values={{ ...record?.metadata, title: record?.title ?? "" }} />

                {evidenceSlots.map(({ kind, label }) => {
                  const saved = record?.documents?.find((document) => document.id.startsWith(`${kind}-`));
                  const file = files[kind];
                  const hint = `${kind}-hint`;
                  return (
                    <section className={styles.evidence} aria-labelledby={`${kind}-heading`} key={kind}>
                      <div>
                        <h3 id={`${kind}-heading`}>{label} <span>Optional</span></h3>
                        <p id={hint}>PDF, PNG, or JPG up to 5 MB.</p>
                      </div>
                      {saved ? (
                        <a className={styles.savedDocuments} href={`${api}/api/v1/achievements/${record?.id}/documents/${saved.id}`}>{saved.fileName}</a>
                      ) : file ? (
                        <div className={styles.selectedFile}>
                          <span>{file.name}</span>
                          <button type="button" disabled={saving} aria-label={`Remove ${label.toLowerCase()}`}
                            onClick={() => setFiles((current) => {
                              const next = { ...current };
                              delete next[kind];
                              return next;
                            })}>Remove</button>
                        </div>
                      ) : (
                        <label className={styles.chooseFile}>
                          Choose file
                          <input type="file" accept={evidenceAccept} disabled={saving}
                            aria-label={`Upload ${label.toLowerCase()}`} aria-describedby={hint}
                            onChange={(event) => {
                              const selected = event.target.files?.[0];
                              event.target.value = "";
                              if (!selected) return;
                              const valid = isValidEvidenceFile(selected);
                              setFileError((current) => ({ ...current, [kind]: valid ? "" : "Choose a PDF, PNG, or JPG file up to 5 MB, with a filename of up to 200 characters." }));
                              if (valid) setFiles((current) => ({ ...current, [kind]: selected }));
                            }}
                          />
                        </label>
                      )}
                      {fileError[kind] && <p className={styles.fileError} role="alert">{fileError[kind]}</p>}
                    </section>
                  );
                })}
              </>
            ) : !error && <p className={styles.message} role="status">Loading internship…</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}

            <footer className={styles.actions}>
              <Link href="/internships" className={styles.cancel}>Cancel</Link>
              <button type="submit" className={styles.submit} disabled={!ready || saving}>{saving ? "Saving…" : "Save internship"}</button>
            </footer>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
