"use client";

import { useEffect, useState } from "react";
import type { DirectoryStudent as StaffDirectoryStudent } from "../../lib/staffDirectory";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export type DirectoryStudent = StaffDirectoryStudent & { createdAt?: string; user: { active?: boolean; phone?: string | null } };
export type Evidence = { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt?: string };
export type Decision = "APPROVED" | "REJECTED";
export type Submission = {
  id: string; type: string; title: string; description?: string | null; status: string; studentId: string;
  createdAt: string; submittedAt?: string | null; reviewedAt?: string | null;
  student?: { registerNo?: string; user?: { name?: string } };
  documents: Evidence[]; approvals?: { action: string; comment?: string | null; createdAt?: string }[];
};

export const achievementTypes: Record<string, string> = {
  PROJECT: "Projects", INTERNSHIP: "Internships", CERTIFICATE: "Courses and certificates", COMPETITION: "Competitions",
  PUBLICATION: "Publications", PATENT: "Patents", RESEARCH: "Research", WORKSHOP: "Workshops", CONFERENCE: "Conferences",
  HACKATHON: "Hackathons", LEADERSHIP: "Leadership", VOLUNTEERING: "Volunteering", AWARD: "Awards",
};

export function useDepartmentResource<T>(path: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl + path, { credentials: "include", signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Sign in again." : "This data is currently unavailable.");
        const json = await response.json();
        if (!Array.isArray(json.data)) throw new Error("This data is currently unavailable.");
        if (!controller.signal.aborted) setData(json.data);
      })
      .catch((error: unknown) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load this data."); });
    return () => controller.abort();
  }, [path, attempt]);
  function refresh() { setError(""); setData(null); setAttempt((n) => n + 1); }
  return { data, error, refresh, setData };
}

export type Resource<T> = ReturnType<typeof useDepartmentResource<T>>;
