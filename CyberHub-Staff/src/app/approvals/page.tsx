"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import styles from "./approvals.module.css";
import type { ApprovalStatus } from "@/lib/studentData";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ReviewRecord {
  id: string;
  title: string;
  type: string;
  description: string | null;
  status: ApprovalStatus;
  submittedAt: string | null;
  createdAt: string;
  student: { registerNo: string; department: string; user: { name: string } };
  documents: { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt?: string }[];
  approvals: { action: ApprovalStatus; comment?: string | null }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const cls =
    status === "APPROVED" ? styles.badgeApproved :
    status === "REJECTED" ? styles.badgeRejected :
    status === "DRAFT"    ? styles.badgeDraft    : styles.badgePending;
  const label =
    status === "SUBMITTED" ? "Pending" : status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className={styles.skeletonRow}>
          <td><div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}><div className={styles.skeletonCircle} /><div className={styles.skeleton} style={{ width: 100 }} /></div></td>
          <td><div className={styles.skeleton} style={{ width: 50 }} /></td>
          <td><div className={styles.skeleton} style={{ width: 160 }} /></td>
          <td><div className={styles.skeleton} style={{ width: 80 }} /></td>
          <td><div className={styles.skeleton} style={{ width: 70 }} /></td>
          <td><div className={styles.skeleton} style={{ width: 65 }} /></td>
          <td><div className={styles.skeleton} style={{ width: 80 }} /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

const PAGE_SIZE = 7;

type Toast = { msg: string; type: "success" | "error" } | null;

export default function ApprovalsPage() {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [tabFilter, setTabFilter]   = useState<"ALL" | ApprovalStatus>("ALL");

  // Pagination
  const [page, setPage] = useState(1);

  // Panel / modals
  const [panelRecord, setPanelRecord] = useState<ReviewRecord | null>(null);
  const [approveTarget, setApproveTarget] = useState<ReviewRecord | null>(null);
  const [rejectTarget,  setRejectTarget]  = useState<ReviewRecord | null>(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [rejectError,  setRejectError]    = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRecords = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/achievements`, { credentials: "include", signal });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { data: ReviewRecord[] };
      setRecords(payload.data);
    } catch {
      if (!signal?.aborted) setLoadError("Unable to load the review queue.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return loadRecords(controller.signal);
    });
    return () => controller.abort();
  }, [loadRecords]);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const categories = [...new Set(records.map((record) => record.type))].sort();
  const departments = [...new Set(records.map((record) => record.student.department))].sort();
  const years = [...new Set(records.map((record) => (record.submittedAt ?? record.createdAt).slice(0, 4)))].sort().reverse();

  // Stats (computed from role-scoped, NOT filtered)
  const stats = useMemo(() => ({
    total:   records.length,
    pending: records.filter((r) => r.status === "SUBMITTED").length,
    approved: records.filter((r) => r.status === "APPROVED").length,
    rejected: records.filter((r) => r.status === "REJECTED").length,
  }), [records]);

  // Filtered
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      const matchSearch = !q || r.student.user.name.toLowerCase().includes(q) || r.student.registerNo.toLowerCase().includes(q);
      const matchCat  = !catFilter  || r.type   === catFilter;
      const matchDept = !deptFilter || r.student.department === deptFilter;
      const matchYear = !yearFilter || (r.submittedAt ?? r.createdAt).slice(0, 4) === yearFilter;
      const matchTab  = tabFilter === "ALL" || r.status === tabFilter;
      return matchSearch && matchCat && matchDept && matchYear && matchTab;
    });
  }, [records, search, catFilter, deptFilter, yearFilter, tabFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = useCallback(() => {
    setSearch(""); setCatFilter(""); setDeptFilter(""); setYearFilter(""); setTabFilter("ALL"); setPage(1);
  }, []);

  const handleTabChange = (t: "ALL" | ApprovalStatus) => { setTabFilter(t); setPage(1); };

  const submitDecision = async (target: ReviewRecord, action: "APPROVED" | "REJECTED", comment?: string) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/achievements/${target.id}/review`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        showToast(payload?.error?.message ?? "Unable to save the review.", "error");
        return;
      }
      const updated = { ...target, status: action, approvals: [{ action, comment }] };
      setRecords((current) => current.map((record) => record.id === target.id ? updated : record));
      setPanelRecord((current) => current?.id === target.id ? updated : current);
      setPage(1);
      setApproveTarget(null);
      setRejectTarget(null);
      showToast(action === "APPROVED" ? "Submission approved." : "Submission rejected.");
    } catch {
      showToast("Unable to reach the review service. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openRejectModal = (record: ReviewRecord) => {
    setRejectTarget(record);
    setRejectReason("");
    setRejectError(false);
  };

  return (
    <MainLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Approvals" }]} userName="Staff">
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Student Approvals</h1>
          <p className={styles.pageSubtitle}>Review and manage student academic achievement submissions.</p>
        </div>
      </div>

      {/* Demo Role Switcher */}
      {loadError && (
        <p role="alert">{loadError} <button type="button" onClick={() => void loadRecords()}>Retry</button></p>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Student Records</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Pending Approvals</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{stats.approved}</div>
            <div className={styles.statLabel}>Approved Records</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconRed}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{stats.rejected}</div>
            <div className={styles.statLabel}>Rejected Records</div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className={styles.card}>
        {/* Tabs */}
        <div className={styles.tabs}>
          {([["ALL","All"], ["SUBMITTED","Pending"], ["APPROVED","Approved"], ["REJECTED","Rejected"]] as [string, string][]).map(([val, lbl]) => (
            <button key={val} className={`${styles.tab} ${tabFilter === val ? styles.activeTab : ""}`} onClick={() => handleTabChange(val as "ALL" | ApprovalStatus)}>{lbl}</button>
          ))}
        </div>

        {/* Filters */}
        <div className={styles.filtersBar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input className={styles.searchInput} placeholder="Search student name or reg. no…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className={styles.filterSelect} value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={styles.filterSelect} value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
            <option value="">All Depts</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className={styles.filterSelect} value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}>
            <option value="">All Submission Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className={styles.resetBtn} onClick={resetFilters}>Reset</button>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.recordsTable}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Dept</th>
                <th>Achievement</th>
                <th>Category</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <div className={styles.emptyTitle}>No records found</div>
                      <div className={styles.emptyDesc}>Try adjusting your search or filters.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((r) => {
                  const canReview = r.status === "SUBMITTED";
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className={styles.studentCell}>
                          <div className={styles.studentAvatar}>{initials(r.student.user.name)}</div>
                          <div>
                            <div className={styles.studentName}>{r.student.user.name}</div>
                            <div className={styles.studentReg}>{r.student.registerNo}</div>
                          </div>
                        </div>
                      </td>
                      <td>{r.student.department}</td>
                      <td><div className={styles.achievementName}>{r.title}</div></td>
                      <td><span className={styles.catBadge}>{r.type}</span></td>
                      <td><span className={styles.dateCell}>{fmtDate((r.submittedAt ?? r.createdAt))}</span></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <div className={styles.actionCell}>
                          <button className={styles.actionBtn} onClick={() => setPanelRecord(records.find((x) => x.id === r.id) ?? r)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                          </button>
                          <button
                            className={styles.reviewBtn}
                            disabled={!canReview}
                            onClick={() => { setPanelRecord(records.find((x) => x.id === r.id) ?? r); }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className={styles.pagination}>
            <span className={styles.paginInfo}>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
            </span>
            <div className={styles.paginBtns}>
              <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`${styles.pageBtn} ${p === page ? styles.activePage : ""}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Panel ── */}
      {panelRecord && (
        <>
          <div className={styles.panelOverlay} onClick={() => setPanelRecord(null)} />
          <aside className={styles.detailPanel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Record Detail</span>
              <button className={styles.panelClose} onClick={() => setPanelRecord(null)}>✕</button>
            </div>
            <div className={styles.panelBody}>
              {/* Student Info */}
              <div className={styles.panelSection}>
                <div className={styles.panelSectionTitle}>Student Information</div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}><div className={styles.infoLabel}>Full Name</div><div className={styles.infoValue}>{panelRecord.student.user.name}</div></div>
                  <div className={styles.infoItem}><div className={styles.infoLabel}>Reg. Number</div><div className={styles.infoValue}>{panelRecord.student.registerNo}</div></div>
                  <div className={styles.infoItem}><div className={styles.infoLabel}>Department</div><div className={styles.infoValue}>{panelRecord.student.department}</div></div>
                  <div className={styles.infoItem}><div className={styles.infoLabel}>Status</div><div className={styles.infoValue}><StatusBadge status={panelRecord.status} /></div></div>
                </div>
              </div>

              {/* Achievement Info */}
              <div className={styles.panelSection}>
                <div className={styles.panelSectionTitle}>Achievement Information</div>
                <div className={styles.infoGrid}>
                  <div className={`${styles.infoItem} ${styles.infoValueFull}`} style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.infoLabel}>Title</div>
                    <div className={styles.infoValue}>{panelRecord.title}</div>
                  </div>
                  <div className={styles.infoItem}><div className={styles.infoLabel}>Category</div><div className={styles.infoValue}><span className={styles.catBadge}>{panelRecord.type}</span></div></div>
                  <div className={styles.infoItem}><div className={styles.infoLabel}>Submitted</div><div className={styles.infoValue}>{fmtDate(panelRecord.submittedAt ?? panelRecord.createdAt)}</div></div>
                  <div className={`${styles.infoItem} ${styles.infoValueFull}`} style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.infoLabel}>Description</div>
                    <div className={styles.infoValue}>{panelRecord.description}</div>
                  </div>
                  {panelRecord.status === "REJECTED" && panelRecord.approvals[0]?.comment && (
                    <div className={`${styles.infoItem} ${styles.infoValueFull}`} style={{ gridColumn: "1 / -1" }}>
                      <div className={styles.infoLabel} style={{ color: "var(--negative)" }}>Rejection Reason</div>
                      <div className={styles.infoValue} style={{ color: "var(--negative)", background: "var(--negative-surface)", padding: "0.5rem 0.7rem", borderRadius: "var(--radius-sm)" }}>{panelRecord.approvals[0]?.comment}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className={styles.panelSection}>
                <div className={styles.panelSectionTitle}>Supporting Documents</div>
                {panelRecord.documents.length === 0 ? (
                  <div className={styles.docPlaceholder}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, display: "block", margin: "0 auto 0.5rem" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    No documents uploaded for this submission.
                  </div>
                ) : (
                  panelRecord.documents.map((doc) => (
                    <div key={doc.id} className={styles.docItem}>
                      <div className={`${styles.docIcon} ${doc.mimeType === "application/pdf" ? styles.docIconPDF : styles.docIconIMG}`}>
                        {doc.mimeType === "application/pdf" ? "PDF" : "FILE"}
                      </div>
                      <div className={styles.docInfo}>
                        <div className={styles.docName}>
                          {["COMPETITION", "CERTIFICATE", "INTERNSHIP", "PUBLICATION", "PATENT", "AWARD"].includes(panelRecord.type) ? (
                            <a href={`${API_URL}/api/v1/achievements/${panelRecord.id}/documents/${doc.id}`}>{doc.fileName}</a>
                          ) : doc.fileName}
                        </div>
                        <div className={styles.docMeta}>{doc.mimeType === "application/pdf" ? "PDF" : "FILE"} · {Math.ceil(doc.sizeBytes / 1024)} KB · Uploaded {doc.createdAt ? fmtDate(doc.createdAt) : "Unknown date"}</div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Panel Actions */}
            <div className={styles.panelActions}>
              {panelRecord.status === "SUBMITTED" ? (
                <>
                  <button className={styles.btnApprove} onClick={() => setApproveTarget(panelRecord)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Approve
                  </button>
                  <button className={styles.btnReject} onClick={() => openRejectModal(panelRecord)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Reject
                  </button>
                </>
              ) : (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 auto", textAlign: "center" }}>
                  Review actions are only available for <strong>Pending</strong> submissions.
                </p>
              )}
            </div>
          </aside>
        </>
      )}

      {/* ── Approve Confirm Modal ── */}
      {approveTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Confirm Approval</span>
              <button className={styles.modalClose} onClick={() => setApproveTarget(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalInfo}>
                <strong>{approveTarget.student.user.name}</strong> ({approveTarget.student.registerNo})<br />
                Achievement: <strong>{approveTarget.title}</strong><br />
                Category: {approveTarget.type}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setApproveTarget(null)}>Cancel</button>
              <button className={styles.btnConfirmApprove} disabled={saving} onClick={() => void submitDecision(approveTarget, "APPROVED")}>Confirm Approval</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Reject Submission</span>
              <button className={styles.modalClose} onClick={() => setRejectTarget(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalInfo}>
                <strong>{rejectTarget.student.user.name}</strong> ({rejectTarget.student.registerNo})<br />
                Achievement: <strong>{rejectTarget.title}</strong>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rejectReason">Rejection Reason <span style={{ color: "var(--negative)" }}>*</span></label>
                <textarea
                  id="rejectReason"
                  className={`${styles.formControl} ${rejectError ? styles.fieldError : ""}`}
                  placeholder="Provide a clear reason for rejection for the student…"
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); if (e.target.value.trim()) setRejectError(false); }}
                />
                {rejectError && <span className={styles.fieldErrorMsg}>Please enter a rejection reason.</span>}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className={styles.btnConfirmReject} disabled={saving} onClick={() => {
                const reason = rejectReason.trim();
                if (!reason) { setRejectError(true); return; }
                void submitDecision(rejectTarget, "REJECTED", reason);
              }}>Reject Submission</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div role="status" className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.type === "success"
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          }
          {toast.msg}
        </div>
      )}
    </MainLayout>
  );
}
