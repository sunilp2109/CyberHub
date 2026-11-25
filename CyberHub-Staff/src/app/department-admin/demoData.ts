import "server-only";
import type { AdminAccount, AdminData, Records } from "./adminData";

export function makeWorkspace(department: AdminAccount["department"], demo: boolean): AdminData {
  const settings = { defaultYear: demo ? "ay-26" : "", reviewAlerts: true, theme: "light" } as const;
  const records: Records = { students: [], faculty: [], classes: [], subjects: [], allocations: [], "academic-years": [] };
  const data: AdminData = { records, settings, audit: [] };
  if (!demo) return data;
  const departmentId = department.id;
  records["academic-years"] = [
    { id: "ay-24", departmentId, name: "2024–25", startDate: "2024-07-01", endDate: "2025-06-30", status: "Completed" },
    { id: "ay-25", departmentId, name: "2025–26", startDate: "2025-07-01", endDate: "2026-06-30", status: "Completed" },
    { id: "ay-26", departmentId, name: "2026–27", startDate: "2026-07-01", endDate: "2027-06-30", status: "Active" },
  ];
  const names = ["Aarav Mehta", "Ananya Iyer", "Rohan Nair", "Diya Rao", "Nisha Menon", "Kabir Shah", "Meera Das", "Vihaan Patel",
    "Ishaan Singh", "Sara Joseph", "Priya Thomas", "Arjun Kumar", "Sana Khan", "Dev Kapoor", "Neha Joshi", "Aditi Verma"];
  records.students = names.map((name, index) => {
    const admissionYear = index < 10 ? 2026 : index < 14 ? 2025 : 2024;
    return { id: `sample-student-${index + 1}`, name, departmentId, registerNumber: `DEMO-${department.code}-${index + 101}`,
      academicYear: `ay-${String(admissionYear).slice(-2)}`, year: String(2027 - admissionYear), section: index % 3 === 0 ? "B" : "A",
      degree: "B.Tech", batch: `${admissionYear}–${admissionYear + 4}`, admissionYear: String(admissionYear),
      email: `${name.toLowerCase().replace(" ", ".")}@example.edu`, phone: "", dob: "", gender: "", status: index === 15 ? "Inactive" : "Active" };
  });
  records.faculty = ["Anika Sharma", "Vikram Rao", "Ritu Menon", "Sameer Ghosh", "Divya Kumar"].map((name, index) => ({
    id: `sample-faculty-${index + 1}`, name, departmentId, employeeId: `DEMO-FAC-${index + 21}`,
    email: `${name.toLowerCase().replace(" ", ".")}@example.edu`, phone: "",
    designation: index % 2 ? "Assistant Professor" : "Associate Professor", qualification: "Ph.D.", status: "Active",
  }));
  records.classes = [2026, 2025].flatMap((admissionYear, index) => ["A", "B"].map((section) => ({
    id: `sample-class-${index + 1}-${section}`, name: `Year ${index + 1} Cohort`, departmentId, section, degree: "B.Tech",
    academicYear: `ay-${String(admissionYear).slice(-2)}`, year: String(index + 1), batch: `${admissionYear}–${admissionYear + 4}`,
  })));
  records.subjects = ["Programming Fundamentals", "Foundations of Security", "Information Systems"].map((name, index) => ({
    id: `sample-subject-${index + 1}`, name, departmentId, code: `${department.code}${101 + index}`, academicYear: "ay-26", semester: index < 2 ? "1" : "2", credits: "4",
  }));
  records.allocations = [
    { id: "sample-allocation-1", faculty: "sample-faculty-1", departmentId, classId: "sample-class-1-A",
      section: "A", subject: "sample-subject-1", academicYear: "ay-26", semester: "1", status: "Active" },
    { id: "sample-allocation-2", faculty: "sample-faculty-2", departmentId, classId: "sample-class-1-A",
      section: "B", subject: "sample-subject-2", academicYear: "ay-26", semester: "1", status: "Active" },
  ];
  data.audit = [
    { id: "sample-audit-1", user: "Demo administrator", action: "Created", module: "Students", detail: "Registered Aarav Mehta", at: "2026-11-24T10:30:00Z", recordId: "sample-student-1" },
    { id: "sample-audit-2", user: "Demo administrator", action: "Assigned", module: "Faculty Allocation", detail: "Assigned Programming Fundamentals to Anika Sharma", at: "2026-11-23T08:15:00Z", recordId: "sample-allocation-1" },
  ];
  return data;
}
