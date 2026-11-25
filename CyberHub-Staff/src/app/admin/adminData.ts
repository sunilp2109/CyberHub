export type ModuleId = "students" | "faculty" | "departments" | "academic-years" | "classes" | "subjects" | "allocations" | "hod";
export type Row = Record<string, string> & { id: string };
export type Records = Record<ModuleId, Row[]>;
export type AdminAccount = { id: string; name: string; email?: string | null };
export type AuditEntry = { id: string; user: string; action: string; module: string; detail: string; at: string; ip?: string; recordId?: string };
export type Settings = { organization: string; defaultYear: string; reviewAlerts: boolean; activityAlerts: boolean; theme: "light" | "dark" };
export type AdminData = { records: Records; audit: AuditEntry[]; settings: Settings };

type Field = {
  key: string;
  label: string;
  type?: "email" | "tel" | "date" | "number" | "textarea";
  options?: string[];
  ref?: ModuleId;
  match?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  defaultValue?: string;
};

export type AdminModule = {
  id: ModuleId;
  label: string;
  singular: string;
  action: string;
  description: string;
  icon: string;
  unique?: string[];
  columns: string[];
  filters: string[];
  groups: { label: string; fields: Field[] }[];
};

const active = ["Active", "Inactive"];
const degree = ["B.Tech", "B.Sc.", "M.Tech", "M.Sc."];
const years = ["1", "2", "3", "4"];
const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];
const departments: Field = { key: "department", label: "Department", ref: "departments", required: true };
const academicYear: Field = { key: "academicYear", label: "Academic year", ref: "academic-years", required: true };
const departmentYear = [departments, academicYear];
const currentStatus: Field = { key: "status", label: "Status", options: active, required: true, defaultValue: "Active" };
const programme: Field = { key: "degree", label: "Degree", options: degree, required: true };
const studyYear: Field = { key: "year", label: "Year", options: years, required: true };
const section: Field = { key: "section", label: "Section", options: ["A", "B", "C", "D"], required: true };
const semester: Field = { key: "semester", label: "Semester", options: semesters, required: true };
const batch: Field = { key: "batch", label: "Batch", required: true };
const start: Field = { key: "startDate", label: "Start date", type: "date", required: true };
const end: Field = { key: "endDate", label: "End date", type: "date" };
const email: Field = { key: "email", label: "Email", type: "email", required: true };
const phone: Field = { key: "phone", label: "Phone number", type: "tel" };
const fullName: Field = { key: "name", label: "Full name", required: true };

export const modules: AdminModule[] = [
  {
    id: "students", label: "Students", singular: "student", action: "Add student", icon: "users",
    description: "Manage enrollment, academic records, and student account status.",
    unique: ["registerNumber", "email"], columns: ["name", "registerNumber", "department", "academicYear", "year", "section", "email", "status"],
    filters: ["department", "academicYear", "year", "section", "status"],
    groups: [
      { label: "Personal information", fields: [fullName, { key: "registerNumber", label: "Register number", required: true },
        { key: "dob", label: "Date of birth", type: "date" }, { key: "gender", label: "Gender", options: ["Woman", "Man", "Non-binary", "Prefer not to say"] }, email, phone] },
      { label: "Academic information", fields: [...departmentYear, { key: "admissionYear", label: "Admission year", type: "number", min: 1900, max: 2100, required: true },
        programme, studyYear, section, batch] },
      { label: "Account information", fields: [currentStatus, { key: "login", label: "Login activation", options: ["Enabled", "Disabled"], defaultValue: "Enabled", required: true }] },
    ],
  },
  {
    id: "faculty", label: "Faculty", singular: "faculty member", action: "Add faculty", icon: "faculty",
    description: "Manage faculty profiles, department membership, and teaching assignments.",
    unique: ["employeeId", "email"], columns: ["name", "employeeId", "email", "phone", "department", "designation", "assignedClasses", "status"],
    filters: ["department", "status"], groups: [
      { label: "Profile information", fields: [fullName, { key: "employeeId", label: "Employee ID", required: true }, email, phone] },
      { label: "Department and account", fields: [departments, { key: "designation", label: "Designation", required: true }, { key: "qualification", label: "Qualification" }, currentStatus,
        { key: "login", label: "Account activation", options: ["Enabled", "Disabled"], defaultValue: "Enabled", required: true }] },
    ],
  },
  {
    id: "departments", label: "Departments", singular: "department", action: "Create department", icon: "building",
    description: "Maintain department records, leadership, and institutional structure.",
    unique: ["code", "name"], columns: ["name", "code", "description", "hod", "studentsCount", "facultyCount", "status"], filters: ["status"],
    groups: [{ label: "Department information", fields: [{ key: "name", label: "Department name", required: true }, { key: "code", label: "Department code", required: true },
      { key: "description", label: "Description", type: "textarea" }, currentStatus] }],
  },
  {
    id: "academic-years", label: "Academic Years", singular: "academic year", action: "Create academic year", icon: "calendar",
    description: "Set the academic calendar and manage active and historical years.",
    unique: ["name"], columns: ["name", "startDate", "endDate", "status"], filters: ["status"],
    groups: [{ label: "Academic period", fields: [{ key: "name", label: "Academic year", required: true }, start, { ...end, required: true },
      { ...currentStatus, options: ["Active", "Upcoming", "Completed"], defaultValue: "Upcoming" }] }],
  },
  {
    id: "classes", label: "Classes & Sections", singular: "class", action: "Create class", icon: "layers",
    description: "Organize classes and sections by department, degree, and academic year.",
    columns: ["name", "department", "degree", "academicYear", "year", "section", "batch", "studentsCount"], filters: ["department", "academicYear", "year", "section"],
    groups: [{ label: "Class details", fields: [{ key: "name", label: "Class name", required: true }, ...departmentYear, programme, studyYear, section, batch] }],
  },
  {
    id: "subjects", label: "Subjects", singular: "subject", action: "Add subject", icon: "book",
    description: "Maintain the subject catalog for each department, semester, and academic year.",
    columns: ["code", "name", "department", "semester", "credits", "academicYear"], filters: ["department", "academicYear", "semester"],
    groups: [{ label: "Subject information", fields: [{ key: "code", label: "Subject code", required: true }, { key: "name", label: "Subject name", required: true },
      ...departmentYear, semester, { key: "credits", label: "Credits", type: "number", min: 0, max: 30, required: true }] }],
  },
  {
    id: "allocations", label: "Faculty Allocation", singular: "allocation", action: "Assign faculty", icon: "allocation",
    description: "Assign faculty to subjects and sections and review teaching allocations.",
    columns: ["faculty", "department", "classId", "section", "subject", "academicYear", "semester", "status"],
    filters: ["department", "academicYear", "semester", "status"],
    groups: [{ label: "Teaching assignment", fields: [academicYear, departments,
      { key: "classId", label: "Class", ref: "classes", match: ["department", "academicYear"], required: true },
      { ...section, ref: "classes", match: ["classId"], options: undefined }, semester,
      { key: "subject", label: "Subject", ref: "subjects", match: ["department", "academicYear", "semester"], required: true },
      { key: "faculty", label: "Faculty member", ref: "faculty", match: ["department"], required: true }, currentStatus] }],
  },
  {
    id: "hod", label: "HOD Management", singular: "appointment", action: "Appoint HOD", icon: "badge",
    description: "Appoint department heads from existing faculty and maintain appointment history.",
    columns: ["faculty", "employeeId", "department", "startDate", "endDate", "status"], filters: ["department", "status"],
    groups: [{ label: "Appointment details", fields: [departments, { key: "faculty", label: "Faculty member", ref: "faculty", match: ["department"], required: true },
      start, end, { ...currentStatus, options: ["Active", "Scheduled", "Ended", "Revoked"] }] }],
  },
];

export const navGroups = [
  { label: "Overview", links: [{ id: "dashboard", label: "Dashboard", icon: "dashboard" }] },
  { label: "Academic management", links: modules.slice(0, 7) },
  { label: "Administration", links: [modules[7], { id: "roles", label: "User Roles & Permissions", icon: "shield" }, { id: "documents", label: "Document Management", icon: "file" }] },
  { label: "Analytics", links: [{ id: "reports", label: "Reports & Analytics", icon: "chart" }] },
  { label: "System", links: [{ id: "audit", label: "Audit Logs", icon: "history" }, { id: "settings", label: "Settings", icon: "settings" }] },
];

export const links = navGroups.flatMap(({ links }) => links);
export const adminHref = (id: string) => id === "dashboard" ? "/admin" : `/admin/${id}`;
export const getModule = (id: string) => modules.find((entry) => entry.id === id);
export const getSection = (id: string) => links.find((entry) => entry.id === id);
export const moduleFields = (entry: AdminModule) => entry.groups.flatMap(({ fields }) => fields);

const columnLabels: Record<string, string> = {
  assignedClasses: "Assigned classes", studentsCount: "Students", facultyCount: "Faculty",
  hod: "Assigned HOD", employeeId: "Employee ID",
};
export function fieldLabel(entry: AdminModule, key: string) {
  if (key === "name" && entry.id === "students") return "Student name";
  if (key === "name" && entry.id === "faculty") return "Faculty name";
  if (key === "faculty" && entry.id === "hod") return "HOD name";
  return columnLabels[key] ?? moduleFields(entry).find((field) => field.key === key)?.label ?? key;
}

export function cellValue(entry: AdminModule, row: Row, key: string, records: Records): string {
  const value = row[key] ?? "";
  if (key === "assignedClasses") return String(new Set(records.allocations.filter((a) => a.faculty === row.id && a.status === "Active").map((a) => a.classId)).size);
  if (key === "hod") {
    const current = records.hod.find((a) => a.department === row.id && a.status === "Active");
    return records.faculty.find((f) => f.id === current?.faculty)?.name ?? "";
  }
  if (key === "studentsCount") {
    return String(records.students.filter((student) => student.department === (entry.id === "classes" ? row.department : row.id)
      && (entry.id !== "classes" || ["academicYear", "degree", "year", "section", "batch"].every((k) => student[k] === row[k]))).length);
  }
  if (key === "facultyCount") return String(records.faculty.filter((faculty) => faculty.department === row.id).length);
  if (key === "employeeId" && entry.id === "hod") return records.faculty.find((faculty) => faculty.id === row.faculty)?.employeeId ?? "";
  const field = moduleFields(entry).find((item) => item.key === key);
  if (!field?.ref || key === "section") return value;
  const ref = records[field.ref].find((item) => item.id === value);
  return ref?.name ?? "";
}

export function fieldOptions(field: Field, values: Record<string, string>, records: Records) {
  if (!field.ref) return field.options?.map((item) => ({ value: item, label: item }));
  if (field.key === "section") {
    const chosenClass = records.classes.find((item) => item.id === values.classId);
    return chosenClass ? [{ value: chosenClass.section, label: chosenClass.section }] : [];
  }
  if ((field.key === "subject" || field.key === "faculty") && "classId" in values
    && (!values.classId || !values.section || !values.semester || (field.key === "faculty" && !values.subject))) return [];
  return records[field.ref]
    .filter((row) => (!field.match || field.match.every((key) => values[key] && row[key] === values[key]))
      && (field.ref !== "faculty" || row.status === "Active"))
    .map((row) => ({ value: row.id, label: row.name }));
}

export function validateRow(entry: AdminModule, values: Record<string, string>, records: Records, id?: string) {
  const errors: Record<string, string> = {};
  for (const field of moduleFields(entry)) {
    const value = values[field.key]?.trim();
    if (field.required && !value) errors[field.key] = `${field.label} is required.`;
    else if (value && field.ref && !fieldOptions(field, values, records)?.some((option) => option.value === value)) {
      errors[field.key] = `Choose a valid ${field.label.toLowerCase()}.`;
    } else if (value && entry.unique?.includes(field.key) && records[entry.id].some((r) =>
      r.id !== id && r[field.key]?.toLowerCase() === value.toLowerCase())) {
      errors[field.key] = `${field.label} is already in use.`;
    }
  }
  if (values.endDate && values.startDate > values.endDate) errors.endDate = "End date must be on or after the start date.";
  if (entry.id === "students" && values.dob && values.dob > new Date().toISOString().slice(0, 10)) errors.dob = "Date of birth cannot be in the future.";
  if (entry.id === "hod" && values.status === "Active" && records.hod.some((r) => r.id !== id && r.department === values.department && r.status === "Active")) {
    errors.department = "This department already has an active HOD. End or revoke that appointment first.";
  }
  if (entry.id === "academic-years" && values.status === "Active" && records["academic-years"].some((row) => row.id !== id && row.status === "Active")) {
    errors.status = "Only one academic year can be active. Complete the current year first.";
  }
  const previous = records[entry.id].find((row) => row.id === id);
  if (previous && entry.id === "faculty" && (records.hod.some((row) => row.faculty === id && row.status === "Active")
    || records.allocations.some((row) => row.faculty === id && row.status === "Active"))) {
    if (values.status !== "Active" || values.department !== previous.department) {
      errors.status = "End this faculty member’s active teaching allocations and HOD appointment before deactivating or moving the account.";
    }
  }
  if (previous && (entry.id === "classes" || entry.id === "subjects")) {
    const reference = entry.id === "classes" ? "classId" : "subject";
    const keys = ["department", "academicYear", entry.id === "classes" ? "section" : "semester"];
    if (keys.some((key) => previous[key] !== values[key]) && records.allocations.some((row) => row[reference] === id && row.status === "Active")) {
      errors.department = "End the active faculty allocations before changing the linked department, academic year, section, or semester.";
    }
  }
  const compound = entry.id === "allocations" ? ["faculty", "classId", "section", "subject", "academicYear", "semester"]
    : entry.id === "classes" ? ["department", "degree", "academicYear", "year", "section", "batch"]
    : entry.id === "subjects" ? ["code", "department", "academicYear"] : [];
  if (compound.length && compound.every((key) => values[key]) && records[entry.id].some((r) => r.id !== id
    && compound.every((key) => r[key]?.toLowerCase() === values[key].toLowerCase()))) {
    errors[compound[0]] = "A record with this combination already exists.";
  }
  return errors;
}

export const initialSettings: Settings = {
  organization: "CyberHub", defaultYear: "ay-26", reviewAlerts: true, activityAlerts: true, theme: "light",
};

export function makeAdminDemo(): AdminData {
  const departmentRows = [
    { id: "cse", name: "Computer Science", code: "CSE", description: "Computing, software engineering, and data systems.", status: "Active" },
    { id: "cyb", name: "Cybersecurity", code: "CYB", description: "Security engineering and digital investigations.", status: "Active" },
    { id: "it", name: "Information Technology", code: "IT", description: "Applied information and network systems.", status: "Active" },
    { id: "ece", name: "Electronics & Communication", code: "ECE", description: "Electronics, signals, and communications.", status: "Active" },
  ];
  const academicRows = [
    { id: "ay-24", name: "2024–25", startDate: "2024-07-01", endDate: "2025-06-30", status: "Completed" },
    { id: "ay-25", name: "2025–26", startDate: "2025-07-01", endDate: "2026-06-30", status: "Completed" },
    { id: "ay-26", name: "2026–27", startDate: "2026-07-01", endDate: "2027-06-30", status: "Active" },
  ];
  const names = ["Aarav Mehta", "Ananya Iyer", "Rohan Nair", "Diya Rao", "Nisha Menon", "Kabir Shah", "Meera Das", "Vihaan Patel",
    "Ishaan Singh", "Sara Joseph", "Priya Thomas", "Arjun Kumar", "Sana Khan", "Dev Kapoor", "Neha Joshi", "Aditi Verma"];
  const students = names.map((name, index) => {
    const d = departmentRows[index < 7 ? 0 : index < 12 ? 1 : index < 15 ? 2 : 3];
    const year = index < 10 ? "1" : index < 14 ? "2" : "3";
    const academicYear = index < 10 ? "ay-26" : index < 14 ? "ay-25" : "ay-24";
    return { id: `student-${index + 1}`, name, registerNumber: `${d.code}${String(index + 1).padStart(4, "0")}`,
      department: d.id, academicYear, year, section: index % 3 === 0 ? "B" : "A", degree: "B.Tech",
      batch: year === "1" ? "2026–2030" : year === "2" ? "2025–2029" : "2024–2028",
      admissionYear: year === "1" ? "2026" : year === "2" ? "2025" : "2024",
      email: `${name.toLowerCase().replace(" ", ".")}@example.edu`, phone: "", dob: "", gender: "",
      status: index === 15 ? "Inactive" : "Active", login: index === 15 ? "Disabled" : "Enabled" };
  });
  const faculty = ["Anika Sharma", "Vikram Rao", "Ritu Menon", "Sameer Ghosh", "Divya Kumar", "Neel Iyer"].map((name, index) => ({
    id: `faculty-${index + 1}`, name, employeeId: `FAC-0${index + 21}`, email: `${name.toLowerCase().replace(" ", ".")}@example.edu`,
    phone: "", department: departmentRows[index < 2 ? 0 : index < 4 ? 1 : index - 2].id,
    designation: index % 2 ? "Assistant Professor" : "Associate Professor", qualification: "Ph.D.", status: "Active", login: "Enabled",
  }));
  const classes = departmentRows.flatMap(({ id, code }) => ["A", "B"].map((section) => ({
    id: `class-${id}-${section}`, name: `${code} · Year 1 ${section}`, department: id, academicYear: "ay-26", degree: "B.Tech", year: "1", section, batch: "2026–2030",
  })));
  const subjects = departmentRows.map(({ id, code }, index) => ({
    id: `subject-${id}`, code: `${code}101`, name: ["Programming Fundamentals", "Foundations of Security", "Information Systems", "Digital Electronics"][index],
    department: id, academicYear: "ay-26", semester: "1", credits: "4",
  }));
  return {
    records: { students, faculty, departments: departmentRows, "academic-years": academicRows, classes, subjects,
      allocations: [
        { id: "allocation-1", faculty: "faculty-1", department: "cse", classId: "class-cse-A", section: "A", subject: "subject-cse", academicYear: "ay-26", semester: "1", status: "Active" },
        { id: "allocation-2", faculty: "faculty-3", department: "cyb", classId: "class-cyb-A", section: "A", subject: "subject-cyb", academicYear: "ay-26", semester: "1", status: "Active" },
      ],
      hod: [{ id: "hod-1", faculty: "faculty-1", department: "cse", startDate: "2026-07-01", endDate: "2027-06-30", status: "Active" }],
    },
    audit: [
      { id: "audit-1", user: "Demo administrator", action: "Created", module: "Students", detail: "Registered Aarav Mehta", at: "2026-11-24T10:30:00Z" },
      { id: "audit-2", user: "Demo administrator", action: "Created", module: "Faculty", detail: "Added Anika Sharma", at: "2026-11-23T09:00:00Z" },
      { id: "audit-3", user: "Demo administrator", action: "Assigned", module: "Faculty Allocation", detail: "Assigned Foundations of Security to Ritu Menon", at: "2026-11-22T08:15:00Z" },
      { id: "audit-4", user: "Demo administrator", action: "Appointed", module: "HOD Management", detail: "Appointed Anika Sharma as Head of Computer Science", at: "2026-11-21T07:45:00Z" },
    ],
    settings: { ...initialSettings },
  };
}
