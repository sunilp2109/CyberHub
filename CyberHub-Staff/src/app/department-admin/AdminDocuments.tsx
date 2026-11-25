"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, Modal, useAdmin } from "./AdminShell";
import { adminHref } from "./adminData";
import { achievementTypes, apiUrl, type Decision, type Evidence, type Submission } from "./departmentApi";
import { Empty, PageHeader, Status, formatDate } from "./adminUi";
import s from "./admin.module.css";

function statusLabel(status: string) {
  return ({ SUBMITTED: "Pending", APPROVED: "Approved", REJECTED: "Rejected" } as Record<string, string>)[status] ?? status;
}

function EvidencePreview({ record, file, onClose, onReview }: {
  record: Submission; file?: Evidence; onClose: () => void; onReview: (decision: Decision, comment: string) => Promise<void>;
}) {
  const [preview, setPreview] = useState<{ url: string; type: string }>();
  const [previewError, setPreviewError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState<Decision>();
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const endpoint = file ? apiUrl + "/api/v1/achievements/" + encodeURIComponent(record.id) + "/documents/" + encodeURIComponent(file.id) : "";

  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    let url: string | undefined;
    fetch(endpoint, { credentials: "include", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setPreview({ url, type: blob.type });
    }).catch(() => { if (!controller.signal.aborted) setPreviewError(true); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [endpoint, attempt]);

  return <Modal title={file?.fileName ?? record.title} onClose={() => { if (!saving) onClose(); }}>
    <div className={s.previewHeader}><p>{record.title} · {record.student?.user?.name ?? "Student"}</p><Status value={statusLabel(record.status)} /></div>
    {!file ? <div className={s.reviewNote}><p>{achievementTypes[record.type] ?? record.type} · {formatDate(record.submittedAt ?? record.createdAt)}</p>{record.description && <p>{record.description}</p>}</div>
      : previewError ? <div className={s.error} role="alert">The file could not be opened. <button className={s.secondary} onClick={() => { setPreviewError(false); setAttempt((n) => n + 1); }}>Retry preview</button></div>
      : !preview ? <p role="status">Loading preview…</p>
      : preview.type === "application/pdf" ? <iframe className={s.preview} src={preview.url} title={"Preview of " + file.fileName} />
      : /^image\/(png|jpeg)$/.test(preview.type) ? (
        // eslint-disable-next-line @next/next/no-img-element -- An authenticated browser Blob URL cannot be optimized by Next.js.
        <img className={s.previewImage} src={preview.url} alt={file.fileName} />
      ) : <p>Inline preview is unavailable for this format.</p>}
    {record.approvals?.length ? <section><h3>Verification history</h3><ol className={s.historyList}>{record.approvals.map((entry, i) => <li key={i}><Status value={statusLabel(entry.action)} /> {formatDate(entry.createdAt ?? record.reviewedAt ?? "")}{entry.comment && <p>{entry.comment}</p>}</li>)}</ol></section> : <p className={s.reviewNote}>No verification decisions yet.</p>}
    {preview && file && <a className={s.secondary} href={preview.url} download={file.fileName}><Icon name="download" size={16} />Download file</a>}
    {record.status === "SUBMITTED" && (action ? <form className={s.form} onSubmit={async (event) => {
      event.preventDefault();
      if (action === "REJECTED" && !comment.trim()) { setError("Enter a reason so the student knows what to fix."); return; }
      setError(""); setSaving(true);
      try { await onReview(action, comment.trim()); }
      catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the decision."); }
      finally { setSaving(false); }
    }}>
      <p className={s.reviewNote}>This decision applies to the entire submission and its attachments.</p>
      <label className={s.field}><span>{action === "REJECTED" ? "Rejection reason" : "Approval note (optional)"}</span>
        <textarea rows={3} maxLength={500} required={action === "REJECTED"} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.formActions}><button type="button" className={s.secondary} disabled={saving} onClick={() => { setAction(undefined); setError(""); }}>Back</button>
        <button className={action === "REJECTED" ? s.danger : s.primary} disabled={saving}>{saving ? "Saving…" : action === "REJECTED" ? "Confirm rejection" : "Confirm approval"}</button></div>
    </form> : <div className={s.formActions}><button className={s.danger} onClick={() => setAction("REJECTED")}>Reject submission</button>
      <button className={s.primary} onClick={() => setAction("APPROVED")}>Approve submission</button></div>)}
  </Modal>;
}

type ReviewItem = { record: Submission; file?: Evidence };

export default function ReviewQueue({ documents = false }: { documents?: boolean }) {
  const { achievements, directory, notice } = useAdmin();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [studentOverride, setStudent] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<{ id: string; file?: Evidence }>();
  const student = studentOverride ?? params.get("student") ?? "";
  const records = achievements.data ?? [];
  const list: ReviewItem[] = records.flatMap((record) => documents ? (record.documents ?? []).map((file) => ({ record, file })) : [{ record }]);
  const scoped = list.filter(({ record }) => !student || record.studentId === student);
  const query = search.trim().toLowerCase();
  const filtered = scoped.filter(({ record, file }) => (!status || record.status === status) && (!category || record.type === category)
    && (!query || [record.title, file?.fileName, record.student?.user?.name, record.student?.registerNo].some((value) => value?.toLowerCase().includes(query))))
    .sort((a, b) => sort === "student"
      ? (a.record.student?.user?.name ?? "").localeCompare(b.record.student?.user?.name ?? "")
      : (sort === "newest" ? -1 : 1) * (a.file?.createdAt ?? a.record.submittedAt ?? a.record.createdAt).localeCompare(b.file?.createdAt ?? b.record.submittedAt ?? b.record.createdAt));
  const studentChoices = new Map((directory.data ?? []).map(({ id, user }) => [id, user.name]));
  for (const record of records) {
    if (!studentChoices.has(record.studentId)) studentChoices.set(record.studentId, record.student?.user?.name ?? "Student");
  }
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages - 1);
  const selected = records.find(({ id }) => id === selection?.id);
  const breakdown = Array.from(new Set(scoped.map(({ record }) => record.type))).map((key) => ({
    label: achievementTypes[key] ?? key, count: scoped.filter(({ record }) => record.type === key).length,
  })).sort((a, b) => b.count - a.count);

  async function review(id: string, action: Decision, comment: string) {
    const response = await fetch(apiUrl + "/api/v1/achievements/" + encodeURIComponent(id) + "/review", {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, comment: comment || undefined }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error?.message ?? "Could not save the decision.");
    const reviewData = { status: json?.data?.status ?? action, reviewedAt: json?.data?.reviewedAt ?? new Date().toISOString(),
      approvals: json?.data?.approvals ?? [{ action, comment }] };
    achievements.setData((previous) => previous?.map((record) => record.id === id ? { ...record, ...reviewData } : record) ?? null);
    directory.refresh();
    notice(action === "APPROVED" ? "Submission approved." : "Submission rejected. Remarks are available to the student.");
    setSelection(undefined);
  }

  return <>
    <PageHeader title={documents ? "Document Verification" : "Achievements"} description={documents
      ? "Review supporting evidence for student submissions in your department."
      : "Browse student submissions, track verification status, and review achievements."}
      actions={<button className={s.secondary} onClick={achievements.refresh} disabled={!achievements.data && !achievements.error}>Refresh</button>} />
    <div className={s.metricGrid}>{[[documents ? "Total documents" : "Total achievements", ""], ["Pending", "SUBMITTED"], ["Approved", "APPROVED"], ["Rejected", "REJECTED"]].map(([label, key]) =>
      <div className={s.metric} key={label}><span className={s.metricIcon}><Icon name={documents ? "file" : "badge"} /></span><span>{label}</span>
        <strong>{achievements.data ? scoped.filter(({ record }) => !key || record.status === key).length : "—"}</strong></div>)}</div>
    {achievements.error ? <div className={s.error} role="alert">{achievements.error} <button className={s.secondary} onClick={achievements.refresh}>Retry</button></div>
      : !achievements.data ? <p className={s.loading} role="status"><span className={s.skeleton} />Loading {documents ? "documents" : "achievements"}…</p>
      : <>
        <section className={s.panel} aria-label={documents ? "Document queue" : "Achievement submissions"}>
          <div className={s.toolbar}>
            <label className={s.field}><span>Search {documents ? "documents" : "achievements"}</span><input type="search" placeholder="Title, name, or register number" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></label>
            <label className={s.field}><span>Student</span><select value={student} onChange={(e) => { setStudent(e.target.value); setPage(0); }}><option value="">All students</option>
              {student && !studentChoices.has(student) && <option value={student}>Selected student</option>}
              {Array.from(studentChoices, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)).map(({ id, name }) => <option value={id} key={id}>{name}</option>)}</select></label>
            <label className={s.field}><span>Verification status</span><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">All statuses</option>
              {["SUBMITTED", "APPROVED", "REJECTED"].map((key) => <option value={key} key={key}>{statusLabel(key)}</option>)}</select></label>
            <label className={s.field}><span>Category</span><select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}><option value="">All categories</option>
              {Object.entries(achievementTypes).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
            <label className={s.field}><span>Sort by</span><select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}>
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="student">Student name</option></select></label>
          </div>
          {filtered.length ? <div className={s.tableWrap} tabIndex={0} aria-label="Scrollable submissions table"><table className={s.table} data-pinned-actions>
            <thead><tr>{[documents ? "Document" : "Achievement", "Student", "Category", documents ? "Uploaded" : "Submitted", "Status", "Actions"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{filtered.slice(currentPage * 8, (currentPage + 1) * 8).map(({ record, file }) => <tr key={file?.id ?? record.id}>
              <td data-column="description"><strong>{file?.fileName ?? record.title}</strong>{file && <small>{record.title}</small>}</td>
              <td><Link className={s.textLink} href={adminHref("students") + "/" + encodeURIComponent(record.studentId)}>{record.student?.user?.name ?? "Student profile"}</Link><small>{record.student?.registerNo}</small></td>
              <td>{achievementTypes[record.type] ?? record.type}</td><td>{formatDate(file?.createdAt ?? record.submittedAt ?? record.createdAt)}</td>
              <td><Status value={statusLabel(record.status)} /></td><td><button className={s.secondary} onClick={() => setSelection({ id: record.id, file })}
                aria-label={"Open " + (file?.fileName ?? record.title)}>{file ? "Preview" : "View"}</button></td>
            </tr>)}</tbody>
          </table></div> : <Empty title={list.length ? "No matching submissions" : documents ? "No documents to verify" : "No submitted achievements"}
            detail={list.length ? "Change your filters or search term." : "Student submissions will appear here when they are available."} />}
          <div className={s.pagination}><span>{filtered.length} results · Page {currentPage + 1} of {pages}</span><div className={s.actions}>
            <button className={s.secondary} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <button className={s.secondary} disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
        </section>
        {!documents && <section className={s.card}><h2>Achievements by category</h2>
          {breakdown.length ? <div className={s.categoryGrid}>{breakdown.map(({ label, count }) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
            : <p>Category totals appear after students submit achievements.</p>}
        </section>}
      </>}
    {selected && selection && <EvidencePreview key={selection.file?.id ?? selection.id} record={selected} file={selection.file}
      onClose={() => setSelection(undefined)} onReview={(action, comment) => review(selected.id, action, comment)} />}
  </>;
}
