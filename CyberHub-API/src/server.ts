import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import Fastify, { type FastifyReply, FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import argon2 from "argon2";
import { AchievementStatus, AchievementType, Prisma, PrismaClient, UserRole } from "@prisma/client";
import { z } from "zod";
import { eventSchema } from "./eventValidation.js";
import { evidenceBodyLimit, evidenceFileSchema, evidenceSchema, competitionValuesSchema, readAchievementEvidence, withAchievementEvidence } from "./achievementEvidence.js";

const prisma = new PrismaClient();
const env = {
  port: Number(process.env.API_PORT ?? 4000),
  origins: (process.env.WEB_ORIGINS ?? "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieName: process.env.SESSION_COOKIE_NAME ?? "cyberhub_session",
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 7),
  production: process.env.NODE_ENV === "production",
};

// ── In-Memory Preview & Development Mock Store ────────────────────────────────
type UserWithRelations = {
  id: string;
  identifier: string;
  email: string | null;
  phone?: string | null;
  name: string;
  role: UserRole;
  active: boolean;
  departmentId?: string | null;
  department: { id: string; code: string; name: string; active?: boolean } | null;
  student: {
    id: string;
    userId: string;
    registerNo: string;
    department: string;
    departmentId: string | null;
    programme: string;
    batch: string;
    semester: number;
    academicYear?: string | null;
    yearOfStudy?: number | null;
    classSection?: string | null;
    createdAt?: Date;
  } | null;
  staffProfile: {
    id: string;
    userId: string;
    employeeId: string;
    designation: string;
  } | null;
};

const MOCK_DEPT = { id: "dept-cse-001", code: "CSE", name: "Computer Science and Engineering" };
const TEST_OTHER_DEPT = { id: "test-dept-other", code: "TEST", name: "Other test department" };

const MOCK_USERS: Record<string, { password: string; user: UserWithRelations }> = {
  student: {
    password: "password123",
    user: {
      id: "usr-student-001",
      identifier: "student",
      email: "student@cyberhub.edu",
      phone: "+91 98765 43210",
      name: "Alex Johnson",
      role: UserRole.STUDENT,
      active: true,
      departmentId: MOCK_DEPT.id,
      department: MOCK_DEPT,
      student: {
        id: "stu-profile-001",
        userId: "usr-student-001",
        registerNo: "21CY001",
        department: "Computer Science",
        departmentId: MOCK_DEPT.id,
        programme: "B.Tech Cybersecurity",
        batch: "2024-2028",
        semester: 5,
        createdAt: new Date("2026-11-20T09:00:00Z"),
      },
      staffProfile: null,
    },
  },
  "uat-student": {
    password: "password123",
    user: {
      id: "usr-student-uat",
      identifier: "uat-student",
      email: "uat-student@cyberhub.edu",
      phone: "+91 98765 43210",
      name: "Jamie Lewis",
      role: UserRole.STUDENT,
      active: true,
      departmentId: MOCK_DEPT.id,
      department: MOCK_DEPT,
      student: {
        id: "stu-profile-uat",
        userId: "usr-student-uat",
        registerNo: "21CY002",
        department: "Computer Science",
        departmentId: MOCK_DEPT.id,
        programme: "B.Tech Cybersecurity",
        batch: "2024-2028",
        semester: 5,
        createdAt: new Date("2026-11-23T09:00:00Z"),
      },
      staffProfile: null,
    },
  },
  admin: {
    password: "password123",
    user: {
      id: "usr-admin-001",
      identifier: "admin",
      email: "admin@cyberhub.edu",
      phone: "+91 98765 00001",
      name: "System Administrator",
      role: UserRole.ADMIN,
      active: true,
      departmentId: MOCK_DEPT.id,
      department: MOCK_DEPT,
      student: null,
      staffProfile: {
        id: "stf-profile-001",
        userId: "usr-admin-001",
        employeeId: "ADM001",
        designation: "System Administrator",
      },
    },
  },
  "department-admin": {
    password: "password123",
    user: {
      id: "usr-department-admin-001",
      identifier: "department-admin",
      email: "department-admin@example.edu",
      name: "Morgan Lee",
      role: UserRole.DEPARTMENT_ADMIN,
      active: true,
      departmentId: MOCK_DEPT.id,
      department: MOCK_DEPT,
      student: null,
      staffProfile: null,
    },
  },
  admin001: {
    password: "password123",
    user: {
      id: "usr-admin-001",
      identifier: "admin001",
      email: "admin001@cyberhub.edu",
      phone: "+91 98765 00001",
      name: "System Administrator",
      role: UserRole.ADMIN,
      active: true,
      departmentId: MOCK_DEPT.id,
      department: MOCK_DEPT,
      student: null,
      staffProfile: {
        id: "stf-profile-001",
        userId: "usr-admin-001",
        employeeId: "ADM001",
        designation: "System Administrator",
      },
    },
  },
  faculty: {
    password: "password123",
    user: {
      id: "usr-faculty-001",
      identifier: "faculty",
      email: "faculty@cyberhub.edu",
      phone: "+91 98765 00002",
      name: "Dr. Sarah Connor",
      role: UserRole.FACULTY,
      active: true,
      departmentId: MOCK_DEPT.id,
      department: MOCK_DEPT,
      student: null,
      staffProfile: {
        id: "stf-profile-002",
        userId: "usr-faculty-001",
        employeeId: "FAC042",
        designation: "Associate Professor",
      },
    },
  },
  ...(process.env.NODE_ENV === "test" ? {
    "test-outside-student": {
      password: "password123",
      user: {
        id: "test-outside-user", identifier: "test-outside-student", email: null, name: "Outside department student",
        role: UserRole.STUDENT, active: true, departmentId: TEST_OTHER_DEPT.id, department: TEST_OTHER_DEPT, staffProfile: null,
        student: { id: "test-outside-student-profile", userId: "test-outside-user", registerNo: "TEST001",
          department: TEST_OTHER_DEPT.name, departmentId: TEST_OTHER_DEPT.id, programme: "B.Tech", batch: "2026–2030", semester: 1 },
      },
    },
    "test-unassigned-admin": {
      password: "password123",
      user: {
        id: "test-unassigned-admin", identifier: "test-unassigned-admin", email: null, name: "Unassigned admin",
        role: UserRole.DEPARTMENT_ADMIN, active: true, departmentId: null, department: null, student: null, staffProfile: null,
      },
    },
  } : {}),
};

const mockSessions = new Map<string, { user: UserWithRelations; expiresAt: Date }>();

type MockAchievementRecord = {
  id: string;
  studentId: string;
  submittedBy: string;
  type: AchievementType;
  title: string;
  description: string | null;
  metadata: Record<string, string> | null;
  status: AchievementStatus;
  submittedAt: Date | null;
  academicYear?: string | null;
  yearOfStudy?: number | null;
  reviewedAt: Date | null;
  documents: Array<{ id: string; fileName: string; storageKey: string; mimeType: string; sizeBytes: number; createdAt?: Date }>;
  approvals: Array<{ id: string; achievementId: string; reviewerId: string; action: AchievementStatus; comment?: string | null; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
};

const mockAchievements: MockAchievementRecord[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    studentId: "stu-profile-001",
    submittedBy: "usr-student-001",
    type: AchievementType.PROJECT,
    title: "AI-Powered Intrusion Detection System",
    description: "Built a real-time anomaly detection system using deep autoencoders on network packet flow datasets.",
    metadata: { domain: "Network Security", funding: "$2,500 Grant", guide: "Dr. Sarah Connor" },
    status: AchievementStatus.SUBMITTED,
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    reviewedAt: null,
    documents: [],
    approvals: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    studentId: "stu-profile-001",
    submittedBy: "usr-student-001",
    type: AchievementType.CERTIFICATE,
    title: "CompTIA Security+ Certification",
    description: "Industry-standard cybersecurity certification covering threats, attacks, and vulnerabilities.",
    metadata: { issuer: "CompTIA", score: "840/900", validUntil: "2029-05-15" },
    status: AchievementStatus.APPROVED,
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    documents: [],
    approvals: [
      {
        id: "app-1",
        achievementId: "a0000000-0000-0000-0000-000000000002",
        reviewerId: "usr-admin-001",
        action: AchievementStatus.APPROVED,
        comment: "Verified credential against CompTIA registry.",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    ],
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    studentId: "stu-profile-001",
    submittedBy: "usr-student-001",
    type: AchievementType.HACKATHON,
    title: "National Cyber Defense Hackathon 2026",
    description: "1st Place Winner in the Red Team vs Blue Team CTF Challenge held at IIT Delhi.",
    metadata: { organizer: "National Cyber Coordination Centre", place: "1st Place", teamSize: "4" },
    status: AchievementStatus.APPROVED,
    submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    documents: [],
    approvals: [
      {
        id: "app-2",
        achievementId: "a0000000-0000-0000-0000-000000000003",
        reviewerId: "usr-faculty-001",
        action: AchievementStatus.APPROVED,
        comment: "Outstanding achievement representing our institution.",
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
    ],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    studentId: "stu-profile-001",
    submittedBy: "usr-student-001",
    type: AchievementType.INTERNSHIP,
    title: "Cyber Threat Intelligence Intern at SecureNet",
    description: "Conducted malware analysis, IOC extraction, and threat actor profiling during summer internship.",
    metadata: { company: "SecureNet Labs", duration: "8 Weeks", stipend: "30,000 INR/month" },
    status: AchievementStatus.DRAFT,
    submittedAt: null,
    reviewedAt: null,
    documents: [],
    approvals: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "a0000000-0000-0000-0000-000000000005",
    studentId: "stu-profile-001",
    submittedBy: "usr-student-001",
    type: AchievementType.WORKSHOP,
    title: "Advanced Reverse Engineering & Malware Analysis",
    description: "3-day hands-on workshop covering Ghidra, x64dbg, and unpacking packed executables.",
    metadata: { provider: "Nullcon", hours: "24", mode: "In-Person" },
    status: AchievementStatus.SUBMITTED,
    submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    reviewedAt: null,
    documents: [],
    approvals: [],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
];

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(6).max(200),
  remember: z.boolean().optional().default(false),
});

const credentialValuesSchema = z.object({
  issuer: z.string().trim().min(1).max(200),
  certifyingBody: z.string().trim().max(200).optional(),
  dateEarned: z.iso.date().optional(),
  duration: z.string().trim().max(100).optional(),
  credentialId: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1500).optional(),
});

const internshipValuesSchema = z.object({
  company: z.string().trim().min(1).max(200),
  workMode: z.enum(["On-site", "Remote", "Hybrid"]),
  location: z.string().trim().max(200).optional(),
  internshipType: z.string().trim().max(100).optional(),
  startDate: z.iso.date(),
  endDate: z.iso.date().optional(),
  compensation: z.string().trim().max(150).optional(),
  details: z.string().trim().max(1500).optional(),
}).refine(({ startDate, endDate }) => !endDate || endDate >= startDate);

const projectValuesSchema = z.object({
  fundingAgency: z.string().trim().min(1).max(200),
  amount: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  projectType: z.enum(["Funded Student", "Innovation", "Startup", "Research"]).optional(),
  projectStatus: z.enum(["Active", "Completed", "Upcoming"]).optional(),
  details: z.string().trim().max(1500).optional(),
});

const publicationIndexes = z.enum(["Scopus", "Web of Science", "UGC", "Others"]);
const publicationValuesSchema = z.object({
  level: z.enum(["College", "National", "International"]),
  publicationType: z.enum(["Journal", "Conference", "Symposium"]),
  venue: z.string().trim().min(1).max(200),
  publicationDate: z.iso.date(),
  indexedBy: z.string().max(100).refine((value) => {
    const indexes = value.split(", ");
    return indexes.every((index) => publicationIndexes.safeParse(index).success)
      && new Set(indexes).size === indexes.length;
  }).optional(),
  publicationLink: z.url().max(1000).refine((value) => /^https?:\/\//i.test(value)).optional(),
});

const patentValuesSchema = z.object({
  patentOffice: z.string().trim().min(1).max(150),
  patentStatus: z.enum(["Filed", "Under Examination", "Granted"]),
  filingDate: z.iso.date(),
  applicationNo: z.string().trim().max(150).optional(),
  inventors: z.string().trim().max(500).optional(),
  details: z.string().trim().max(1500).optional(),
});

const awardValuesSchema = z.object({
  details: z.string().trim().min(1).max(1500),
  level: z.enum(["Institutional", "District", "State", "Regional", "National", "International"]),
  issuer: z.string().trim().min(1).max(200),
  ceremonyDate: z.iso.date(),
  recognition: z.string().trim().max(500).optional(),
});

const submittedValuesSchemas: Partial<Record<AchievementType, z.ZodType>> = {
  COMPETITION: competitionValuesSchema,
  CERTIFICATE: credentialValuesSchema,
  INTERNSHIP: internshipValuesSchema,
  PROJECT: projectValuesSchema,
  PUBLICATION: publicationValuesSchema,
  PATENT: patentValuesSchema,
  AWARD: awardValuesSchema,
};

const evidenceLimits: Partial<Record<AchievementType, number>> = {
  COMPETITION: 2, CERTIFICATE: 1, INTERNSHIP: 2, PUBLICATION: 1, PATENT: 1, AWARD: 1,
};
const evidenceTypes = Object.keys(evidenceLimits) as AchievementType[];

function evidenceLimit(type: AchievementType) {
  return evidenceLimits[type] ?? 0;
}

const achievementSchema = z.object({
  type: z.nativeEnum(AchievementType),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional(),
  values: z.record(z.string(), z.string()).optional().default({}),
  status: z.enum(["DRAFT", "SUBMITTED"]).default("SUBMITTED"),
  evidence: evidenceSchema.optional().default([]),
}).refine(({ type, evidence }) => evidence.length <= evidenceLimit(type))
  .refine(({ type, evidence }) => {
    if (type !== "INTERNSHIP") return evidence.every((file) => !file.kind);
    return evidence.every((file) => file.kind) && new Set(evidence.map((file) => file.kind)).size === evidence.length;
  })
  .refine(({ type, values, status }) => (
    status === "DRAFT" || (submittedValuesSchemas[type]?.safeParse(values).success ?? true)
  ));

const achievementFormError = "Check the required fields and any attached files.";

const studentPlacementSchema = z.strictObject({
  classSection: z.string().trim().min(1).max(120),
  yearOfStudy: z.number().int().min(1).max(4),
  academicYear: z.string().trim().transform((value, context) => {
    const match = /^(\d{4})\s*[-–]\s*(\d{2}|\d{4})$/.exec(value);
    const start = Number(match?.[1]);
    const end = String(start + 1);
    if (!match || (match[2] !== end && match[2] !== end.slice(-2))) {
      context.addIssue({ code: "custom", message: "Enter consecutive academic years, for example 2026–27." });
      return z.NEVER;
    }
    return `${match[1]}–${end.slice(-2)}`;
  }),
});

function submissionPlacement(student: NonNullable<UserWithRelations["student"]>) {
  return { academicYear: student.academicYear ?? null, yearOfStudy: student.yearOfStudy ?? null };
}

const reviewSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().max(2000).optional(),
}).refine(({ action, comment }) => action !== "REJECTED" || Boolean(comment));

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

type StoredDemoEvent = {
  id: string; ownerId: string; mode: string; name: string; category: string;
  eventDate: Date; facultyRole: string; details: Prisma.JsonObject;
};
const demoEvents: StoredDemoEvent[] = [];
const eventCertificateSchema = z.object({
  fileName: z.string(), storageKey: z.string(), mimeType: z.enum(["application/pdf", "image/png", "image/jpeg"]), sizeBytes: z.number(),
});

function getEventCertificate(details: Prisma.JsonValue) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  return eventCertificateSchema.safeParse(details.certificateDocument).data ?? null;
}

function publicEvent<T extends { details: Prisma.JsonValue }>(event: T) {
  const certificate = getEventCertificate(event.details);
  const details = event.details && typeof event.details === "object" && !Array.isArray(event.details)
    ? { ...event.details } : null;
  if (details) delete details.certificateDocument;
  return { ...event, details: details ?? event.details,
    certificate: certificate ? { fileName: certificate.fileName, mimeType: certificate.mimeType, sizeBytes: certificate.sizeBytes } : null };
}

function sendEvidence(reply: FastifyReply, file: { fileName: string; mimeType: string }, bytes: Buffer) {
  const encodedName = encodeURIComponent(Buffer.from(file.fileName).toString()).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);
  return reply.type(file.mimeType)
    .header("Cache-Control", "private, no-store")
    .header("Content-Disposition", `attachment; filename*=UTF-8''${encodedName}`)
    .send(bytes);
}

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
  },
  trustProxy: process.env.TRUST_PROXY === "1",
});

app.addHook("onClose", async () => { await prisma.$disconnect(); });
app.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/api/v1/")) reply.header("Cache-Control", "private, no-store");
});

await app.register(helmet);
await app.register(cookie);
await app.register(cors, {
  origin: env.origins,
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
});
await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
  keyGenerator: (request) => `${request.ip}:${request.method}:${request.routeOptions.url ?? "unknown"}`,
});

app.get("/health", async () => ({ status: "ok", service: "cyberhub-api" }));

app.get("/health/ready", async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ready", service: "cyberhub-api", database: "ok" };
  } catch (error) {
    app.log.error({ err: error }, "Readiness check failed");
    return reply.code(503).send({
      status: "not_ready",
      service: "cyberhub-api",
      database: "unavailable",
    });
  }
});

app.get("/api/v1/auth/me", { config: { rateLimit: { max: 600 } } }, async (request, reply) => {
  const sessionId = request.cookies[env.cookieName];
  if (!sessionId) {
    return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
  }

  // Check in-memory preview session
  const mockSession = env.production ? undefined : mockSessions.get(sessionId);
  if (mockSession) {
    if (mockSession.expiresAt <= new Date()) {
      mockSessions.delete(sessionId);
      reply.clearCookie(env.cookieName, { path: "/" });
      return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Session expired." } });
    }
    return {
      data: {
        id: mockSession.user.id,
        identifier: mockSession.user.identifier,
        email: mockSession.user.email,
        name: mockSession.user.name,
        role: mockSession.user.role,
        department: mockSession.user.department,
        student: mockSession.user.student,
        staffProfile: mockSession.user.staffProfile,
      },
    };
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { department: true, student: true, staffProfile: true } } },
    });

    if (!session || session.expiresAt <= new Date() || !session.user.active) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      reply.clearCookie(env.cookieName, { path: "/" });
      return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Session expired." } });
    }

    return {
      data: {
        id: session.user.id,
        identifier: session.user.identifier,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        department: session.user.department,
        student: session.user.student,
        staffProfile: session.user.staffProfile,
      },
    };
  } catch {
    return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
  }
});

app.post("/api/v1/auth/login", {
  config: { rateLimit: { max: 15, timeWindow: "1 minute" } },
}, async (request, reply) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Enter a valid identifier and password." } });
  }

  const identifier = parsed.data.identifier.toLowerCase();

  // Check mock accounts first for preview/offline mode
  const mockUserRecord = env.production ? undefined : MOCK_USERS[identifier];
  if (mockUserRecord && mockUserRecord.password === parsed.data.password) {
    const sessionId = randomBytes(32).toString("base64url");
    const sessionDays = parsed.data.remember ? 30 : env.sessionTtlDays;
    const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
    mockSessions.set(sessionId, { user: mockUserRecord.user, expiresAt });

    reply.setCookie(env.cookieName, sessionId, {
      httpOnly: true,
      secure: env.production,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return {
      data: {
        id: mockUserRecord.user.id,
        identifier: mockUserRecord.user.identifier,
        email: mockUserRecord.user.email,
        name: mockUserRecord.user.name,
        role: mockUserRecord.user.role,
      },
    };
  }

  // Attempt database authentication
  try {
    const user = await prisma.user.findFirst({
      where: {
        active: true,
        OR: [{ identifier }, { email: identifier }],
      },
    });

    if (!user || !(await argon2.verify(user.passwordHash, parsed.data.password))) {
      return reply.code(401).send({ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials." } });
    }

    const sessionId = randomBytes(32).toString("base64url");
    const sessionDays = parsed.data.remember ? 30 : env.sessionTtlDays;
    const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { id: sessionId, userId: user.id, expiresAt } });

    reply.setCookie(env.cookieName, sessionId, {
      httpOnly: true,
      secure: env.production,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return {
      data: {
        id: user.id,
        identifier: user.identifier,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch {
    return reply.code(401).send({ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials." } });
  }
});

app.post("/api/v1/auth/logout", async (request, reply) => {
  const sessionId = request.cookies[env.cookieName];
  if (sessionId) {
    if (!mockSessions.delete(sessionId)) await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  reply.clearCookie(env.cookieName, { path: "/" });
  return { data: { success: true } };
});

async function getCurrentUser(request: FastifyRequest): Promise<UserWithRelations | null> {
  const sessionId = request.cookies[env.cookieName];
  if (!sessionId) return null;

  const mockSession = env.production ? undefined : mockSessions.get(sessionId);
  if (mockSession) {
    if (mockSession.expiresAt <= new Date()) {
      mockSessions.delete(sessionId);
      return null;
    }
    return mockSession.user;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { department: true, student: true, staffProfile: true } } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
    return session.user as unknown as UserWithRelations;
  } catch {
    return null;
  }
}

function publicProfile(user: UserWithRelations) {
  const { id, identifier, name, email, phone, role, department, student, staffProfile } = user;
  return { id, identifier, name, email, phone, role, department, student, staffProfile };
}

function isDemoSession(request: FastifyRequest) {
  return !env.production && mockSessions.has(request.cookies[env.cookieName] ?? "");
}

function reviewScope(user: UserWithRelations): Prisma.AchievementWhereInput | null {
  if (user.role === UserRole.ADMIN) return {};
  if (user.role === UserRole.DEPARTMENT_ADMIN) {
    if (!user.departmentId || user.department?.id !== user.departmentId || user.department.active === false) return null;
    return { student: { departmentId: user.departmentId } };
  }
  if ((user.role === UserRole.FACULTY || user.role === UserRole.HOD) && user.departmentId) {
    return { student: { departmentId: user.departmentId } };
  }
  return null;
}

function mockStudentFor(studentId: string) {
  return Object.values(MOCK_USERS).find(({ user }) => user.student?.id === studentId)?.user;
}

function inMockReviewScope(user: UserWithRelations, studentId: string) {
  return user.role === UserRole.ADMIN || (
    !!reviewScope(user) && mockStudentFor(studentId)?.student?.departmentId === user.departmentId
  );
}

const achievementIncludes = {
  documents: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true } },
  approvals: { orderBy: { createdAt: "desc" }, take: 1, select: { action: true, comment: true } },
} satisfies Prisma.AchievementInclude;

const departmentReviewIncludes = {
  ...achievementIncludes,
  approvals: { orderBy: { createdAt: "desc" }, select: { action: true, comment: true, createdAt: true } },
} satisfies Prisma.AchievementInclude;

function departmentDemoAchievement(record: MockAchievementRecord) {
  return {
    ...record,
    approvals: record.approvals.map(({ action, comment, createdAt }) => ({ action, comment, createdAt })),
    documents: record.documents.map(({ id, fileName, mimeType, sizeBytes, createdAt }) => ({ id, fileName, mimeType, sizeBytes, createdAt })),
  };
}

app.get("/api/v1/profile", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
  return { data: publicProfile(user) };
});

app.patch("/api/v1/profile", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
  const parsed = profileUpdateSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Enter valid profile details." } });

  if (isDemoSession(request)) {
    Object.assign(user, parsed.data);
    return { data: publicProfile(user) };
  }

  try {
    const profile = await prisma.user.update({
      where: { id: user.id },
      data: parsed.data,
      include: { department: true, student: true, staffProfile: true },
    });
    return { data: publicProfile(profile) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply.code(409).send({ error: { code: "EMAIL_IN_USE", message: "That email is already in use." } });
    }
    throw error;
  }
});

app.get("/api/v1/achievements", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });

  const isStudent = user.role === UserRole.STUDENT;
  const scope = isStudent ? (user.student ? { studentId: user.student.id } : null) : reviewScope(user);
  if (!scope) return reply.code(403).send({ error: { code: "FORBIDDEN", message: "No achievement access." } });

  if (isDemoSession(request)) {
    const records = mockAchievements.filter((record) => isStudent
      ? record.studentId === user.student?.id
      : record.status !== AchievementStatus.DRAFT && inMockReviewScope(user, record.studentId));
    if (isStudent) return { data: records };
    return { data: records.map((record) => {
      const student = mockStudentFor(record.studentId);
      const result = user.role === UserRole.DEPARTMENT_ADMIN ? departmentDemoAchievement(record) : record;
      return { ...result, student: { registerNo: student?.student?.registerNo, department: student?.student?.department, user: { name: student?.name } } };
    }) };
  }

  const where: Prisma.AchievementWhereInput = isStudent ? scope : { ...scope, status: { not: AchievementStatus.DRAFT } };
  const orderBy = { createdAt: "desc" } as const;
  if (isStudent) return { data: await prisma.achievement.findMany({ where, orderBy, include: achievementIncludes }) };
  return { data: await prisma.achievement.findMany({
    where,
    orderBy,
    include: { ...(user.role === UserRole.DEPARTMENT_ADMIN ? departmentReviewIncludes : achievementIncludes), student: { select: { registerNo: true, department: true, user: { select: { name: true } } } } },
  }) };
});

app.get("/api/v1/student/summary", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user || user.role !== UserRole.STUDENT || !user.student) {
    return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Student access required." } });
  }

  const counts = { total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 };
  const byType: Partial<Record<AchievementType, number>> = {};
  const studentId = user.student.id;
  const studentRecords = isDemoSession(request)
    ? mockAchievements.filter((record) => record.studentId === studentId)
    : await prisma.achievement.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, title: true, status: true, createdAt: true },
    });

  for (const ach of studentRecords) {
    counts.total++;
    if (ach.status === AchievementStatus.DRAFT) counts.draft++;
    if (ach.status === AchievementStatus.SUBMITTED) counts.submitted++;
    if (ach.status === AchievementStatus.APPROVED) counts.approved++;
    if (ach.status === AchievementStatus.REJECTED) counts.rejected++;
    byType[ach.type] = (byType[ach.type] ?? 0) + 1;
  }

  const recent = studentRecords.slice(0, 5).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return { data: { counts, byType, recent } };
});

app.get("/api/v1/staff/students", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
  if (!reviewScope(user)) return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Staff access required." } });

  if (isDemoSession(request)) {
    const students = new Map<string, UserWithRelations>();
    for (const { user: candidate } of Object.values(MOCK_USERS)) {
      if (candidate.student && inMockReviewScope(user, candidate.student.id) && !students.has(candidate.student.id)) {
        students.set(candidate.student.id, candidate);
      }
    }
    return { data: Array.from(students, ([id, candidate]) => ({
      ...candidate.student,
      user: { name: candidate.name, email: candidate.email, ...(user.role === UserRole.DEPARTMENT_ADMIN ? { active: candidate.active, phone: candidate.phone } : {}) },
      achievements: mockAchievements.filter((record) => record.studentId === id && record.status !== AchievementStatus.DRAFT)
        .map((record) => user.role === UserRole.DEPARTMENT_ADMIN ? departmentDemoAchievement(record) : record),
    })) };
  }

  return { data: await prisma.student.findMany({
    where: user.role === UserRole.ADMIN ? {} : { departmentId: user.departmentId },
    select: {
      id: true, registerNo: true, department: true, programme: true, batch: true, semester: true,
      academicYear: true, yearOfStudy: true, classSection: true,
      ...(user.role === UserRole.DEPARTMENT_ADMIN ? { createdAt: true } : {}),
      user: { select: { name: true, email: true, ...(user.role === UserRole.DEPARTMENT_ADMIN ? { active: true, phone: true } : {}) } },
      achievements: {
        where: { status: { not: AchievementStatus.DRAFT } },
        orderBy: { createdAt: "desc" },
        include: achievementIncludes,
      },
    },
    orderBy: { registerNo: "asc" },
  }) };
});

app.patch<{ Params: { id: string } }>("/api/v1/staff/students/:id/academic-placement", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user) return reply.code(401).send({ error: { message: "Sign in required." } });
  if (user.role !== UserRole.DEPARTMENT_ADMIN || !reviewScope(user)) {
    return reply.code(403).send({ error: { message: "Department Admin access required." } });
  }

  const placement = studentPlacementSchema.safeParse(request.body);
  if (!placement.success) {
    return reply.code(400).send({ error: { message: "Enter a class or section, a year of study from 1 to 4, and an academic year such as 2026–27." } });
  }

  const { id } = request.params;
  if (isDemoSession(request)) {
    const student = mockStudentFor(id)?.student;
    if (!student || student.departmentId !== user.departmentId) {
      return reply.code(404).send({ error: { message: "Student not found in your department." } });
    }
    Object.assign(student, placement.data);
  } else {
    const updated = await prisma.student.updateMany({
      where: { id, departmentId: user.departmentId },
      data: placement.data,
    });
    if (!updated.count) return reply.code(404).send({ error: { message: "Student not found in your department." } });
  }
  return { data: placement.data };
});

const eventWithCertificateSchema = eventSchema.and(z.object({ certificate: evidenceFileSchema.optional() }))
  .refine(({ mode, certificate }) => !certificate || mode === "attended");

app.get("/api/v1/staff/events", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user || user.role === UserRole.STUDENT || user.role === UserRole.DEPARTMENT_ADMIN) return reply.code(403).send({ error: { message: "Faculty portal access required." } });
  const events = isDemoSession(request)
    ? demoEvents.filter((event) => event.ownerId === user.id)
    : await prisma.facultyEvent.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
  return { data: events.map(publicEvent) };
});

app.post("/api/v1/staff/events", { bodyLimit: evidenceBodyLimit }, async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user || user.role === UserRole.STUDENT || user.role === UserRole.DEPARTMENT_ADMIN) return reply.code(403).send({ error: { message: "Faculty portal access required." } });
  const parsed = eventWithCertificateSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: { message: "Check the event details and attach a valid PDF, PNG, or JPG certificate up to 5 MB." } });
  const { certificate, ...values } = parsed.data;
  const demo = isDemoSession(request);
  const saved = await withAchievementEvidence(certificate ? [{ ...certificate, kind: undefined }] : [], demo, async ([file]) => {
    const details = {
      ...values, certAvailable: Boolean(file) || values.certAvailable,
      ...(file ? { certificateDocument: { fileName: file.fileName, storageKey: file.storageKey, mimeType: file.mimeType, sizeBytes: file.sizeBytes } } : {}),
    };
    const event = {
      ownerId: user.id, mode: values.mode, name: values.eventName, category: values.eventType,
      eventDate: new Date(values.eventDate), facultyRole: values.facultyRole, details,
    };
    if (!demo) return prisma.facultyEvent.create({ data: event });
    const entry = { id: randomUUID(), ...event };
    demoEvents.unshift(entry);
    return entry;
  });
  if (!saved) throw new Error("Event could not be saved.");
  return reply.code(201).send({ data: publicEvent(saved) });
});

app.get<{ Params: { id: string } }>("/api/v1/staff/events/:id/certificate", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user || user.role === UserRole.STUDENT || user.role === UserRole.DEPARTMENT_ADMIN) return reply.code(403).send({ error: { message: "Faculty portal access required." } });
  const demo = isDemoSession(request);
  const { id } = request.params;
  const event = demo
    ? demoEvents.find((entry) => entry.id === id && entry.ownerId === user.id)
    : await prisma.facultyEvent.findFirst({ where: { id, ownerId: user.id }, select: { details: true } });
  const certificate = event ? getEventCertificate(event.details) : null;
  const bytes = certificate ? await readAchievementEvidence(certificate.storageKey, demo) : undefined;
  if (!certificate || !bytes) return reply.code(404).send({ error: { message: "Certificate not found." } });
  return sendEvidence(reply, certificate, bytes);
});

app.post("/api/v1/achievements", { bodyLimit: evidenceBodyLimit }, async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user || user.role !== UserRole.STUDENT || !user.student) {
    return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Only students can submit achievements." } });
  }
  const parsed = achievementSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: achievementFormError } });
  }

  const demo = isDemoSession(request);
  const { type, title, description, values, status, evidence } = parsed.data;
  const student = user.student;
  const studentId = student.id;
  const record = await withAchievementEvidence(evidence, demo, async (documents) => {
    const placement = status === "SUBMITTED" ? submissionPlacement(student) : {};
    if (!demo) return prisma.achievement.create({
      data: {
        studentId, submittedBy: user.id, type, title, description,
        metadata: values, status, submittedAt: status === "SUBMITTED" ? new Date() : null,
        ...placement,
        documents: { create: documents },
      },
      include: achievementIncludes,
    });

    const newAch: MockAchievementRecord = {
      id: randomUUID(),
      type,
      title,
      description: description ?? null,
      studentId,
      submittedBy: user.id,
      status,
      submittedAt: status === "SUBMITTED" ? new Date() : null,
      ...placement,
      reviewedAt: null,
      metadata: values,
      documents,
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAchievements.unshift(newAch);
    return newAch;
  });
  return reply.code(201).send({ data: record });
});

app.patch("/api/v1/achievements/:id", { bodyLimit: evidenceBodyLimit }, async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user || user.role !== UserRole.STUDENT || !user.student) {
    return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Only students can edit achievements." } });
  }
  const params = z.object({ id: z.string() }).safeParse(request.params);
  const parsed = achievementSchema.safeParse(request.body);
  if (!params.success || !parsed.success) {
    return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: achievementFormError } });
  }

  const demo = isDemoSession(request);
  const { type, title, description, values, status, evidence } = parsed.data;
  const student = user.student;
  const where = { id: params.data.id, studentId: student.id, type };
  const submissionChanges = (record: { status: AchievementStatus; submittedAt: Date | null }) =>
    status === "SUBMITTED" && record.status === AchievementStatus.DRAFT && !record.submittedAt
    ? { submittedAt: new Date(), ...submissionPlacement(student) }
    : {};
  const limit = evidenceLimit(type);
  const attachmentConflict = () => reply.code(400).send({ error: {
    message: type === "INTERNSHIP" ? "An internship can have one offer letter and one completion certificate."
      : limit === 1 ? "Each record can have one attachment." : "Each competition can have up to two attachments.",
  } });
  const exceedsAttachmentLimit = (existing: { id: string }[]) => evidence.length > 0 && (
    existing.length + evidence.length > limit
    || evidence.some(({ kind }) => kind && existing.some(({ id }) => id.startsWith(`${kind}-`)))
  );
  if (!demo) {
    const record = await prisma.achievement.findFirst({ where, include: { documents: { select: { id: true } } } });
    if (!record) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Achievement not found." } });
    if (exceedsAttachmentLimit(record.documents)) return attachmentConflict();
    if (record.status === "DRAFT" || record.status === "SUBMITTED") {
      const updated = await withAchievementEvidence(evidence, false, (documents) => prisma.$transaction(async (tx) => {
        const result = await tx.achievement.updateMany({
          where: { ...where, status: record.status, updatedAt: record.updatedAt },
          data: { title, description: description ?? null, metadata: values, status, ...submissionChanges(record) },
        });
        if (!result.count) return null;
        if (documents.length) {
          const existing = await tx.achievementDocument.findMany({ where: { achievementId: record.id }, select: { id: true } });
          if (exceedsAttachmentLimit(existing)) {
            throw new Error("Attachment limit changed during submission.");
          }
          await tx.achievementDocument.createMany({ data: documents.map((document) => ({ ...document, achievementId: record.id })) });
        }
        return tx.achievement.findFirst({ where, include: achievementIncludes });
      }));
      if (updated) return { data: updated };
    }
    return reply.code(409).send({ error: { code: "INVALID_STATE", message: "The achievement was reviewed or changed. Reload and try again." } });
  }

  const existing = mockAchievements.find((a) => a.id === where.id && a.studentId === where.studentId && a.type === type);
  if (!existing) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Achievement not found." } });
  if (existing.status === AchievementStatus.APPROVED || existing.status === AchievementStatus.REJECTED) {
    return reply.code(409).send({ error: { code: "INVALID_STATE", message: "Reviewed achievements cannot be edited." } });
  }

  if (exceedsAttachmentLimit(existing.documents)) return attachmentConflict();
  await withAchievementEvidence(evidence, true, async (documents) => {
    existing.title = title;
    existing.description = description ?? null;
    existing.metadata = values;
    Object.assign(existing, submissionChanges(existing));
    existing.status = status;
    existing.updatedAt = new Date();
    existing.documents.push(...documents);
    return existing;
  });

  return { data: existing };
});

app.get<{ Params: { id: string; documentId: string } }>("/api/v1/achievements/:id/documents/:documentId", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user) return reply.code(401).send({ error: { message: "Sign in required." } });

  const demo = isDemoSession(request);
  const { id, documentId } = request.params;
  const staffScope = reviewScope(user);
  const scope = user.role === UserRole.STUDENT
    ? (user.student ? { studentId: user.student.id } : null)
    : (staffScope ? { ...staffScope, status: { not: AchievementStatus.DRAFT } } : null);
  if (!scope) return reply.code(403).send({ error: { message: "No document access." } });

  const document = demo
    ? mockAchievements.find((record) => record.id === id && evidenceTypes.includes(record.type) && (
      user.role === UserRole.STUDENT ? record.studentId === user.student?.id
        : record.status !== AchievementStatus.DRAFT && inMockReviewScope(user, record.studentId)
    ))?.documents.find((file) => file.id === documentId)
    : await prisma.achievementDocument.findFirst({
      where: { id: documentId, achievement: { ...scope, id, type: { in: evidenceTypes } } },
    });
  const bytes = document ? await readAchievementEvidence(document.storageKey, demo) : undefined;
  if (!document || !bytes) return reply.code(404).send({ error: { message: "File not found." } });

  return sendEvidence(reply, document, bytes);
});

app.patch("/api/v1/achievements/:id/review", async (request, reply) => {
  const user = await getCurrentUser(request);
  const scope = user && reviewScope(user);
  if (!user || !scope) {
    return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Review permission required." } });
  }
  const parsed = reviewSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Choose an approval action." } });
  }
  const params = z.object({ id: z.string() }).safeParse(request.params);
  if (!params.success) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid achievement id." } });

  if (!isDemoSession(request)) {
    const where = { ...scope, id: params.data.id, status: { not: AchievementStatus.DRAFT } };
    const record = await prisma.achievement.findFirst({ where, select: { id: true, status: true, updatedAt: true } });
    if (!record) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Achievement not found." } });
    const reviewed = await prisma.$transaction(async (transaction) => {
      if (record.status !== AchievementStatus.SUBMITTED) return null;
      const result = await transaction.achievement.updateMany({
        where: { ...where, status: AchievementStatus.SUBMITTED, updatedAt: record.updatedAt },
        data: { status: parsed.data.action, reviewedAt: new Date() },
      });
      if (!result.count) return null;
      await transaction.approvalAction.create({
        data: { achievementId: record.id, reviewerId: user.id, action: parsed.data.action, comment: parsed.data.comment },
      });
      return transaction.achievement.findUnique({ where: { id: record.id }, include: user.role === UserRole.DEPARTMENT_ADMIN ? departmentReviewIncludes : achievementIncludes });
    });
    if (reviewed) return { data: reviewed };
    return reply.code(409).send({ error: { code: "INVALID_STATE", message: "The submission changed or was already reviewed." } });
  }

  const achievement = mockAchievements.find((a) => a.id === params.data.id
    && a.status !== AchievementStatus.DRAFT && inMockReviewScope(user, a.studentId));
  if (!achievement) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Achievement not found." } });
  if (achievement.status !== AchievementStatus.SUBMITTED) {
    return reply.code(409).send({ error: { code: "INVALID_STATE", message: "Only submitted achievements can be reviewed." } });
  }

  const status = parsed.data.action === "APPROVED" ? AchievementStatus.APPROVED : AchievementStatus.REJECTED;
  achievement.status = status;
  achievement.reviewedAt = new Date();
  achievement.approvals.unshift({
    id: randomUUID(),
    achievementId: achievement.id,
    reviewerId: user.id,
    action: status,
    comment: parsed.data.comment,
    createdAt: new Date(),
  });

  return { data: user.role === UserRole.DEPARTMENT_ADMIN ? departmentDemoAchievement(achievement) : achievement };
});

app.setErrorHandler((error, request, reply) => {
  const status = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const message = status === 429 ? "Too many requests. Try again shortly." : "The request could not be processed.";
    return reply.code(status).send({ error: { code: status === 429 ? "RATE_LIMITED" : "BAD_REQUEST", message } });
  }
  request.log.error({ err: error }, "Unhandled request error");
  return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  process.exit(0);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  await app.listen({ port: env.port, host: "0.0.0.0" });
}

export { app };
