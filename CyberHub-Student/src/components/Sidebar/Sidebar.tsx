"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

const navItems = [
  {
    label: "Dashboard", href: "/dashboard",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: "Competitions", href: "/competitions",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
  },
  {
    label: "Courses and Certificates", href: "/certificates",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>,
  },
  {
    label: "Internships", href: "/internships",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  },
  {
    label: "Projects", href: "/projects",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  },
  {
    label: "Publications", href: "/publications",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
  {
    label: "Patents", href: "/patents",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
  {
    label: "Awards", href: "/awards",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const profileActive = pathname === "/profile";
  const [expanded, setExpanded] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLogoutError(false);
    setLoggingOut(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/auth/logout`, {
        method: "POST", credentials: "include",
      });
      if (!response.ok) throw new Error();
      window.location.replace(`${process.env.NEXT_PUBLIC_AUTH_PORTAL_URL ?? "http://localhost:3001"}/login`);
    } catch {
      setLogoutError(true);
      setLoggingOut(false);
    }
  };

  return (
    <aside className={styles.sidebar} data-expanded={expanded}>
      <div className={styles.logo}>
        <div className={styles.logoArtwork}>
          <Image src="/cyberhub-logo.png" alt="CyberHub" width={2172} height={724} sizes="170px" />
        </div>
        <span className={styles.logoSub}>Achievement Portal</span>
      </div>

      {/* Nav */}
      <button type="button" className={styles.menuToggle} aria-expanded={expanded} aria-controls="student-navigation student-account" onClick={() => setExpanded(!expanded)}>Menu</button>
      <nav className={styles.nav} id="student-navigation" aria-label="Student navigation">
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={() => setExpanded(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div id="student-account" className={styles.account}>
        <Link
          href="/profile"
          prefetch={false}
          aria-current={profileActive ? "page" : undefined}
          className={`${styles.navLink} ${styles.profileLink} ${profileActive ? styles.active : ""}`}
          onClick={() => setExpanded(false)}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </Link>
        <button type="button" className={styles.logoutButton} disabled={loggingOut} onClick={() => void logout()}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 17l5-5-5-5m5 5H3m9-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
          </svg>
          {loggingOut ? "Signing out…" : "Logout"}
        </button>
        {logoutError && <p className={styles.logoutError} role="alert">Sign-out failed. Try again.</p>}
      </div>
    </aside>
  );
}
