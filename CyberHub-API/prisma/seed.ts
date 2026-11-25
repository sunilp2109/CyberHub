import argon2 from "argon2";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const identifier = process.env.BOOTSTRAP_ADMIN_IDENTIFIER;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!identifier || !password) {
  throw new Error("BOOTSTRAP_ADMIN_IDENTIFIER and BOOTSTRAP_ADMIN_PASSWORD are required.");
}

if (password.length < 10) {
  throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 10 characters.");
}

async function createUser(
  userIdentifier: string,
  userPassword: string,
  name: string,
  role: UserRole,
) {
  const passwordHash = await argon2.hash(userPassword);
  return prisma.user.upsert({
    where: { identifier: userIdentifier.toLowerCase() },
    update: { active: true, passwordHash, role },
    create: {
      identifier: userIdentifier.toLowerCase(),
      email: userIdentifier.includes("@") ? userIdentifier.toLowerCase() : undefined,
      name,
      passwordHash,
      role,
    },
  });
}

const department = await prisma.department.upsert({
  where: { code: "CSE" },
  update: {},
  create: { code: "CSE", name: "Computer Science and Engineering" },
});

const admin = await createUser(identifier, password, "System Administrator", UserRole.ADMIN);
await prisma.user.update({ where: { id: admin.id }, data: { departmentId: department.id } });

const departmentAdminIdentifier = process.env.BOOTSTRAP_DEPARTMENT_ADMIN_IDENTIFIER?.trim().toLowerCase();
const departmentAdminPassword = process.env.BOOTSTRAP_DEPARTMENT_ADMIN_PASSWORD;
const departmentCode = process.env.BOOTSTRAP_DEPARTMENT_ADMIN_CODE?.trim().toUpperCase();
if (departmentAdminIdentifier || departmentAdminPassword || departmentCode) {
  if (!departmentAdminIdentifier || !departmentCode || !departmentAdminPassword || departmentAdminPassword.length < 10) {
    throw new Error("Provide a Department Admin identifier, an existing department code, and a password of at least 10 characters.");
  }
  const assigned = await prisma.department.findUnique({ where: { code: departmentCode } });
  if (!assigned?.active) throw new Error("Department Admin must be assigned to an active department.");
  const existing = await prisma.user.findUnique({ where: { identifier: departmentAdminIdentifier } });
  if (existing && (existing.role !== UserRole.DEPARTMENT_ADMIN || existing.departmentId !== assigned.id)) {
    throw new Error("The identifier belongs to another role or department. Choose a distinct Department Admin identifier.");
  }
  if (!existing) {
    await prisma.user.create({ data: {
      identifier: departmentAdminIdentifier, name: "Department Administrator",
      email: departmentAdminIdentifier.includes("@") ? departmentAdminIdentifier : undefined,
      passwordHash: await argon2.hash(departmentAdminPassword), role: UserRole.DEPARTMENT_ADMIN, departmentId: assigned.id,
    } });
  }
}

const studentIdentifier = process.env.BOOTSTRAP_STUDENT_IDENTIFIER;
const studentPassword = process.env.BOOTSTRAP_STUDENT_PASSWORD;
if (studentIdentifier && studentPassword) {
  if (studentPassword.length < 10) throw new Error("BOOTSTRAP_STUDENT_PASSWORD must be at least 10 characters.");
  const student = await createUser(studentIdentifier, studentPassword, "UAT Student", UserRole.STUDENT);
  await prisma.student.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      registerNo: studentIdentifier.toUpperCase(),
      department: "Computer Science",
      departmentId: department.id,
      programme: "B.Tech Cybersecurity",
      batch: "2024-2028",
      semester: 5,
    },
  });
}

await prisma.$disconnect();
