import { Suspense } from "react";
import MainLayout from "@/components/MainLayout";
import { getStaffDirectory } from "@/lib/staffDirectory";
import DocumentLibrary, { type StudentUploads } from "./DocumentLibrary";
import styles from "./page.module.css";

async function StudentDocuments() {
  const directory = await getStaffDirectory();
  const students: StudentUploads[] | null = directory?.flatMap(({ id, registerNo, programme, batch, semester, user, achievements }) => {
    const documents = achievements.flatMap(({ documents, id: recordId, title, type, status, yearOfStudy, academicYear }) =>
      documents.map(({ id, fileName, mimeType, sizeBytes, createdAt }) =>
        ({ id, fileName, mimeType, sizeBytes, createdAt, recordId, title, type, status, yearOfStudy, academicYear }))
    );
    return documents.length ? [{ id, name: user.name, registerNo, programme, batch, semester, documents }] : [];
  }) ?? null;
  return <DocumentLibrary students={students} />;
}

export default function StudentDocumentsPage() {
  return (
    <MainLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Student Documents" }]} userName="Staff">
      <div className={styles.workspace}>
        <header className={styles.pageHeader}>
          <h1>Student Documents</h1>
          <p>Search by event name to see which students uploaded certificates or other supporting files.</p>
        </header>
        <Suspense fallback={<p className={styles.message} role="status">Loading student documents…</p>}>
          <StudentDocuments />
        </Suspense>
      </div>
    </MainLayout>
  );
}
