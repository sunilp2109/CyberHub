import Link from "next/link";
import { notFound } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import type { ApprovalStatus } from "@/lib/studentData";
import { getStaffDirectory } from "@/lib/staffDirectory";
import styles from "../page.module.css";

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" });
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const statusLabels: Record<ApprovalStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function formatDate(date: string) {
  return dateFormat.format(new Date(date));
}

export default async function StudentProfilePage({ params, searchParams }: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const { studentId } = await params;
  const { year } = await searchParams;
  const directory = await getStaffDirectory();
  if (!directory) return <MainLayout><p role="alert">Student records could not be loaded. <Link href="/student-records">Return to student records</Link></p></MainLayout>;
  const student = directory.find((entry) => entry.id === studentId);
  if (!student) notFound();

  const studyYears = ["1", "2", "3", "4", "unrecorded"];
  const selected = typeof year === "string" && studyYears.includes(year) ? year : "";
  const submissions = student.achievements.filter((record) => !selected || selected === String(record.yearOfStudy ?? "unrecorded"));
  const fileCount = submissions.reduce((total, record) => total + record.documents.length, 0);

  return (
    <MainLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Student Records", href: "/student-records" },
        { label: student.user.name },
      ]}
      userName="Staff"
    >
      <div className={styles.workspace}>
        <Link href="/student-records" className={styles.backLink}>← Back to student records</Link>
        <header className={styles.profileHeader}>
          <span className={`${styles.avatar} ${styles.profileAvatar}`} aria-hidden="true">
            {student.user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
          </span>
          <div>
            <h1>{student.user.name}</h1>
            <p>{student.registerNo} · {student.department} · Semester {student.semester}</p>
          </div>
        </header>

        <div className={styles.profileGrid}>
          <section className={`${styles.card} ${styles.profileSection} ${styles.studentDetails}`} aria-labelledby="student-details">
            <h2 id="student-details">Student details</h2>
            <dl className={styles.profileInfo}>
              <div><dt>Register number</dt><dd>{student.registerNo}</dd></div>
              <div><dt>Department</dt><dd>{student.department}</dd></div>
              <div><dt>Semester</dt><dd>{student.semester}</dd></div>
              <div><dt>Programme</dt><dd>{student.programme}</dd></div>
              <div><dt>Batch</dt><dd>{student.batch}</dd></div>
              <div><dt>Email</dt><dd>{student.user.email ?? "?"}</dd></div>
            </dl>
          </section>

          <section className={`${styles.card} ${styles.profileSection}`} aria-labelledby="student-submissions">
            <h2 id="student-submissions">Submissions and files</h2>
            <nav className={styles.yearFilters} aria-label="Filter submissions by year of study">
              {["", ...studyYears].map((value) => (
                <Link key={value} href={value ? `?year=${value}` : `/student-records/${encodeURIComponent(studentId)}`}
                  replace scroll={false} prefetch={false} aria-current={selected === value ? "true" : undefined}>
                  {value === "unrecorded" ? "Year not recorded" : value ? `Year ${value}` : "All years"}
                </Link>
              ))}
            </nav>
            <p className={styles.note}>{submissions.length} {submissions.length === 1 ? "submission" : "submissions"} · {fileCount} {fileCount === 1 ? "file" : "files"}</p>
            {submissions.length === 0 && <p className={styles.empty}>{selected ? "No submissions match this year filter." : "No submissions for this student."}</p>}
            {submissions.map((record) => (
              <article key={record.id} className={styles.submission}>
                <header className={styles.submissionHeader}>
                  <div>
                    <p className={styles.category}>{record.type.toLowerCase()}</p>
                    <h3>{record.title}</h3>
                  </div>
                  <span className={styles.status} data-status={record.status}>{statusLabels[record.status]}</span>
                </header>
                <p className={styles.description}>{record.description}</p>
                <dl className={styles.profileInfo}>
                  <div><dt>Submitted</dt><dd>{formatDate(record.submittedAt ?? record.createdAt)}</dd></div>
                  <div><dt>Year of study at submission</dt><dd>{record.yearOfStudy ? `Year ${record.yearOfStudy}` : "Year not recorded"}</dd></div>
                  {record.academicYear && <div><dt>Academic year at submission</dt><dd>{record.academicYear}</dd></div>}
                  {record.status === "REJECTED" && record.approvals[0]?.comment && (
                    <div><dt>Rejection reason</dt><dd>{record.approvals[0].comment}</dd></div>
                  )}
                </dl>
                <div className={styles.attachments}>
                  <h4>Uploaded files</h4>
                  {record.documents.length === 0 && <p className={styles.note}>No files attached.</p>}
                  {record.documents.map((document) => (
                    <details key={document.id} className={styles.file}>
                      <summary>
                        <span className={styles.fileType} aria-hidden="true">{document.mimeType === "application/pdf" ? "PDF" : "FILE"}</span>
                        <span className={styles.fileName}>{document.fileName}</span>
                        <span className={styles.fileSize}>{Math.ceil(document.sizeBytes / 1024)} KB</span>
                      </summary>
                      <dl className={styles.profileInfo}>
                        <div><dt>Type</dt><dd>{document.mimeType === "application/pdf" ? "PDF" : "FILE"}</dd></div>
                        <div><dt>Size</dt><dd>{Math.ceil(document.sizeBytes / 1024)} KB</dd></div>
                        <div><dt>Uploaded</dt><dd>{document.createdAt ? formatDate(document.createdAt) : "?"}</dd></div>
                      </dl>
                      {["COMPETITION", "CERTIFICATE", "INTERNSHIP", "PUBLICATION", "PATENT", "AWARD"].includes(record.type) && (
                        <a className={styles.documentLink} href={`${api}/api/v1/achievements/${record.id}/documents/${document.id}`}>
                          Download {document.fileName}
                        </a>
                      )}
                    </details>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
