import { cookies } from "next/headers";
import type { ApprovalStatus } from "./studentData";

export interface DirectoryStudent {
  id: string;
  registerNo: string;
  department: string;
  programme: string;
  batch: string;
  semester: number;
  academicYear?: string | null;
  yearOfStudy?: number | null;
  classSection?: string | null;
  user: { name: string; email: string | null };
  achievements: {
    id: string;
    title: string;
    type: string;
    status: ApprovalStatus;
    description: string | null;
    submittedAt: string | null;
    academicYear?: string | null;
    yearOfStudy?: number | null;
    createdAt: string;
    approvals: { action: ApprovalStatus; comment?: string | null }[];
    documents: { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt?: string }[];
  }[];
}

export async function getStaffDirectory(): Promise<DirectoryStudent[] | null> {
  const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  try {
    const response = await fetch(`${api}/api/v1/staff/students`, {
      cache: "no-store",
      headers: { cookie },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { data: DirectoryStudent[] };
    return payload.data;
  } catch {
    return null;
  }
}
