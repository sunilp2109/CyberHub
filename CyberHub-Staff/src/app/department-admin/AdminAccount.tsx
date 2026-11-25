"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminAvatar, useAdmin } from "./AdminShell";
import { PageHeader } from "./adminUi";
import { apiUrl } from "./departmentApi";
import s from "./admin.module.css";

type Profile = { name: string; email?: string | null; phone?: string | null; staffProfile?: { employeeId: string } | null };

export function Profile() {
  const router = useRouter();
  const { account, data, update, notice } = useAdmin();
  const [profile, setProfile] = useState<Profile>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [photoError, setPhotoError] = useState("");
  const photoRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl + "/api/v1/profile", { credentials: "include", cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const json = await response.json();
      if (!controller.signal.aborted) setProfile(json.data);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Could not load your profile.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  function changePhoto(file: File | undefined) {
    if (!file) return;
    const version = ++photoRequest.current;
    setPhotoError("");
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 250_000) {
      setPhotoError("Choose a PNG or JPEG under 250 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => { if (version === photoRequest.current) setPhotoError("Could not read the profile picture."); };
    reader.onload = () => {
      if (version !== photoRequest.current || typeof reader.result !== "string") return;
      const avatar = reader.result;
      update((state) => ({ ...state, settings: { ...state.settings, avatar } }));
      notice("Profile picture saved in this browser.");
    };
    reader.readAsDataURL(file);
  }

  return <>
    <PageHeader title="Profile" description="Manage your contact details and view your assigned department." />
    <section className={s.card}>
      <div className={s.profileSummary}><AdminAvatar name={account.name} image={data.settings.avatar} large />
        <div><h2>{account.name}</h2><p>Department Admin · {account.department.name}</p></div></div>
      <dl className={s.details}><div><dt>Admin ID</dt><dd>{profile?.staffProfile?.employeeId ?? account.identifier}</dd></div>
        <div><dt>Assigned department</dt><dd>{account.department.name}</dd></div><div><dt>Role</dt><dd>Department Admin</dd></div></dl>
    </section>
    <section className={s.card}><h2>Contact information</h2>
      {loading ? <p role="status">Loading profile…</p> : !profile ? <div role="alert" className={s.error}>{error}
        <button className={s.secondary} onClick={() => { setError(""); setLoading(true); setAttempt(attempt + 1); }}>Retry</button></div>
        : <form className={s.form} onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true); setError("");
          try {
            const response = await fetch(apiUrl + "/api/v1/profile", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: profile.name.trim(), email: profile.email?.trim() || null, phone: profile.phone?.trim() || null }) });
            const json = await response.json();
            if (!response.ok) throw new Error(json?.error?.message ?? "Could not save your profile.");
            setProfile(json.data); notice("Profile updated."); router.refresh();
          } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save your profile."); }
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
    <section className={s.card}><h2>Profile picture</h2><p>PNG or JPEG up to 250 KB. Your picture is saved in this browser.</p>
      <div className={s.actions}><label className={s.field}><span>Choose a picture</span><input type="file" accept="image/png,image/jpeg" onChange={(e) => { changePhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
        {data.settings.avatar && <button className={s.secondary} onClick={() => {
          photoRequest.current++; setPhotoError(""); update((state) => ({ ...state, settings: { ...state.settings, avatar: undefined } }));
          notice("Profile picture removed.");
        }}>Remove picture</button>}</div>
      {photoError && <p className={s.error} role="alert">{photoError}</p>}
    </section>
  </>;
}

export function SettingsPage() {
  const { account, data, demo, update, notice, logout, signingOut } = useAdmin();
  const [values, setValues] = useState<Partial<typeof data.settings>>({});
  const preferences = { ...data.settings, ...values };
  return <>
    <PageHeader title="Settings" description="Adjust personal preferences and manage your session." />
    <form className={s.form} onSubmit={(e) => {
      e.preventDefault();
      update((state) => ({ ...state, settings: { ...state.settings, ...values } }));
      setValues({});
      notice("Preferences saved.");
    }}>
      <fieldset className={s.formPanel}><legend>Personal preferences</legend><div className={s.formGrid}>
        {demo && <label className={s.field}><span>Default demo academic year</span><select value={preferences.defaultYear} onChange={(e) => setValues({ ...values, defaultYear: e.target.value })}>
          <option value="">No default</option>{data.records["academic-years"].map(({ id, name }) => <option value={id} key={id}>{name}</option>)}</select></label>}
        <div className={s.checks}><label><input type="checkbox" checked={preferences.reviewAlerts} onChange={(e) => setValues({ ...values, reviewAlerts: e.target.checked })} /> Document review reminders</label></div>
      </div></fieldset>
      <div className={s.formActions}><button className={s.primary}>Save preferences</button></div>
    </form>
    <section className={s.card}><h2>Account and session</h2>
      <dl className={s.details}><div><dt>Account identifier</dt><dd>{account.identifier}</dd></div><div><dt>Assigned department</dt><dd>{account.department.name}</dd></div><div><dt>Session</dt><dd>Signed in</dd></div></dl>
      <div className={s.actions}><button className={s.secondary} disabled={signingOut} onClick={() => void logout()}>{signingOut ? "Signing out…" : "Sign out"}</button></div>
    </section>
  </>;
}
