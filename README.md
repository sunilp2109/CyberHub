# CyberHub ERP

CyberHub is an academic ERP for students, faculty, departments, and
administrators.

## Current workspace

The existing student and staff portals are kept as separate Next.js applications
while the domain model and backend are being established:

- `CyberHub-Student`: student-facing portal
- `CyberHub-Staff`: faculty and staff-facing portal
- `CyberHub-API`: PostgreSQL-backed authentication and API foundation

The parent workspace provides common commands and local infrastructure. The
frontends remain independently installable applications during this transition,
so their separate lockfiles and Git histories are preserved. Both portals use the shared API for session validation and persisted records.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop for PostgreSQL and Redis

## Install

From this directory (the parent package delegates installation to each portal):

```bash
npm --prefix CyberHub-Student install
npm --prefix CyberHub-Staff install
npm --prefix CyberHub-API install
```

The child applications also retain their individual lockfiles so they can be
run independently during this transition.

## Run the portals

Use separate terminals:

```bash
npm run dev:student
npm run dev:staff
npm run dev:api
```

## Start local infrastructure

Copy `.env.example` to `.env`, then run:

```bash
docker compose up -d
```

The services are available locally at:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- API health: `http://localhost:4000/health`

If another local PostgreSQL container already uses port `5432`, start this
project database on an alternate host port and point the API at it:

```powershell
$env:POSTGRES_PORT = "55432"
docker compose up -d postgres redis
$env:DATABASE_URL = "postgresql://cyberhub:change-me-local-only@localhost:55432/cyberhub?schema=public"
```

Generate the Prisma client and apply the development schema:

```bash
npm run db:generate
npm run db:push
```

To create the first administrator, provide a strong password in the shell
environment and run the seed command:

```powershell
$env:BOOTSTRAP_ADMIN_IDENTIFIER = "admin001"
$env:BOOTSTRAP_ADMIN_PASSWORD = "use-a-unique-password-of-10-or-more-characters"
$env:BOOTSTRAP_STUDENT_IDENTIFIER = "uat-student"
$env:BOOTSTRAP_STUDENT_PASSWORD = "use-another-unique-password"
npm run db:seed
```

Stop them with:

```bash
docker compose down
```

Add `-v` only when intentionally deleting local database and Redis data.

## Validation

```bash
npm run lint:student
npm run lint:staff
npm run build:student
npm run build:staff
npm run build:api
```

## Authentication and workflow scope

The staff portal at `http://localhost:3001/login` signs in both roles. Students
are sent to the student portal at `http://localhost:3000`. Faculty, HODs, and
administrators sign in through the staff portal. An administrator is sent to
the Admin Portal at `http://localhost:3001/admin`. Both portals validate roles on protected
requests. The API enforces student ownership, department-level review scope
for faculty and HODs, and cross-department review for administrators. A
faculty-to-student assignment model is not part of the schema.

The student portal provides thirteen achievement workspaces, a dashboard, and
a personal profile. Faculty can review submitted achievements, browse the
permitted student directory, and log attended or conducted events. A decision
recorded in Staff Approvals appears in the student's activity and dashboard.
My Events lists only records owned by the signed-in staff member.

### Admin Portal

The admin workspace uses the shared session, profile, achievement, and
evidence APIs for account details and document review. Review decisions apply
to the original submission and are visible to the student.

Academic data, faculty allocations, HOD appointments, academic reports,
workspace preferences, and the demo activity log use browser storage scoped
to the signed-in administrator. These screens use sample data and do not
provision accounts or update the institutional database. Use sample records
when trying these screens. The permissions matrix describes current access.
Editing roles and retrieving institutional audit logs require backend support.

PostgreSQL-backed accounts persist profiles, sessions, achievements, review
history, and events. Demo accounts use a separate in-memory store and are
disabled when `NODE_ENV=production`. Run `npm run db:generate` and
`npm run db:push` for a development database to apply the additive
`FacultyEvent` table. Keep PostgreSQL configured for deployment. Redis is
defined in Compose and is currently unused by the application.

When running the portals and API on different internal addresses, set
`API_INTERNAL_URL` in both portals for server-side requests and
`NEXT_PUBLIC_API_URL` for browser requests. Configure `WEB_ORIGINS`, the
portal URLs, and HTTPS. The session cookie is host-only, so both portals
and the browser-facing API must share a hostname for the cookie to reach
each portal's server-side session check.

## API routes

| Area | Routes |
| --- | --- |
| Health | `GET /health`, `GET /health/ready` |
| Session | `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` |
| Own profile | `GET /api/v1/profile`, `PATCH /api/v1/profile` |
| Achievements | `GET /api/v1/achievements`, `POST /api/v1/achievements`, `PATCH /api/v1/achievements/:id` |
| Review | `PATCH /api/v1/achievements/:id/review` |
| Dashboard | `GET /api/v1/student/summary` |
| Staff records | `GET /api/v1/staff/students`, `GET /api/v1/staff/events`, `POST /api/v1/staff/events` |

Competition submissions support up to two attachments. Courses, certificates,
publications, patents, and awards support one, and internships support one offer letter and one
completion certificate. PDF, PNG, and JPG files of up to
5 MB each are accepted. The submitting student and authorized reviewers can
download them. PostgreSQL-backed deployments store the files in
`ACHIEVEMENT_UPLOAD_DIR` (default `achievement-uploads` relative to the API)
and should preserve that directory alongside the database. Docker Compose
mounts a named volume for it. Demo uploads last for the lifetime of the
API process.

Evidence uploads for other student modules, faculty event approval, password recovery,
email notifications, and academic administration modules such as attendance,
subjects, timetable, assignments, marks, and reports are outside the current
implemented workflows. The achievement schema can display stored document
metadata.

Run the API integration tests with `npm --prefix CyberHub-API test`.
