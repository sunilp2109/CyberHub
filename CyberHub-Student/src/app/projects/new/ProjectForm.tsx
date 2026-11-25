"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Header from "@/components/Header/Header";
import EntryFields from "@/components/ActivityModule/EntryFields";
import styles from "@/components/ActivityModule/EntryForm.module.css";
import { legacyTechnologyField, projectFields } from "../fields";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SavedProject {
  id: string;
  title: string;
  type: string;
  status: string;
  metadata?: Record<string, string> | null;
}

export default function ProjectForm({ editingId }: { editingId?: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<SavedProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ready = !editingId || Boolean(record);

  useEffect(() => {
    if (!editingId) return;
    const controller = new AbortController();
    void fetch(`${api}/api/v1/achievements`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const { data } = await response.json() as { data: SavedProject[] };
        const project = data.find(({ id, type }) => id === editingId && type === "PROJECT");
        if (project?.status === "SUBMITTED") setRecord(project);
        else setError("This project is unavailable for editing.");
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Unable to load this project. Refresh to try again.");
      });
    return () => controller.abort();
  }, [editingId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || saving) return;

    const form = new FormData(event.currentTarget);
    const values = { ...record?.metadata };
    for (const { key } of projectFields) {
      const value = String(form.get(key) ?? "").trim();
      if (value) values[key] = key === "currency" ? value.toUpperCase() : value;
      else delete values[key];
    }
    if ((values.title?.length ?? 0) < 3 || !values.fundingAgency) {
      setError("Enter a project name of at least three characters and the funding agency.");
      return;
    }
    if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(values.amount ?? "")) {
      setError("Enter a funding amount of zero or more, with up to two decimal places.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(values.currency ?? "")) {
      setError("Enter a three-letter currency code, such as INR.");
      return;
    }

    const description = [...projectFields.slice(1), legacyTechnologyField]
      .filter((field) => values[field.key])
      .map((field) => `${field.label}: ${values[field.key]}`)
      .join("\n");
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`${api}/api/v1/achievements${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "PROJECT", title: values.title, values, description, status: "SUBMITTED" }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setError(payload?.error?.message ?? "The project could not be saved.");
        setSaving(false);
        return;
      }
      router.replace("/projects");
    } catch {
      setError("Unable to save the project. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <Header title="Projects & Funding" />
      <div className={styles.content}>
        <Link href="/projects" className={styles.back}>← Back to projects</Link>
        <section className={styles.card} aria-labelledby="project-form-heading">
          <header className={styles.heading}>
            <h2 id="project-form-heading">{editingId ? "Edit project" : "Add a project"}</h2>
            <p>Record your project and its funding. For an unfunded project, enter “None” as the funding agency and 0 as the amount.</p>
          </header>
          <form onSubmit={(event) => void submit(event)}>
            {ready ? (
              <EntryFields fields={projectFields} prefix="project" values={{ currency: "INR", ...record?.metadata, title: record?.title ?? "" }} />
            ) : !error && <p className={styles.message} role="status">Loading project…</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <footer className={styles.actions}>
              <Link href="/projects" className={styles.cancel}>Cancel</Link>
              <button type="submit" className={styles.submit} disabled={!ready || saving}>{saving ? "Saving…" : "Save project"}</button>
            </footer>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
