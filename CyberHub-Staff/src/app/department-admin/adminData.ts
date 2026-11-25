export type ModuleId = "students" | "faculty" | "academic-years" | "classes" | "subjects" | "allocations";
export type Row = Record<string, string> & { id: string };
export type Records = Record<ModuleId, Row[]>;
export type AdminAccount = { id: string; name: string; email?: string | null; identifier: string; department: { id: string; code: string; name: string } };
export type AuditEntry = { id: string; user: string; action: string; module: string; detail: string; at: string; recordId?: string };
export type Settings = { defaultYear: string; reviewAlerts: boolean; avatar?: string };
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
const academicYear: Field = { key: "academicYear", label: "Academic year", ref: "academic-years", required: true };
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
    unique: ["registerNumber", "email"], columns: ["name", "registerNumber", "academicYear", "year", "section", "email", "status"],
    filters: ["academicYear", "year", "section", "status"],
    groups: [
      { label: "Personal information", fields: [fullName, { key: "registerNumber", label: "Register number", required: true },
        { key: "dob", label: "Date of birth", type: "date" }, { key: "gender", label: "Gender", options: ["Woman", "Man", "Non-binary", "Prefer not to say"] }, email, phone] },
      { label: "Academic information", fields: [academicYear, { key: "admissionYear", label: "Admission year", type: "number", min: 1900, max: 2100, required: true },
        programme, studyYear, section, batch] },
      { label: "Account information", fields: [{ ...currentStatus, label: "Account status" }] },
    ],
  },
  {
    id: "faculty", label: "Faculty", singular: "faculty member", action: "Add faculty", icon: "faculty",
    description: "Manage faculty profiles, teaching assignments, and account status.",
    unique: ["employeeId", "email"], columns: ["name", "employeeId", "email", "phone", "designation", "assignedClasses", "status"],
    filters: ["status"], groups: [
      { label: "Profile information", fields: [fullName, { key: "employeeId", label: "Employee ID", required: true }, email, phone] },
      { label: "Employment and account", fields: [{ key: "designation", label: "Designation", required: true },
        { key: "qualification", label: "Qualification" }, { ...currentStatus, label: "Account status" }] },
    ],
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
    columns: ["name", "degree", "academicYear", "year", "section", "batch", "studentsCount"], filters: ["academicYear", "degree", "year", "section", "batch"],
    groups: [{ label: "Class details", fields: [{ key: "name", label: "Class name", required: true }, academicYear, programme, studyYear, section, batch] }],
  },
  {
    id: "subjects", label: "Subjects", singular: "subject", action: "Add subject", icon: "book",
    description: "Maintain the subject catalog by semester and academic year.",
    columns: ["code", "name", "semester", "credits", "academicYear"], filters: ["academicYear", "semester"],
    groups: [{ label: "Subject information", fields: [{ key: "code", label: "Subject code", required: true }, { key: "name", label: "Subject name", required: true },
      academicYear, semester, { key: "credits", label: "Credits", type: "number", min: 0, max: 30, required: true }] }],
  },
  {
    id: "allocations", label: "Faculty Allocation", singular: "allocation", action: "Assign faculty", icon: "allocation",
    description: "Assign faculty to subjects and sections and review teaching allocations.",
    columns: ["faculty", "classId", "section", "subject", "academicYear", "semester", "status"],
    filters: ["academicYear", "semester", "status"],
    groups: [{ label: "Teaching assignment", fields: [academicYear,
      { key: "classId", label: "Class", ref: "classes", match: ["academicYear"], required: true },
      { ...section, ref: "classes", match: ["classId"], options: undefined }, semester,
      { key: "subject", label: "Subject", ref: "subjects", match: ["academicYear", "semester"], required: true },
      { key: "faculty", label: "Faculty member", ref: "faculty", required: true }, currentStatus] }],
  },
];

export const navGroups = [
  { label: "Overview", links: [{ id: "dashboard", label: "Dashboard", icon: "dashboard" }] },
  { label: "Department management", links: [modules[0], modules[1], modules[3], modules[4], modules[2]] },
  { label: "Academic operations", links: [modules[5],
    { id: "documents", label: "Document Verification", icon: "file" },
    { id: "achievements", label: "Achievements", icon: "badge" },
    { id: "reports", label: "Reports & Analytics", icon: "chart" }] },
  { label: "Account", links: [{ id: "profile", label: "Profile", icon: "users" }, { id: "settings", label: "Settings", icon: "settings" }] },
];

export const links = navGroups.flatMap(({ links }) => links);
export const adminHref = (id: string) => id === "dashboard" ? "/department-admin" : `/department-admin/${id}`;
export const getModule = (id: string) => modules.find((entry) => entry.id === id);
export const getSection = (id: string) => links.find((entry) => entry.id === id);
export const moduleFields = (entry: AdminModule) => entry.groups.flatMap(({ fields }) => fields);

const columnLabels: Record<string, string> = { assignedClasses: "Assigned classes", studentsCount: "Students" };
export function inClass(student: Row, section: Row) {
  return ["academicYear", "degree", "year", "section", "batch"].every((key) => student[key] === section[key]);
}

export function classGroup(row: Row) {
  return JSON.stringify([row.name.trim().toLowerCase(), row.academicYear, row.degree, row.year, row.batch]);
}

export function fieldLabel(entry: AdminModule, key: string) {
  if (key === "name" && entry.id === "students") return "Student name";
  if (key === "name" && entry.id === "faculty") return "Faculty name";
  return columnLabels[key] ?? moduleFields(entry).find((field) => field.key === key)?.label ?? key;
}

export function cellValue(entry: AdminModule, row: Row, key: string, records: Records): string {
  const value = row[key] ?? "";
  if (key === "assignedClasses") return String(new Set(records.allocations.filter((a) => a.faculty === row.id && a.status === "Active").map((a) => a.classId)).size);
  if (key === "studentsCount") return String(records.students.filter((student) => inClass(student, row)).length);
  const field = moduleFields(entry).find((item) => item.key === key);
  if (!field?.ref || key === "section") return value;
  const ref = records[field.ref].find((item) => item.id === value);
  return ref?.name ?? "";
}

export function fieldOptions(field: Field, values: Record<string, string>, records: Records) {
  if (!field.ref) return field.options?.map((item) => ({ value: item, label: item }));
  if (field.key === "classId") {
    const groups = new Map<string, { value: string; label: string }>();
    for (const row of records.classes.filter(({ academicYear }) => academicYear === values.academicYear)) {
      if (!groups.has(classGroup(row))) groups.set(classGroup(row), { value: row.id, label: `${row.name} · ${row.degree} · Year ${row.year} · ${row.batch}` });
    }
    const selected = records.classes.find((row) => row.id === values.classId && row.academicYear === values.academicYear);
    if (selected) {
      const option = groups.get(classGroup(selected));
      if (option) option.value = selected.id;
    }
    return Array.from(groups.values());
  }
  if (field.key === "section") {
    const chosenClass = records.classes.find((item) => item.id === values.classId);
    return chosenClass ? records.classes.filter((row) => classGroup(row) === classGroup(chosenClass))
      .map(({ section }) => ({ value: section, label: section })).sort((a, b) => a.label.localeCompare(b.label)) : [];
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
    else if (value && (field.ref || field.options) && !fieldOptions(field, values, records)?.some((option) => option.value === value)) {
      errors[field.key] = `Choose a valid ${field.label.toLowerCase()}.`;
    } else if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.key] = "Enter a valid email address.";
    } else if (value && field.type === "number" && (!/^\d+$/.test(value) || Number(value) < (field.min ?? 0) || Number(value) > (field.max ?? 9999))) {
      errors[field.key] = `Enter a whole number between ${field.min ?? 0} and ${field.max ?? 9999}.`;
    } else if (value && field.type === "date") {
      const parsed = new Date(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
        errors[field.key] = "Enter a valid date.";
      }
    } else if (value && entry.unique?.includes(field.key) && records[entry.id].some((r) =>
      r.id !== id && r[field.key]?.toLowerCase() === value.toLowerCase())) {
      errors[field.key] = `${field.label} is already in use.`;
    }
  }
  if (values.endDate && values.startDate > values.endDate) errors.endDate = "End date must be on or after the start date.";
  if (entry.id === "students" && values.dob && values.dob > new Date().toISOString().slice(0, 10)) errors.dob = "Date of birth cannot be in the future.";
  if (entry.id === "academic-years" && values.status === "Active" && records["academic-years"].some((row) => row.id !== id && row.status === "Active")) {
    errors.status = "Only one academic year can be active. Complete the current year first.";
  }
  const previous = records[entry.id].find((row) => row.id === id);
  if (previous && entry.id === "faculty" && values.status !== "Active" && records.allocations.some((row) => row.faculty === id && row.status === "Active")) {
    errors.status = "End active teaching allocations before deactivating this account.";
  }
  if (previous && (entry.id === "classes" || entry.id === "subjects")) {
    const reference = entry.id === "classes" ? "classId" : "subject";
    const keys = entry.id === "classes" ? ["name", "academicYear", "degree", "year", "section", "batch"] : ["academicYear", "semester"];
    if (keys.some((key) => previous[key] !== values[key]) && records.allocations.some((row) => row[reference] === id
      || (entry.id === "classes" && row.section === previous.section
        && records.classes.some((item) => item.id === row.classId && classGroup(item) === classGroup(previous))))) {
      errors.academicYear = "This record is linked to an allocation. Add a new class section or subject for the change.";
    }
  }
  const compound = entry.id === "allocations" ? ["faculty", "classId", "section", "subject", "academicYear", "semester"]
    : entry.id === "classes" ? ["name", "degree", "academicYear", "year", "section", "batch"]
    : entry.id === "subjects" ? ["code", "academicYear"] : [];
  if (compound.length && compound.every((key) => values[key]) && records[entry.id].some((r) => r.id !== id
    && compound.every((key) => r[key]?.toLowerCase() === values[key].toLowerCase()))) {
    errors[compound[0]] = "A record with this combination already exists.";
  }
  return errors;
}
