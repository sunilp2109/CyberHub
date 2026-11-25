"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { adminHref, getSection, links, modules, navGroups, type AdminAccount, type AdminData, type AuditEntry } from "./adminData";
import { apiUrl, useDepartmentResource, type DirectoryStudent, type Resource, type Submission } from "./departmentApi";
import styles from "./admin.module.css";

const icons: Record<string, string> = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M17 15a4 4 0 0 1 4 4v2 M13 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0 M16 3a4 4 0 0 1 0 8",
  faculty: "M2 9l10-5 10 5-10 5z M6 11v6c4 3 8 3 12 0v-6 M22 9v7",
  building: "M4 21V8l8-5 8 5v13 M2 21h20 M9 21v-5h6v5 M8 10h1m6 0h1",
  calendar: "M4 5h16v16H4z M8 3v4m8-4v4M4 10h16",
  layers: "M2 7l10-5 10 5-10 5z M2 12l10 5 10-5 M2 17l10 5 10-5",
  book: "M12 5v16 M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2z",
  allocation: "M4 7h16m-4-4 4 4-4 4 M20 17H4m4-4-4 4 4 4",
  badge: "M12 2l3 3 4 1 1 4 2 3-3 3-1 4-4 1-3 1-3-3-4-1-1-4-1-3 3-3 1-4 4-1z M8 12l3 3 5-6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4",
  file: "M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8m-8 4h8",
  chart: "M3 3v18h18 M8 16v-5m5 5V7m5 9V4",
  history: "M3 12a9 9 0 1 0 3-7 M3 3v5h5 M12 7v5l3 2",
  settings: "M4 6h16M4 12h16M4 18h16 M9 4v4m6 2v4m-5 2v4",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-2 4 6 6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  moon: "M20 15a8 8 0 0 1-11-11 8 8 0 1 0 11 11",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M19 5l-1 1M6 18l-1 1",
  menu: "M4 6h16M4 12h16M4 18h16",
  chevron: "m9 6 6 6-6 6",
  down: "m6 9 6 6 6-6",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  close: "m6 6 12 12M18 6 6 18",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  check: "m5 12 4 4L19 6",
  info: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 11v6m0-10h.01",
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={icons[name] ?? icons.file} /></svg>;
}

export function AdminAvatar({ name, image, large = false }: { name: string; image?: string; large?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  // eslint-disable-next-line @next/next/no-img-element -- This personal preference is a browser-local data URL.
  return <span className={styles.avatar} data-large={large}>{image ? <img src={image} alt="" /> : initials}</span>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} className={styles.modal} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header><h2>{title}</h2><button className={styles.iconButton} type="button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></header>
      {children}
    </dialog>
  );
}

type AdminContextValue = {
  account: AdminAccount;
  demo: boolean;
  data: AdminData;
  directory: Resource<DirectoryStudent>;
  achievements: Resource<Submission>;
  update: (change: (state: AdminData) => AdminData, event?: Pick<AuditEntry, "action" | "module" | "detail" | "recordId">) => void;
  notice: (message: string) => void;
  logout: () => Promise<void>;
  signingOut: boolean;
};
const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("Admin workspace context is required.");
  return context;
}

export default function AdminShell({ account, demo, initial, children }: { account: AdminAccount; demo: boolean; initial: AdminData; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname.split("/")[2] ?? "dashboard";
  const current = getSection(active);
  const [data, setData] = useState(initial);
  const directory = useDepartmentResource<DirectoryStudent>("/api/v1/staff/students");
  const achievements = useDepartmentResource<Submission>("/api/v1/achievements");
  const [hydrated, setHydrated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<"notifications" | "profile" | null>(null);
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const storageKey = `cyberhub-department-v1:${account.id}:${account.department.id}`;

  useEffect(() => {
    let canceled = false;
    queueMicrotask(() => {
      if (canceled) return;
      try {
        const stored = localStorage.getItem(storageKey + ":preferences");
        const local = demo ? localStorage.getItem(storageKey + ":demo") : null;
        const settings: Partial<AdminData["settings"]> = stored ? JSON.parse(stored) : {};
        const saved: Pick<AdminData, "records" | "audit"> | null = local ? JSON.parse(local) : null;
        const records = { ...initial.records };
        if (saved) {
          for (const { id } of modules) {
            if (Array.isArray(saved.records?.[id])) records[id] = saved.records[id].filter((row) => row?.departmentId === account.department.id);
          }
        }
        setData({ records, audit: Array.isArray(saved?.audit) ? saved.audit : initial.audit, settings: { ...initial.settings,
          defaultYear: demo && (settings.defaultYear === "" || records["academic-years"].some(({ id }) => id === settings.defaultYear)) ? settings.defaultYear ?? "" : initial.settings.defaultYear,
          reviewAlerts: typeof settings.reviewAlerts === "boolean" ? settings.reviewAlerts : initial.settings.reviewAlerts,
          theme: settings.theme === "dark" ? "dark" : "light",
          avatar: typeof settings.avatar === "string" && settings.avatar.length <= 350_000 && /^data:image\/(png|jpeg);base64,/.test(settings.avatar) ? settings.avatar : undefined,
        } });
      } catch {
        // Browser storage is optional for the demo workspace.
      } finally {
        setHydrated(true);
      }
    });
    return () => { canceled = true; };
  }, [account.department.id, demo, initial, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey + ":preferences", JSON.stringify(data.settings));
      if (demo) localStorage.setItem(storageKey + ":demo", JSON.stringify({ records: data.records, audit: data.audit }));
    } catch { /* Keep the workspace usable in memory. */ }
  }, [data, demo, hydrated, storageKey]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") { setMobileOpen(false); setMenu(null); }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = sidebar.current;
    const toggle = mobileToggle.current;
    const breakpoint = window.matchMedia("(max-width: 840px)");
    if (!drawer || !breakpoint.matches) return;
    const links = Array.from(drawer.querySelectorAll<HTMLAnchorElement>("a[href]"));
    const frame = window.requestAnimationFrame(() => {
      (drawer.querySelector<HTMLAnchorElement>('a[aria-current="page"]') ?? links[0])?.focus();
    });
    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); links.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); links[0]?.focus(); }
    }
    function resetDrawer() { if (!breakpoint.matches) setMobileOpen(false); }
    drawer.addEventListener("keydown", trap);
    breakpoint.addEventListener("change", resetDrawer);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = oldOverflow;
      drawer.removeEventListener("keydown", trap);
      breakpoint.removeEventListener("change", resetDrawer);
      toggle?.focus();
    };
  }, [mobileOpen]);

  function update(change: (state: AdminData) => AdminData, event?: Pick<AuditEntry, "action" | "module" | "detail" | "recordId">) {
    const stamp = event && { ...event, id: crypto.randomUUID(), at: new Date().toISOString(), user: account.name };
    setData((previous) => {
      const next = change(previous);
      return stamp ? { ...next, audit: [stamp, ...next.audit] } : next;
    });
  }

  async function logout() {
    setSigningOut(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error();
      window.location.replace("/login");
    } catch {
      setSigningOut(false);
      setMessage("Unable to sign out. Try again.");
    }
  }

  const query = search.trim().toLowerCase();
  const searchLinks = links.filter(({ label }) => !query || label.toLowerCase().includes(query));
  const searchRecords = query ? [
    ...(directory.data ?? []).map(({ id, user, registerNo }) => ({ href: `/department-admin/students/${id}`, name: user.name, detail: registerNo, icon: "users" })),
    ...data.records.students.map(({ id, name, registerNumber }) => ({ href: `/department-admin/students/${id}`, name, detail: registerNumber + " · Demo", icon: "users" })),
    ...data.records.faculty.map(({ id, name, employeeId }) => ({ href: `/department-admin/faculty/${id}`, name, detail: employeeId + " · Demo", icon: "faculty" })),
  ].filter(({ name, detail }) => `${name} ${detail}`.toLowerCase().includes(query)).slice(0, 6) : [];
  const pending = achievements.data?.filter(({ status }) => status === "SUBMITTED").reduce((count, row) => count + (row.documents?.length ?? 0), 0);
  return (
    <AdminContext.Provider value={{ account, demo, data, directory, achievements, update, notice: setMessage, logout, signingOut }}>
      <div className={styles.shell} data-theme={data.settings.theme} data-collapsed={collapsed}>
        <a className={styles.skipLink} href="#admin-content">Skip to content</a>
        {mobileOpen && <button className={styles.scrim} aria-label="Close navigation" tabIndex={-1} onClick={() => setMobileOpen(false)} />}
        <aside ref={sidebar} className={styles.sidebar} data-open={mobileOpen} id="admin-navigation">
          <Link href="/department-admin" className={styles.brand} aria-label="CyberHub ERP dashboard" onClick={() => setMobileOpen(false)}>
            <span className={styles.brandMark}><Icon name="shield" size={20} /></span>
            <span className={styles.navText}><strong>CyberHub ERP</strong><small>Department Admin</small></span>
          </Link>
          <button className={styles.collapse} type="button" aria-expanded={!collapsed} aria-controls="admin-navigation"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>
            <Icon name="menu" size={17} /><span className={styles.navText}>Collapse sidebar</span>
          </button>
          <div className={styles.scopeChip} title={account.department.name}><Icon name="building" size={17} /><span className={styles.navText}><small>Assigned department</small><strong>{account.department.name}</strong></span></div>
          <nav aria-label="Admin navigation" className={styles.navigation}>
            {navGroups.map((group) => (
              <div key={group.label} className={styles.navGroup}>
                <p className={styles.navText}>{group.label}</p>
                {group.links.map((link) => (
                  <Link key={link.id} href={adminHref(link.id)} prefetch={false} aria-current={active === link.id ? "page" : undefined}
                    aria-label={link.label} title={collapsed ? link.label : undefined} onClick={() => setMobileOpen(false)}>
                    <Icon name={link.icon} /><span className={styles.navText}>{link.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <div className={styles.workspace}>
          <header className={styles.topbar}>
            <button ref={mobileToggle} className={`${styles.iconButton} ${styles.mobileMenu}`} type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen} aria-controls="admin-navigation" onClick={() => setMobileOpen(!mobileOpen)}><Icon name="menu" /></button>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/department-admin">Department Admin</Link><Icon name="chevron" size={13} /><span aria-current="page">{current?.label ?? "Overview"}</span>
            </nav>
            <div className={styles.topActions}>
              <button className={styles.searchButton} type="button" onClick={() => { setSearch(""); setSearchOpen(true); }} aria-label="Search administration">
                <Icon name="search" size={17} /><span>Search</span><kbd>Ctrl K</kbd>
              </button>
              <button className={styles.iconButton} type="button" aria-label={data.settings.theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
                onClick={() => update((state) => ({ ...state, settings: { ...state.settings, theme: state.settings.theme === "light" ? "dark" : "light" } }))}>
                <Icon name={data.settings.theme === "light" ? "moon" : "sun"} />
              </button>
              <div className={styles.menuAnchor}>
                <button className={styles.iconButton} type="button" aria-label="Notifications" aria-expanded={menu === "notifications"}
                  onClick={() => setMenu(menu === "notifications" ? null : "notifications")}><Icon name="bell" /></button>
                {menu === "notifications" && <div className={styles.popup}>
                  <strong>Notifications</strong>
                  <p>{data.settings.reviewAlerts ? pending === undefined ? "Check the document queue for current review counts." : `${pending} ${pending === 1 ? "document needs" : "documents need"} verification.` : "Review alerts are turned off."}</p>
                  <Link href="/department-admin/documents" onClick={() => setMenu(null)}>Open documents <Icon name="arrow" size={14} /></Link>
                </div>}
              </div>
              <div className={styles.menuAnchor}>
                <button className={styles.profileButton} type="button" aria-label="Admin account" aria-expanded={menu === "profile"}
                  onClick={() => setMenu(menu === "profile" ? null : "profile")}>
                  <AdminAvatar name={account.name} image={data.settings.avatar} />
                  <span className={styles.profileName}><strong>{account.name}</strong><small>Department Admin</small></span>
                  <Icon name="down" size={14} />
                </button>
                {menu === "profile" && <div className={styles.popup}>
                  <strong>{account.name}</strong><p>{account.email ?? "Administrator"}</p>
                  <Link href="/department-admin/profile" onClick={() => setMenu(null)}>View profile</Link>
                  <Link href="/department-admin/settings" onClick={() => setMenu(null)}>Settings</Link>
                  <button className={styles.secondary} type="button" disabled={signingOut} onClick={() => void logout()}>{signingOut ? "Signing out…" : "Sign out"}</button>
                </div>}
              </div>
            </div>
          </header>

          <main className={styles.content} id="admin-content">
            {hydrated ? children : <div role="status" className={styles.loading}><span className={styles.skeleton} />Loading workspace…</div>}
          </main>
        </div>

        {searchOpen && <Modal title="Search administration" onClose={() => setSearchOpen(false)}>
          <input className={styles.searchInput} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a page, student, or faculty member" aria-label="Search pages and records" autoFocus />
          <ul className={styles.searchResults}>
            {searchLinks.map((link) => <li key={link.id}><Link href={adminHref(link.id)} onClick={() => setSearchOpen(false)}><Icon name={link.icon} />{link.label}</Link></li>)}
            {searchRecords.map((row) => <li key={row.href}><Link href={row.href} onClick={() => setSearchOpen(false)}><Icon name={row.icon} />{row.name}<small>{row.detail}</small></Link></li>)}
            {!searchLinks.length && !searchRecords.length && <li className={styles.empty}>No matching pages or records.</li>}
          </ul>
        </Modal>}
        {message && <div className={styles.toast} role="status"><Icon name="check" />{message}<button className={styles.iconButton} type="button" aria-label="Dismiss notice" onClick={() => setMessage("")}><Icon name="close" size={16} /></button></div>}
      </div>
    </AdminContext.Provider>
  );
}
