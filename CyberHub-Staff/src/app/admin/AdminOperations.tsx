"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiUrl, Icon, useAdmin } from "./AdminShell";
import type { Settings } from "./adminData";
import { DemoNote, Empty, PageHeader, downloadCsv, formatDate } from "./adminUi";
import s from "./admin.module.css";

const roles = [
  { name: "Super Admin", scope: "No configured role", permissions: ["—", "—", "—", "—", "—", "—"] },
  { name: "Admin", scope: "Institution-wide review and own staff account", permissions: ["Yes", "Own events", "Own profile", "—", "Yes", "Demo or report data"] },
  { name: "HOD", scope: "Own department and staff account", permissions: ["Yes", "Own events", "Own profile", "—", "Own department", "—"] },
  { name: "Faculty", scope: "Own department and staff account", permissions: ["Yes", "Own events", "Own profile", "—", "Own department", "—"] },
  { name: "Student", scope: "Own records and profile", permissions: ["Own records", "Achievements", "Own eligible records", "—", "—", "—"] },
];

export function Roles() {
  return <>
    <PageHeader title="User Roles & Permissions" description="Inspect available roles and the access enforced by the current service." />
    <section className={s.card}><h2>Current access</h2><p>Your session uses the Admin role. Achievement and evidence review is institution-wide.</p></section>
    <section className={s.panel}>
      <div className={s.sectionIntro}><h2>Permission matrix</h2><p>Role assignment and permission editing require a server API. Academic demo controls are available within this workspace.</p></div>
      <div className={s.tableWrap} tabIndex={0} aria-label="Scrollable permission matrix"><table className={s.table}>
        <thead><tr>{["Role", "Data scope", "View", "Create", "Edit", "Delete", "Approve", "Export"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{roles.map(({ name, scope, permissions }) => <tr key={name}><th scope="row">{name}</th><td>{scope}</td>
          {permissions.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody>
      </table></div>
    </section>
  </>;
}

function timestamp(at: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(at));
}

export function Audit() {
  const { data } = useAdmin();
  const [view, setView] = useState<"table" | "timeline">("table");
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalid = from && to && from > to;
  const query = search.trim().toLowerCase();
  const entries = invalid ? [] : data.audit.filter((row) => (!action || row.action === action) && (!module || row.module === module)
    && (!from || row.at.slice(0, 10) >= from) && (!to || row.at.slice(0, 10) <= to)
    && (!query || [row.user, row.action, row.module, row.detail, row.ip].some((value) => value?.toLowerCase().includes(query))));
  return <>
    <PageHeader title="Audit Logs" description="Review activity by user, module, and date." actions={<button className={s.secondary} disabled={!entries.length}
      onClick={() => downloadCsv("demo-workspace-activity", [["User", "Action", "Module", "Description", "Timestamp", "IP address"], ...entries.map((row) =>
        [row.user, row.action, row.module, row.detail, row.at, row.ip ?? ""])])}><Icon name="download" />Export log</button>} />
    <DemoNote>This log records actions in the demo workspace. Server audit logs require a separate integration.</DemoNote>
    <section className={s.panel}>
      <div className={s.toolbar}>
        <label className={s.field}><span>Search activity</span><input type="search" placeholder="User or description" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <label className={s.field}><span>Module</span><select value={module} onChange={(e) => setModule(e.target.value)}><option value="">All modules</option>
          {Array.from(new Set(data.audit.map((row) => row.module))).sort().map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className={s.field}><span>Action</span><select value={action} onChange={(e) => setAction(e.target.value)}><option value="">All actions</option>
          {Array.from(new Set(data.audit.map((row) => row.action))).sort().map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className={s.field}><span>From (UTC)</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className={s.field}><span>To (UTC)</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className={s.tableTools}><p>{entries.length} {entries.length === 1 ? "entry" : "entries"}</p><div className={s.segmented} aria-label="Audit view">
        <button aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button><button aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>Timeline</button>
      </div></div>
      {invalid ? <p className={s.error} role="alert">Choose an end date on or after the start date.</p> : !entries.length ? <Empty title="No matching events" detail="Try a different search, filter, or date range." />
        : view === "table" ? <div className={s.tableWrap} tabIndex={0} aria-label="Scrollable audit table"><table className={s.table}>
          <thead><tr>{["User", "Action", "Module", "Description", "Timestamp", "IP address"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{entries.map((row) => <tr key={row.id}><td>{row.user}</td><td>{row.action}</td><td>{row.module}</td><td>{row.detail}</td><td>{timestamp(row.at)}</td><td>{row.ip ?? "—"}</td></tr>)}</tbody>
        </table></div> : <ol className={s.auditTimeline}>{entries.map((row) => <li key={row.id}><span className={s.metricIcon}><Icon name="history" size={17} /></span>
          <div><strong>{row.detail}</strong><p>{row.user} · {row.action} · {row.module}</p><time dateTime={row.at}>{timestamp(row.at)}</time>{row.ip && <small>{row.ip}</small>}</div>
        </li>)}</ol>}
    </section>
  </>;
}

type Profile = { name: string; email?: string | null; phone?: string | null; identifier?: string };

function AccountSettings() {
  const router = useRouter();
  const { notice, account, logout, signingOut } = useAdmin();
  const [profile, setProfile] = useState<Profile>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl + "/api/v1/profile", { signal: controller.signal, credentials: "include" }).then(async (response) => {
      if (!response.ok) throw new Error();
      const json = await response.json();
      if (!controller.signal.aborted) setProfile(json.data);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Could not load your account details.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  return <>
    <section className={s.card}><h2>Admin profile</h2>
      {loading ? <p role="status">Loading profile…</p> : !profile ? <div role="alert" className={s.error}>{error}
        <button className={s.secondary} onClick={() => { setError(""); setLoading(true); setAttempt(attempt + 1); }}>Retry</button></div>
        : <form className={s.form} onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true); setError("");
          try {
            const response = await fetch(apiUrl + "/api/v1/profile", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: profile.name.trim(), email: profile.email?.trim() || null, phone: profile.phone?.trim() || null }) });
            const json = await response.json();
            if (!response.ok) throw new Error(json?.error?.message ?? "Could not save the profile.");
            setProfile(json.data);
            notice("Profile updated.");
            router.refresh();
          } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the profile."); }
          finally { setSaving(false); }
        }}>
          <div className={s.formGrid}>
            <label className={s.field}><span>Full name</span><input value={profile.name} minLength={2} maxLength={120} required onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
            <label className={s.field}><span>Email</span><input type="email" value={profile.email ?? ""} maxLength={160} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
            <label className={s.field}><span>Phone number</span><input type="tel" value={profile.phone ?? ""} maxLength={30} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
          </div>
          {error && <p className={s.error} role="alert">{error}</p>}
          <div className={s.formActions}><button className={s.primary} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
        </form>}
    </section>
    <section className={s.card}><h2>Account and session</h2>
      <dl className={s.details}><div><dt>Account identifier</dt><dd>{profile?.identifier ?? (loading ? "Loading…" : account.id)}</dd></div>
        <div><dt>Role</dt><dd>Admin</dd></div><div><dt>Session</dt><dd>Signed in</dd></div></dl>
      <div className={s.actions}><button className={s.secondary} disabled={signingOut} onClick={() => void logout()}>{signingOut ? "Signing out…" : "Sign out"}</button></div>
    </section>
  </>;
}

export function AdminSettings() {
  const { data, update, notice } = useAdmin();
  const [values, setValues] = useState<Partial<Settings>>({});
  const preferences = { ...data.settings, ...values };
  return <>
    <PageHeader title="Settings" description="Manage your admin profile, workspace preferences, and session." />
    <AccountSettings />
    <DemoNote>Workspace preferences are stored in this browser. Profile changes are saved through the account service.</DemoNote>
    <form className={s.form} onSubmit={(e) => {
      e.preventDefault();
      const organization = preferences.organization.trim();
      if (!organization) { notice("Enter an organization name."); return; }
      update((state) => ({ ...state, settings: { ...preferences, organization } }),
        { action: "Updated", module: "Settings", detail: "Saved workspace preferences" });
      setValues({});
      notice("Workspace preferences saved.");
    }}>
      <fieldset className={s.formPanel}><legend>Academic configuration</legend><div className={s.formGrid}>
        <label className={s.field}><span>Organization name</span><input required maxLength={80} value={preferences.organization} onChange={(e) => setValues({ ...values, organization: e.target.value })} /></label>
        <label className={s.field}><span>Default academic year</span><select value={preferences.defaultYear} onChange={(e) => setValues({ ...values, defaultYear: e.target.value })}>
          <option value="">No default</option>{data.records["academic-years"].map(({ id, name, startDate }) => <option value={id} key={id}>{name} · {formatDate(startDate)}</option>)}</select></label>
      </div></fieldset>
      <fieldset className={s.formPanel}><legend>Appearance and notifications</legend><div className={s.formGrid}>
        <label className={s.field}><span>Theme</span><select value={preferences.theme} onChange={(e) => setValues({ ...values, theme: e.target.value as Settings["theme"] })}><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <div className={s.checks}>
          <label><input type="checkbox" checked={preferences.reviewAlerts} onChange={(e) => setValues({ ...values, reviewAlerts: e.target.checked })} /> Document review reminders</label>
          <label><input type="checkbox" checked={preferences.activityAlerts} onChange={(e) => setValues({ ...values, activityAlerts: e.target.checked })} /> Demo workspace activity</label>
        </div>
      </div></fieldset>
      <div className={s.formActions}><button className={s.primary}>Save workspace preferences</button></div>
    </form>
  </>;
}
