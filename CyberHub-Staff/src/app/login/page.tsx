"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

/* ── Inline SVG icons (no external deps needed) ── */
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

type LoginResponse = {
  data?: {
    role?: "STUDENT" | "FACULTY" | "HOD" | "ADMIN";
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const STUDENT_PORTAL_URL = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL ?? "http://localhost:3000";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your student or staff ID/email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password, remember }),
      });

      if (!response.ok) {
        setError("Invalid credentials. Please check your ID/email and password.");
        return;
      }

      const result = (await response.json()) as LoginResponse;
      const role = result.data?.role;

      if (role === "STUDENT") {
        window.location.replace(`${STUDENT_PORTAL_URL}/dashboard`);
      } else if (role === "ADMIN") {
        router.replace("/admin");
      } else if (role === "FACULTY" || role === "HOD") {
        router.push("/dashboard");
      } else {
        setError("Your account is not assigned to a supported ERP portal.");
      }
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.loginWrapper}>
      <div className={styles.brandPanel}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true"><IconLock /></span>
          <span>CyberHub<span className={styles.brandSuffix}>ERP</span></span>
        </div>
        <div className={styles.brandCopy}>
          <p className={styles.department}>Cybersecurity Department</p>
          <p className={styles.brandHeading}>Your academic<br />workspace.</p>
          <p className={styles.brandDescription}>Track achievements, review submissions, and manage academic events.</p>
        </div>
        <div className={styles.artwork} aria-hidden="true">
          <span /><span /><span />
          <span className={styles.artworkMark}><IconLock /></span>
        </div>
      </div>

      <section className={styles.formPanel} aria-labelledby="login-heading">
        <div className={styles.formContainer}>
          <header className={styles.formHeader}>
            <h1 id="login-heading">Sign in</h1>
            <p>Use your student or staff account to continue.</p>
          </header>

          {error && (
            <div className={styles.errorMsg} role="alert">
              <span aria-hidden="true"><IconAlert /></span>
              <span>{error}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={loading}>
            <div className={styles.formGroup}>
              <label htmlFor="identifier">Student or staff ID or email</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true"><IconUser /></span>
                <input
                  id="identifier"
                  name="username"
                  type="text"
                  placeholder="Enter your ID or email"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true"><IconLock /></span>
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  className={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPass((visible) => !visible)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  aria-controls="password"
                >
                  {showPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                disabled={loading}
              />
              Remember me
            </label>

            <button id="sign-in-btn" type="submit" className={styles.signInBtn} disabled={loading}>
              {loading ? "Signing in…" : <>Sign in <span aria-hidden="true">→</span></>}
            </button>
          </form>

          <div className={styles.helpText}>
            <p>Having trouble signing in?</p>
            <a href="mailto:admin@cyberhub.edu">Contact your department admin</a>
          </div>
          <p className={styles.designCredit}>Designed by SUNIL</p>
        </div>
      </section>
    </main>
  );
}
