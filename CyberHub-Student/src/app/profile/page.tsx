"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/* ── Avatar initials ── */
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const [form, setForm] = useState({ name: "", email: "", registerNumber: "", yearOfStudy: "", department: "", batch: "", phone: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalContact, setOriginalContact] = useState({ name: "", email: "", phone: "" });
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API}/api/v1/profile`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error();
        const payload = await response.json() as { data: { name: string; email?: string | null; phone?: string | null; student?: { registerNo: string; department: string; batch: string; semester: number } | null; department?: { name: string } | null } };
        const profile = payload.data;
        setForm((current) => ({
          ...current,
          name: profile.name,
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          registerNumber: profile.student?.registerNo ?? current.registerNumber,
          department: profile.department?.name ?? profile.student?.department ?? current.department,
          batch: profile.student?.batch ?? current.batch,
          yearOfStudy: profile.student ? `Year ${Math.max(1, Math.ceil(profile.student.semester / 2))}` : current.yearOfStudy,
        }));
        setLoaded(true);
      } catch {
        setError("Unable to load the latest profile details.");
      }
    };
    void loadProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/v1/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name, email: form.email || null, phone: form.phone || null }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "Unable to save profile details.");
        return;
      }
      setForm((current) => ({ ...current, name: payload.data.name, email: payload.data.email ?? "", phone: payload.data.phone ?? "" }));
      setSaved(true);
      setEditing(false);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Unable to reach the profile service. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>My Profile</h1>

      </div>

      {/* ── Content ── */}
      <div className={styles.content}>
        {error && <p role="alert" className={styles.formError}>{error}</p>}
        {!loaded && !error && <p role="status">Loading your profile...</p>}
        {loaded && <div className={styles.layout}>

          {/* ─── LEFT: Profile card ─── */}
          <div className={styles.profileCard}>
            {/* Avatar */}
            <div className={styles.avatarWrap}>
              <div className={styles.avatarInitials}>{getInitials(form.name)}</div>
            </div>

            <h2 className={styles.profileName}>{form.name}</h2>
            <p className={styles.profileReg}>{form.registerNumber}</p>

            <div className={styles.profileBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              Student
            </div>

            <div className={styles.profileDivider} />

            {/* Quick info */}
            <div className={styles.quickInfo}>
              <div className={styles.quickItem}>
                <span className={styles.quickLabel}>Department</span>
                <span className={styles.quickValue}>{form.department}</span>
              </div>
              <div className={styles.quickItem}>
                <span className={styles.quickLabel}>Batch</span>
                <span className={styles.quickValue}>{form.batch}</span>
              </div>
              <div className={styles.quickItem}>
                <span className={styles.quickLabel}>Year of Study</span>
                <span className={styles.quickValue}>{form.yearOfStudy}</span>
              </div>
            </div>

            <div className={styles.profileDivider} />


          </div>

          {/* ─── RIGHT: Edit form ─── */}
          <div className={styles.formSection}>
            {/* Section header */}
            <div className={styles.formSectionHead}>
              <div>
                <h3 className={styles.formSectionTitle}>Personal Information</h3>
                <p className={styles.formSectionSub}>Basic details about the student.</p>
              </div>
              {!editing ? (
                <button id="btn-edit-profile" type="button" className={styles.editBtn}
                  disabled={!loaded} onClick={() => { setOriginalContact({ name: form.name, email: form.email, phone: form.phone }); setEditing(true); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit Profile
                </button>
              ) : null}
            </div>

            {/* Success toast */}
            {saved && (
              <div className={styles.toast}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Profile updated successfully!
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className={styles.formCard}>
                <div className={styles.formGrid}>

                  {/* 1. Name */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="name">
                      Name <span className={styles.req}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <input id="name" name="name"
                        className={`${styles.input} ${!editing ? styles.inputReadonly : ""}`}
                        type="text" value={form.name} onChange={handleChange}
                        readOnly={!editing} required />
                    </div>
                  </div>

                  {/* 2. Email Address */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="email">
                      Email Address <span className={styles.req}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <input id="email" name="email"
                        className={`${styles.input} ${!editing ? styles.inputReadonly : ""}`}
                        type="email" value={form.email} onChange={handleChange}
                        readOnly={!editing} />
                    </div>
                  </div>

                  {/* 3. Register Number */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="registerNumber">
                      Register Number <span className={styles.req}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      <input id="registerNumber" name="registerNumber"
                        className={`${styles.input} ${styles.inputMono} ${!editing ? styles.inputReadonly : ""}`}
                        type="text" value={form.registerNumber} readOnly />
                    </div>
                  </div>

                  {/* 4. Year of Study */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="yearOfStudy">
                      Year of Study <span className={styles.req}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                      <input id="yearOfStudy" name="yearOfStudy" className={`${styles.input} ${styles.inputReadonly}`} value={form.yearOfStudy} readOnly />
                    </div>
                  </div>

                  {/* 5. Department (extra context) */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="department">
                      Department
                    </label>
                    <div className={styles.inputWrap}>
                      <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="22" x2="21" y2="22"/>
                        <rect x="2" y="8" width="20" height="14"/>
                        <path d="M12 2L2 8h20L12 2z"/>
                      </svg>
                      <input id="department" name="department"
                        className={`${styles.input} ${styles.inputReadonly}`}
                        type="text" value={form.department} readOnly />
                    </div>
                  </div>

                  {/* 6. Phone */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="phone">
                      Phone Number
                    </label>
                    <div className={styles.inputWrap}>
                      <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <input id="phone" name="phone"
                        className={`${styles.input} ${!editing ? styles.inputReadonly : ""}`}
                        type="tel" value={form.phone} onChange={handleChange}
                        readOnly={!editing} placeholder="+91 XXXXX XXXXX" />
                    </div>
                  </div>

                </div>
              </div>

              {/* Action buttons */}
              {editing && (
                <div className={styles.actionRow}>
                  <button type="button" className={styles.cancelBtn}
                    onClick={() => { setForm((current) => ({ ...current, ...originalContact })); setEditing(false); setError(""); }}>
                    Cancel
                  </button>
                  <button id="btn-save-profile" type="submit" disabled={saving} className={styles.saveBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </form>

            {/* Account section */}
            <div className={styles.accountCard}>
              <h4 className={styles.accountTitle}>Account</h4>
              <div className={styles.accountRow}>
                <div className={styles.accountInfo}>
                  <span className={styles.accountLabel}>Account Status</span>
                  <span className={styles.accountValue}>
                    <span className={styles.activeDot} />Active Student
                  </span>
                </div>
              </div>
              <div className={styles.accountRow}>
                <div className={styles.accountInfo}>
                  <span className={styles.accountLabel}>Batch</span>
                  <span className={styles.accountValue}>{form.batch}</span>
                </div>
              </div>
              <div className={styles.accountRow}>
                <div className={styles.accountInfo}>
                  <span className={styles.accountLabel}>Portal Access</span>
                  <span className={styles.accountValue}>
                    <span className={styles.accessTag}>Student</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>}
      </div>
    </DashboardLayout>
  );
}
