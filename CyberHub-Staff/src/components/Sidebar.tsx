"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./Sidebar.module.css";

/* ── SVG Icons ── */
const IcoDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IcoEvents = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoAddEvent = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);
const IcoApprovals = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const IcoStudents = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoProfile = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcoLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",  icon: <IcoDashboard /> },
  { href: "/events",    label: "My Events",  icon: <IcoEvents />    },
  { href: "/add-event", label: "Add Event",  icon: <IcoAddEvent />  },
  { href: "/approvals",        label: "Approvals",        icon: <IcoApprovals /> },
  { href: "/student-records", label: "Student Records", icon: <IcoStudents />  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  const handleLogout = async () => {
    setLogoutError(false);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/auth/logout`, {
        method: "POST", credentials: "include",
      });
      if (!response.ok) throw new Error();
      window.location.replace("/login");
    } catch {
      setLogoutError(true);
    }
  };

  return (
    <aside className={styles.sidebar} data-expanded={expanded}>
      {/* Brand */}
      <Link href="/dashboard" className={styles.brand}>
        <Image className={styles.brandArtwork} src="/cyberhub-logo.png" alt="CyberHub" width={2172} height={724} sizes="144px" />
        <span className={styles.brandSub}>Faculty Portal</span>
      </Link>

      <button type="button" className={styles.menuToggle} aria-expanded={expanded} aria-controls="staff-navigation" onClick={() => setExpanded(!expanded)}>Menu</button>
      <div id="staff-navigation" className={styles.navigation}>
      {/* Main nav */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={() => setExpanded(false)}
            aria-current={pathname === item.href ? "page" : undefined}
            className={`${styles.navLink} ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? styles.active : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom links */}
      <div>
        <div className={styles.divider} />
        <div className={styles.bottomNav}>
          <Link href="/profile" className={`${styles.navLink} ${pathname === "/profile" ? styles.active : ""}`}>
            <IcoProfile /> Profile
          </Link>
          <button className={styles.navLink} onClick={() => void handleLogout()}>
            <IcoLogout /> Logout
          </button>
          {logoutError && <p role="alert">Sign-out failed. Try again.</p>}
        </div>
      </div>
      </div>
    </aside>
  );
}
