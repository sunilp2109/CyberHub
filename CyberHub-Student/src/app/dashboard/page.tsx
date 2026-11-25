"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import Header from "@/components/Header/Header";
import SubmittedRecords from "./SubmittedRecords";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const [summary, setSummary] = useState<{ submitted: number; approved: number; rejected: number } | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch(`${API_URL}/api/v1/student/summary`, { credentials: "include" })
        .then((response) => response.ok ? response.json() as Promise<{ data: { counts: typeof summary } }> : Promise.reject(new Error("Unable to load summary.")))
        .then((payload) => setSummary(payload.data.counts))
        .catch(() => setSummaryFailed(true));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [API_URL]);

  const total = summary ? summary.submitted + summary.approved + summary.rejected : undefined;

  return (
    <DashboardLayout>
      <Header title="Dashboard" subtitle="Your academic achievement workspace" />
      <div className={styles.workspace}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Student Portal</p>
          <h2>Your achievement record</h2>
          <p className={styles.intro}>Track your submissions, check review results, and find your uploaded documents.</p>
        </section>

        <div role="status">
          {summaryFailed && <p className={styles.alert}>Student activity totals could not be loaded. Refresh to try again.</p>}
          {summary && summary.rejected > 0 && (
            <p className={styles.alert}>
              {summary.rejected === 1
                ? "One of your submissions was rejected."
                : `${summary.rejected} of your submissions were rejected.`}{" "}
              Open the relevant activity and select Rejected to see the details.
            </p>
          )}
        </div>

        <section aria-label="Achievement summary">
          <dl className={styles.metrics}>
            {([
              ["Total records", total],
              ["Submitted", summary?.submitted],
              ["Approved", summary?.approved],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <SubmittedRecords />
      </div>
    </DashboardLayout>
  );
}
