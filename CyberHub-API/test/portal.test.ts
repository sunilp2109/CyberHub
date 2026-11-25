import assert from "node:assert/strict";
import { after, test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { AchievementType } from "@prisma/client";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.SESSION_TTL_DAYS = "0.0000002";

const { app } = await import("../src/server.js");
after(() => app.close());

const demoPassword = "password123";
let nextLoginAddress = 2;
const competitionValues = {
  activity: "Threat intelligence platform", level: "National", competitionType: "Hackathon",
  organiser: "QA Institute", participation: "Team", dates: "12–14 Aug 2024",
  venue: "Online", position: "Finalist", prizeMoney: "50000", currency: "INR", recognition: "Special mention",
};
const internshipValues = {
  company: "QA Studio", workMode: "Hybrid", location: "Chennai, India", internshipType: "Part-time",
  startDate: "2026-11-01", compensation: "Unpaid", details: "Worked on application accessibility.",
};
const projectValues = {
  fundingAgency: "QA Funding Board", amount: "150000.50", currency: "INR",
  projectType: "Innovation", projectStatus: "Active", details: "Build a research dashboard.",
};
const publicationValues = {
  level: "International", publicationType: "Journal", venue: "QA Academic Review",
  publicationDate: "2026-11-25", indexedBy: "Scopus, Web of Science", publicationLink: "https://doi.org/10.1000/example",
};
const patentValues = {
  patentOffice: "India (IPO)", patentStatus: "Under Examination", filingDate: "2026-11-25",
  applicationNo: "QA-123", inventors: "Student One, Student Two", details: "A reference abstract.",
};
const awardValues = {
  details: "Recognised for academic performance and volunteering.",
  level: "Institutional", issuer: "QA University", ceremonyDate: "2026-11-25", recognition: "Cash prize",
};
const submissionValues: Partial<Record<AchievementType, Record<string, string>>> = {
  COMPETITION: competitionValues,
  CERTIFICATE: { issuer: "QA Institute" },
  INTERNSHIP: internshipValues,
  PROJECT: projectValues,
  PUBLICATION: publicationValues,
  PATENT: patentValues,
  AWARD: awardValues,
};

async function login(identifier: string, remember = true) {
  const response = await app.inject({
    method: "POST", url: "/api/v1/auth/login",
    remoteAddress: `127.0.0.${nextLoginAddress++}`,
    payload: { identifier, password: demoPassword, remember },
  });
  assert.equal(response.statusCode, 200);
  assert.match(String(response.headers["set-cookie"]), /HttpOnly/i);
  return { cookie: String(response.headers["set-cookie"]).split(";")[0], role: response.json().data.role };
}

test("validates credentials and handles authentication, expiration and logout", async () => {
  const empty = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: {} });
  assert.equal(empty.statusCode, 400);
  const invalid = await app.inject({
    method: "POST", url: "/api/v1/auth/login",
    payload: { identifier: "student", password: "incorrect-password" },
  });
  assert.equal(invalid.statusCode, 401);
  assert.equal((await app.inject("/api/v1/auth/me")).statusCode, 401);
  const faculty = await login("faculty");
  assert.equal(faculty.role, "FACULTY");
  const current = await app.inject({ url: "/api/v1/auth/me", headers: faculty });
  assert.equal(current.json().data.role, "FACULTY");
  assert.equal((await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: faculty })).statusCode, 200);
  assert.equal((await app.inject({ url: "/api/v1/auth/me", headers: faculty })).statusCode, 401);
  const expired = await login("student", false);
  await setTimeout(30);
  assert.equal((await app.inject({ url: "/api/v1/auth/me", headers: expired })).statusCode, 401);
});

test("supports all achievement types and scopes reads, edits and review actions", async () => {
  const student = await login("student");
  const otherStudent = await login("uat-student");
  const faculty = await login("faculty");
  assert.equal(student.role, "STUDENT");
  const listUrl = "/api/v1/achievements";
  const payload = { type: "PROJECT", title: "Portal QA submission" };
  assert.equal((await app.inject({ method: "POST", url: listUrl, headers: faculty, payload })).statusCode, 403);
  assert.equal((await app.inject({ url: "/api/v1/student/summary", headers: faculty })).statusCode, 403);
  assert.equal((await app.inject({ url: "/api/v1/staff/students", headers: student })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: listUrl, headers: student, payload: { ...payload, title: "" } })).statusCode, 400);

  for (const type of Object.values(AchievementType)) {
    const submission = { ...payload, type, values: submissionValues[type] };
    const created = await app.inject({ method: "POST", url: listUrl, headers: student, payload: submission });
    assert.equal(created.statusCode, 201, type);
    const record = created.json().data;
    const url = `${listUrl}/${record.id}`;
    assert.equal((await app.inject({ method: "PATCH", url, headers: otherStudent, payload: submission })).statusCode, 404);
    assert.equal((await app.inject({ method: "PATCH", url: `${url}/review`, headers: student, payload: { action: "APPROVED" } })).statusCode, 403);
    const updated = await app.inject({ method: "PATCH", url, headers: student, payload: { ...submission, title: "Updated portal QA submission" } });
    assert.equal(updated.json().data.title, "Updated portal QA submission");
    if (type === "PROJECT") {
      const queue = await app.inject({ url: listUrl, headers: faculty });
      assert.ok(queue.json().data.some((item: { id: string }) => item.id === record.id));
      assert.equal(updated.json().data.metadata.projectStatus, "Active");
      assert.equal(updated.json().data.status, "SUBMITTED");
      const noReason = await app.inject({ method: "PATCH", url: `${url}/review`, headers: faculty, payload: { action: "REJECTED" } });
      assert.equal(noReason.statusCode, 400);
      const decision = await app.inject({ method: "PATCH", url: `${url}/review`, headers: faculty, payload: { action: "REJECTED", comment: "Please check the submitted details." } });
      assert.equal(decision.statusCode, 200);
      assert.equal(decision.json().data.status, "REJECTED");
      assert.equal((await app.inject({ method: "PATCH", url: `${url}/review`, headers: faculty, payload: { action: "APPROVED" } })).statusCode, 409);
      const ownList = (await app.inject({ url: listUrl, headers: student })).json().data;
      assert.equal(ownList.find((item: { id: string }) => item.id === record.id).approvals[0].comment, "Please check the submitted details.");
      const otherList = (await app.inject({ url: listUrl, headers: otherStudent })).json().data;
      assert.ok(!otherList.some((item: { id: string }) => item.id === record.id));
    } else if (type === "CERTIFICATE") {
      assert.equal((await app.inject({ method: "PATCH", url: `${url}/review`, headers: faculty, payload: { action: "APPROVED" } })).statusCode, 200);
    }
  }

  const draft = await app.inject({ method: "POST", url: listUrl, headers: student, payload: { ...payload, status: "DRAFT" } });
  assert.equal(draft.statusCode, 201);
  const draftId = draft.json().data.id;
  assert.equal((await app.inject({ method: "PATCH", url: `${listUrl}/${draftId}/review`, headers: faculty, payload: { action: "APPROVED" } })).statusCode, 404);
  const summary = await app.inject({ url: "/api/v1/student/summary", headers: student });
  assert.ok(summary.json().data.counts.rejected >= 1);
});

test("scopes Department Admin directories, review decisions, and attachments to the assigned department", async () => {
  const admin = await login("department-admin");
  const unassigned = await login("test-unassigned-admin");
  const student = await login("student");
  const outside = await login("test-outside-student");
  assert.equal(admin.role, "DEPARTMENT_ADMIN");
  const session = await app.inject({ url: "/api/v1/auth/me", headers: admin });
  const departmentId = session.json().data.department.id;
  const listUrl = "/api/v1/achievements";
  const bytes = Buffer.from("%PDF-1.4\n%%EOF");
  const create = (headers: typeof student, title: string) => app.inject({
    method: "POST", url: listUrl, headers,
    payload: { type: "CERTIFICATE", title, values: { issuer: "QA Institute" },
      evidence: [{ fileName: "proof.pdf", mimeType: "application/pdf", content: bytes.toString("base64") }] },
  });
  const insideResponse = await create(student, "Department student certificate");
  const outsideResponse = await create(outside, "Outside department certificate");
  assert.equal(insideResponse.statusCode, 201);
  assert.equal(outsideResponse.statusCode, 201);
  const insideRecord = insideResponse.json().data;
  const outsideRecord = outsideResponse.json().data;

  const directory = await app.inject({ url: "/api/v1/staff/students", headers: admin });
  assert.equal(directory.statusCode, 200);
  assert.ok(directory.json().data.some(({ id }: { id: string }) => id === insideRecord.studentId));
  assert.ok(!directory.json().data.some(({ id }: { id: string }) => id === outsideRecord.studentId));
  const scopedQueue = await app.inject({ url: listUrl, headers: admin });
  assert.equal(scopedQueue.statusCode, 200);
  const visible = scopedQueue.json().data.find(({ id }: { id: string }) => id === insideRecord.id);
  assert.ok(visible);
  assert.equal(visible.documents[0].storageKey, undefined);
  assert.ok(!scopedQueue.json().data.some(({ id }: { id: string }) => id === outsideRecord.id));
  assert.equal((await app.inject({ url: listUrl, headers: unassigned })).statusCode, 403);
  assert.equal((await app.inject({ url: "/api/v1/staff/students", headers: unassigned })).statusCode, 403);
  assert.equal((await app.inject({ url: "/api/v1/staff/events", headers: admin })).statusCode, 403);

  const evidencePath = (record: typeof insideRecord) => `${listUrl}/${record.id}/documents/${record.documents[0].id}`;
  assert.equal((await app.inject({ url: evidencePath(outsideRecord), headers: admin })).statusCode, 404);
  assert.equal((await app.inject({ url: evidencePath(insideRecord), headers: unassigned })).statusCode, 403);
  const allowedEvidence = await app.inject({ url: evidencePath(insideRecord), headers: admin });
  assert.equal(allowedEvidence.statusCode, 200);
  assert.deepEqual(allowedEvidence.rawPayload, bytes);
  const reject = (record: typeof insideRecord) => app.inject({ method: "PATCH", url: `${listUrl}/${record.id}/review`,
    headers: admin, payload: { action: "REJECTED", comment: "Please attach the signed certificate." } });
  assert.equal((await reject(outsideRecord)).statusCode, 404);
  assert.equal((await reject(insideRecord)).statusCode, 200);
  const ownList = await app.inject({ url: listUrl, headers: student });
  const result = ownList.json().data.find(({ id }: { id: string }) => id === insideRecord.id);
  assert.equal(result.status, "REJECTED");
  assert.equal(result.approvals[0].comment, "Please attach the signed certificate.");
  const reviewHistory = await app.inject({ url: listUrl, headers: admin });
  const decision = reviewHistory.json().data.find(({ id }: { id: string }) => id === insideRecord.id).approvals[0];
  assert.ok(decision.createdAt);
  assert.equal(decision.reviewerId, undefined);

  const update = await app.inject({ method: "PATCH", url: "/api/v1/profile", headers: admin,
    payload: { name: "Morgan Lee", role: "ADMIN", departmentId: "test-dept-other" } });
  assert.equal(update.statusCode, 200);
  assert.equal(update.json().data.role, "DEPARTMENT_ADMIN");
  assert.equal(update.json().data.department.id, departmentId);
});

test("validates project funding and accepts an unfunded project", async () => {
  const student = await login("student");
  const url = "/api/v1/achievements";
  const post = (values: object) => app.inject({
    method: "POST", url, headers: student, payload: { type: "PROJECT", title: "QA project", values },
  });
  for (const invalid of [
    { fundingAgency: " " }, { amount: "-100" }, { amount: "10.125" }, { currency: "12A" }, { projectStatus: "APPROVED" },
  ]) {
    assert.equal((await post({ ...projectValues, ...invalid })).statusCode, 400);
  }
  const unfunded = await post({ fundingAgency: "None", amount: "0", currency: "INR" });
  assert.equal(unfunded.statusCode, 201);
  assert.equal(unfunded.json().data.metadata.amount, "0");
});

test("validates publication metadata and permits one protected evidence file", async () => {
  const student = await login("student");
  const faculty = await login("faculty");
  const other = await login("uat-student");
  const url = "/api/v1/achievements";
  const payload = { type: "PUBLICATION", title: "QA paper", values: publicationValues };
  const bytes = Buffer.from("%PDF-1.4\n%%EOF");
  const file = { fileName: "proof.pdf", mimeType: "application/pdf", content: bytes.toString("base64") };
  const post = (submission: object) => app.inject({ method: "POST", url, headers: student, payload: submission });
  for (const changes of [
    { venue: " " }, { publicationDate: "2026-02-30" }, { indexedBy: "Scopus, Scopus" }, { publicationLink: "javascript:alert(1)" },
  ]) {
    assert.equal((await post({ ...payload, values: { ...publicationValues, ...changes } })).statusCode, 400);
  }
  assert.equal((await post({ ...payload, evidence: [file, file] })).statusCode, 400);
  const created = await post({ ...payload, evidence: [file] });
  assert.equal(created.statusCode, 201);
  const record = created.json().data;
  assert.deepEqual(record.metadata, publicationValues);
  const downloadUrl = `${url}/${record.id}/documents/${record.documents[0].id}`;
  assert.equal((await app.inject({ url: downloadUrl, headers: other })).statusCode, 404);
  const download = await app.inject({ url: downloadUrl, headers: faculty });
  assert.equal(download.statusCode, 200);
  assert.deepEqual(download.rawPayload, bytes);
});

test("validates patent filing details and keeps patent status separate from review", async () => {
  const student = await login("student");
  const faculty = await login("faculty");
  const other = await login("uat-student");
  const url = "/api/v1/achievements";
  const payload = { type: "PATENT", title: "QA patent", values: patentValues };
  const bytes = Buffer.from("%PDF-1.4\n%%EOF");
  const file = { fileName: "patent-document.pdf", mimeType: "application/pdf", content: bytes.toString("base64") };
  const post = (submission: object) => app.inject({ method: "POST", url, headers: student, payload: submission });
  for (const changes of [{ patentOffice: " " }, { filingDate: "2026-02-30" }, { patentStatus: "APPROVED" }]) {
    assert.equal((await post({ ...payload, values: { ...patentValues, ...changes } })).statusCode, 400);
  }
  assert.equal((await post({ ...payload, evidence: [file, file] })).statusCode, 400);
  const created = await post({ ...payload, evidence: [file] });
  assert.equal(created.statusCode, 201);
  const record = created.json().data;
  assert.deepEqual(record.metadata, patentValues);
  const reviewed = await app.inject({
    method: "PATCH", url: `${url}/${record.id}/review`, headers: faculty, payload: { action: "APPROVED" },
  });
  assert.equal(reviewed.statusCode, 200);
  assert.equal(reviewed.json().data.status, "APPROVED");
  assert.equal(reviewed.json().data.metadata.patentStatus, "Under Examination");
  const downloadUrl = `${url}/${record.id}/documents/${record.documents[0].id}`;
  assert.equal((await app.inject({ url: downloadUrl, headers: other })).statusCode, 404);
  const download = await app.inject({ url: downloadUrl, headers: faculty });
  assert.equal(download.statusCode, 200);
  assert.deepEqual(download.rawPayload, bytes);
});

test("validates awards and permits one protected certificate or photo", async () => {
  const student = await login("student");
  const faculty = await login("faculty");
  const other = await login("uat-student");
  const url = "/api/v1/achievements";
  const payload = { type: "AWARD", title: "QA award", values: awardValues };
  const bytes = Buffer.from("%PDF-1.4\n%%EOF");
  const file = { fileName: "award-certificate.pdf", mimeType: "application/pdf", content: bytes.toString("base64") };
  const post = (submission: object) => app.inject({ method: "POST", url, headers: student, payload: submission });
  for (const changes of [{ details: " " }, { issuer: "" }, { ceremonyDate: "2026-02-30" }, { level: "APPROVED" }]) {
    assert.equal((await post({ ...payload, values: { ...awardValues, ...changes } })).statusCode, 400);
  }
  assert.equal((await post({ ...payload, evidence: [file, file] })).statusCode, 400);
  const created = await post({ ...payload, evidence: [file] });
  assert.equal(created.statusCode, 201);
  const award = created.json().data;
  assert.deepEqual(award.metadata, awardValues);
  const downloadUrl = `${url}/${award.id}/documents/${award.documents[0].id}`;
  assert.equal((await app.inject({ url: downloadUrl, headers: other })).statusCode, 404);
  const download = await app.inject({ url: downloadUrl, headers: faculty });
  assert.equal(download.statusCode, 200);
  assert.deepEqual(download.rawPayload, bytes);
});

test("requires competition details and protects uploaded evidence", async () => {
  const student = await login("student");
  const other = await login("uat-student");
  const faculty = await login("faculty");
  const url = "/api/v1/achievements";
  const bytes = Buffer.from("%PDF-1.4\n%%EOF");
  const certificate = { fileName: "Competition certificate.pdf", mimeType: "application/pdf", content: bytes.toString("base64") };
  const payload = { type: "COMPETITION", title: "QA competition", values: competitionValues };
  const post = (submission: object) => app.inject({ method: "POST", url, headers: student, payload: submission });
  assert.equal((await post({ ...payload, values: { ...competitionValues, venue: " " } })).statusCode, 400);
  assert.equal((await post({ ...payload, evidence: [{ ...certificate, mimeType: "image/png" }] })).statusCode, 400);
  const created = await post({ ...payload, evidence: [certificate] });
  assert.equal(created.statusCode, 201);
  const record = created.json().data;
  assert.deepEqual(record.metadata, competitionValues);
  const downloadUrl = `${url}/${record.id}/documents/${record.documents[0].id}`;
  assert.equal((await app.inject(downloadUrl)).statusCode, 401);
  assert.equal((await app.inject({ url: downloadUrl, headers: other })).statusCode, 404);
  for (const headers of [student, faculty]) {
    const file = await app.inject({ url: downloadUrl, headers });
    assert.equal(file.statusCode, 200);
    assert.match(String(file.headers["content-disposition"]), /^attachment;/);
    assert.deepEqual(file.rawPayload, bytes);
  }
  const tooMany = await app.inject({
    method: "PATCH", url: `${url}/${record.id}`, headers: student, payload: { ...payload, evidence: [certificate, certificate] },
  });
  assert.equal(tooMany.statusCode, 400);
  const edited = await app.inject({ method: "PATCH", url: `${url}/${record.id}`, headers: student, payload: { ...payload, evidence: [certificate] } });
  assert.equal(edited.statusCode, 200);
  assert.equal(edited.json().data.documents.length, 2);
});

test("collects credential details and permits one evidence attachment", async () => {
  const student = await login("student");
  const faculty = await login("faculty");
  const url = "/api/v1/achievements";
  const values = {
    issuer: "QA Institute", certifyingBody: "QA Certification Board", duration: "40 hours",
    dateEarned: "2026-11-25", credentialId: "QA-01", notes: "Completed with distinction",
  };
  const payload = { type: "CERTIFICATE", title: "QA Security Course", values };
  const bytes = Buffer.from("%PDF-1.4\n%%EOF");
  const attachment = { fileName: "credential.pdf", mimeType: "application/pdf", content: bytes.toString("base64") };
  const post = (submission: object) => app.inject({ method: "POST", url, headers: student, payload: submission });
  assert.equal((await post({ ...payload, values: { ...values, issuer: " " } })).statusCode, 400);
  assert.equal((await post({ ...payload, values: { ...values, dateEarned: "2026-02-30" } })).statusCode, 400);
  assert.equal((await post({ ...payload, evidence: [attachment, attachment] })).statusCode, 400);
  const created = await post({ ...payload, evidence: [attachment] });
  assert.equal(created.statusCode, 201);
  const record = created.json().data;
  assert.deepEqual(record.metadata, values);
  const download = await app.inject({ url: `${url}/${record.id}/documents/${record.documents[0].id}`, headers: faculty });
  assert.equal(download.statusCode, 200);
  assert.deepEqual(download.rawPayload, bytes);
  const editUrl = `${url}/${record.id}`;
  const edited = await app.inject({ method: "PATCH", url: editUrl, headers: student, payload: { ...payload, values: { ...values, duration: "42 hours" } } });
  assert.equal(edited.statusCode, 200);
  assert.equal(edited.json().data.documents.length, 1);
  const extraFile = await app.inject({ method: "PATCH", url: editUrl, headers: student, payload: { ...payload, evidence: [attachment] } });
  assert.equal(extraFile.statusCode, 400);
});

test("records internship dates and keeps each evidence slot separate", async () => {
  const student = await login("student");
  const faculty = await login("faculty");
  const other = await login("uat-student");
  const url = "/api/v1/achievements";
  const payload = { type: "INTERNSHIP", title: "QA internship", values: internshipValues };
  const bytes = Buffer.from("%PDF-1.4\n%%EOF");
  const file = { fileName: "evidence.pdf", mimeType: "application/pdf", content: bytes.toString("base64") };
  const offer = { ...file, kind: "offer-letter" };
  const completion = { ...file, kind: "completion-certificate" };
  const post = (submission: object) => app.inject({ method: "POST", url, headers: student, payload: submission });

  assert.equal((await post({ ...payload, values: { ...internshipValues, endDate: "2026-10-31" } })).statusCode, 400);
  assert.equal((await post({ ...payload, evidence: [offer, offer] })).statusCode, 400);
  const created = await post({ ...payload, evidence: [offer] });
  assert.equal(created.statusCode, 201);
  const internship = created.json().data;
  assert.deepEqual(internship.metadata, internshipValues);
  const edit = (submission: object) => app.inject({ method: "PATCH", url: `${url}/${internship.id}`, headers: student, payload: submission });
  assert.equal((await edit({ ...payload, evidence: [offer] })).statusCode, 400);
  const edited = await edit({ ...payload, evidence: [completion] });
  assert.equal(edited.statusCode, 200);
  const docIds = edited.json().data.documents.map(({ id }: { id: string }) => id);
  assert.ok(docIds.some((id: string) => id.startsWith("offer-letter-")));
  assert.ok(docIds.some((id: string) => id.startsWith("completion-certificate-")));
  const downloadUrl = `${url}/${internship.id}/documents/${docIds[1]}`;
  assert.equal((await app.inject({ url: downloadUrl, headers: other })).statusCode, 404);
  const download = await app.inject({ url: downloadUrl, headers: faculty });
  assert.equal(download.statusCode, 200);
  assert.deepEqual(download.rawPayload, bytes);
});

test("edits only the signed-in profile and exposes no password hash", async () => {
  const preflight = await app.inject({
    method: "OPTIONS", url: "/api/v1/profile",
    headers: { origin: "http://localhost:3000", "access-control-request-method": "PATCH" },
  });
  assert.equal(preflight.statusCode, 204);
  assert.match(String(preflight.headers["access-control-allow-methods"]), /PATCH/);
  const student = await login("student");
  const response = await app.inject({
    method: "PATCH", url: "/api/v1/profile", headers: student,
    payload: { name: "QA Student", phone: "555-0100", role: "ADMIN", student: { registerNo: "CHANGED" } },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.role, "STUDENT");
  assert.equal(response.json().data.student.registerNo, "21CY001");
  const profile = (await app.inject({ url: "/api/v1/profile", headers: student })).json().data;
  assert.equal(profile.name, "QA Student");
  assert.ok(!("passwordHash" in profile));
});

test("logs attended and conducted events and restricts them to their owner", async () => {
  const faculty = await login("faculty");
  const admin = await login("admin");
  const student = await login("student");
  const url = "/api/v1/staff/events";
  const details = {
    eventName: "Faculty QA Event", eventType: "Panel discussion", eventDate: "2026-11-23",
    facultyRole: "Speaker", organizer: "CyberHub", description: "Event verification",
    format: "hybrid", department: "", venue: "", startTime: "09:00", endTime: "10:00",
    objectives: "", keyTopics: "", eventOutcome: "", chiefGuest: "", numParticipants: "15",
    targetAudience: "", coordinators: "", participationType: "Hybrid", certAvailable: false,
    organizingResponsibility: "", sdgs: [], focusAreas: ["Cybersecurity", "Digital Accessibility"],
  };
  const pdf = Buffer.from("%PDF-1.4\n%%EOF");
  const certificate = { fileName: "Participation Certificate.pdf", mimeType: "application/pdf", content: pdf.toString("base64") };
  let certificateUrl = "";
  for (const mode of ["attended", "conducted"]) {
    const created = await app.inject({ method: "POST", url, headers: faculty,
      payload: { ...details, mode, ...(mode === "attended" ? { certificate } : {}) } });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().data.details.mode, mode);
    if (mode === "attended") {
      const event = created.json().data;
      assert.equal(event.details.certAvailable, true);
      assert.equal(event.certificate.fileName, certificate.fileName);
      assert.equal(event.details.certificateDocument, undefined);
      certificateUrl = `${url}/${event.id}/certificate`;
    }
  }
  const download = await app.inject({ url: certificateUrl, headers: faculty });
  assert.equal(download.statusCode, 200);
  assert.deepEqual(download.rawPayload, pdf);
  assert.match(String(download.headers["content-disposition"]), /Participation%20Certificate\.pdf/);
  assert.equal((await app.inject({ url: certificateUrl, headers: admin })).statusCode, 404);
  assert.equal((await app.inject({ url: certificateUrl, headers: student })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url, headers: faculty, payload: {
    ...details, mode: "attended", certificate: { ...certificate, mimeType: "image/png" },
  } })).statusCode, 400);
  assert.equal((await app.inject({ method: "POST", url, headers: faculty, payload: { ...details, mode: "attended", endTime: "07:00" } })).statusCode, 400);
  assert.equal((await app.inject({ url, headers: student })).statusCode, 403);
  assert.equal((await app.inject({ url, headers: admin })).json().data.length, 0);
  const saved = (await app.inject({ url, headers: faculty })).json().data;
  assert.equal(saved.length, 2);
  assert.equal(saved.find((event: { mode: string }) => event.mode === "attended").certificate.fileName, certificate.fileName);
  for (const event of saved) assert.deepEqual(event.details.focusAreas, details.focusAreas);
});
