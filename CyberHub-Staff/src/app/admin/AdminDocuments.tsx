"use client";

import { useEffect, useState } from "react";
import { apiUrl, Icon, Modal, useAdmin } from "./AdminShell";
import { Empty, PageHeader, Status, formatDate } from "./adminUi";
import s from "./admin.module.css";

type Evidence = { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt?: string };
type Decision = "APPROVED" | "REJECTED";
type Submission = {
  id: string; title: string; status: string; studentId: string; createdAt: string; reviewedAt?: string | null;
  student?: { registerNo?: string; department?: string | { name: string }; user?: { name?: string } };
  documents: Evidence[]; approvals?: { comment?: string | null }[];
};

export function useSubmissions() {
  const [records, setRecords] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl + "/api/v1/achievements", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const json = await response.json();
        if (!Array.isArray(json.data)) throw new Error();
        if (!controller.signal.aborted) setRecords(json.data);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load submissions. Try again."); });
    return () => controller.abort();
  }, [attempt]);
  function retry() { setError(""); setRecords(null); setAttempt((n) => n + 1); }
  return { records, error, retry, setRecords };
}

function statusLabel(status: string) {
  return ({ SUBMITTED: "Pending", APPROVED: "Approved", REJECTED: "Rejected" } as Record<string, string>)[status] ?? status;
}

function departmentName(record: Submission) {
  const department = record.student?.department;
  return typeof department === "string" ? department : department?.name ?? "";
}

function EvidencePreview({ record, file, onClose, onReview }: {
  record: Submission; file: Evidence; onClose: () => void; onReview: (decision: Decision, comment: string) => Promise<void>;
}) {
  const [preview, setPreview] = useState<{ url: string; type: string }>();
  const [previewError, setPreviewError] = useState(false);
  const [action, setAction] = useState<Decision>();
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const endpoint = apiUrl + "/api/v1/achievements/" + encodeURIComponent(record.id) + "/documents/" + encodeURIComponent(file.id);

  useEffect(() => {
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
  }, [endpoint]);

  return <Modal title={file.fileName} onClose={() => { if (!saving) onClose(); }}>
    <div className={s.previewHeader}><p>{record.title} · {record.student?.user?.name ?? "Student"}</p><Status value={statusLabel(record.status)} /></div>
    {previewError ? <p className={s.error} role="alert">The file could not be opened. It may have been removed or your session may have expired.</p>
      : !preview ? <p role="status">Loading preview…</p>
      : preview.type === "application/pdf" ? <iframe className={s.preview} src={preview.url} title={"Preview of " + file.fileName} />
      : /^image\/(png|jpeg)$/.test(preview.type) ? (
        // eslint-disable-next-line @next/next/no-img-element -- An authenticated browser Blob URL cannot be optimized by Next.js.
        <img className={s.previewImage} src={preview.url} alt={file.fileName} />
      ) : <p>Inline preview is unavailable for this format.</p>}
    {record.approvals?.[0]?.comment && <p className={s.reviewNote}><strong>Review feedback</strong> {record.approvals[0].comment}</p>}
    {preview && <a className={s.secondary} href={preview.url} download={file.fileName}><Icon name="download" size={16} />Download file</a>}
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

export default function AdminDocuments() {
  const { records, error, retry, setRecords } = useSubmissions();
  const { notice } = useAdmin();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [selection, setSelection] = useState<{ recordId: string; file: Evidence }>();
  const list = (records ?? []).flatMap((record) => (record.documents ?? []).map((file) => ({ record, file })));
  const departments = Array.from(new Set(list.map(({ record }) => departmentName(record)).filter(Boolean))).sort();
  const query = search.trim().toLowerCase();
  const filtered = list.filter(({ record, file }) => (!status || record.status === status) && (!department || departmentName(record) === department)
    && (!query || [record.title, file.fileName, record.student?.user?.name, record.student?.registerNo].some((value) => value?.toLowerCase().includes(query))));
  const selectedRecord = records?.find(({ id }) => id === selection?.recordId);

  async function review(action: Decision, comment: string) {
    if (!selectedRecord) return;
    const response = await fetch(apiUrl + "/api/v1/achievements/" + encodeURIComponent(selectedRecord.id) + "/review", {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, comment: comment || undefined }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error?.message ?? "Could not save the decision. Try again.");
    setRecords((previous) => previous?.map((record) => record.id === selectedRecord.id
      ? { ...record, status: json?.data?.status ?? action, approvals: json?.data?.approvals ?? [{ comment }] } : record) ?? null);
    notice(action === "APPROVED" ? "Submission approved." : "Submission rejected. Feedback is available to the student.");
    setSelection(undefined);
  }

  return <>
    <PageHeader title="Document Management" description="Review evidence attached to student achievements. Each decision updates the linked submission." actions={<button className={s.secondary} onClick={retry} disabled={!records && !error}>Refresh queue</button>} />
    <div className={s.metricGrid}>{[["Total attachments", ""], ["Pending review", "SUBMITTED"], ["Approved", "APPROVED"], ["Rejected", "REJECTED"]].map(([label, key]) =>
      <div className={s.metric} key={label}><span className={s.metricIcon}><Icon name="file" /></span><span>{label}</span><strong>{records ? list.filter(({ record }) => !key || record.status === key).length : "—"}</strong></div>)}</div>
    {error ? <div role="alert" className={s.error}>{error} <button className={s.secondary} onClick={retry}>Retry</button></div>
      : !records ? <p className={s.loading} role="status">Loading document queue…</p>
      : <section className={s.panel} aria-label="Document queue">
        <div className={s.toolbar}>
          <label className={s.field}><span>Search documents</span><input type="search" placeholder="File, submission, or student" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <label className={s.field}><span>Review status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>
            {["SUBMITTED", "APPROVED", "REJECTED"].map((key) => <option value={key} key={key}>{statusLabel(key)}</option>)}</select></label>
          <label className={s.field}><span>Department</span><select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">All</option>
            {departments.map((key) => <option key={key}>{key}</option>)}</select></label>
        </div>
        {filtered.length ? <div className={s.tableWrap} tabIndex={0} aria-label="Scrollable document table"><table className={s.table} data-pinned-actions>
          <thead><tr>{["File", "Student", "Department", "Uploaded", "Status", "Actions"].map((title) => <th key={title} scope="col">{title}</th>)}</tr></thead>
          <tbody>{filtered.map(({ record, file }) => <tr key={file.id}><td><strong>{file.fileName}</strong><small>{record.title}</small></td>
            <td>{record.student?.user?.name ?? "—"}<small>{record.student?.registerNo}</small></td><td>{departmentName(record) || "—"}</td>
            <td>{formatDate(file.createdAt ?? record.createdAt)}</td><td><Status value={statusLabel(record.status)} /></td>
            <td><button className={s.secondary} onClick={() => setSelection({ recordId: record.id, file })} aria-label={"Open " + file.fileName}>Open</button></td></tr>)}</tbody>
        </table></div> : <Empty title={list.length ? "No matching documents" : "No attachments to review"} detail={list.length ? "Change the search or filters to see more files." : "Files appear here when students submit achievements with evidence."} />}
      </section>}
    {selection && selectedRecord && <EvidencePreview key={selection.file.id} record={selectedRecord} file={selection.file} onClose={() => setSelection(undefined)} onReview={review} />}
  </>;
}
