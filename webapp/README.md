# Jobs & Candidates Web App

Next.js 14 (App Router) app backed by DynamoDB. Auth uses JWT in an HTTP-only cookie (no Cognito). Job and candidate processing calls AgentCore synchronously; when AgentCore env vars are missing, the app uses mock responses that map 1:1 to the exact DynamoDB columns.

## Prerequisites
- Node.js 18+
- AWS account/credentials with access to DynamoDB (env, shared profile, or AWS SSO)

## 1) Environment variables (required)
Create `webapp/.env.local` with:

```env
AWS_REGION=us-east-1
DYNAMO_TABLE_USERS=users
DYNAMO_TABLE_JOBS=jobs
DYNAMO_TABLE_CANDIDATES=candidates
JWT_SECRET=change-me-to-a-long-random-string

# AgentCore HTTP (optional: omit for mock mode)
AGENTCORE_BASE_URL=
AGENTCORE_JD_PROCESS=/api/jd_process
AGENTCORE_RESUME_PROCESS=/api/resume_process
AGENTCORE_API_KEY=

# Bedrock AgentCore runtime ARNs (preferred)
JD_AGENT_RUNTIME_ARN=
RESUME_AGENT_RUNTIME_ARN=
```

- **Mock mode**: If the AgentCore variables are not set, the app returns immediate mock responses in the required shapes and writes them to DynamoDB.

## 2) DynamoDB tables (exact requirements)
Create three tables with the following item attributes and GSIs.

### `users`
- Columns: `id`, `name`, `email` (unique), `password_hash`, `created_at`, `GSI1PK`, `GSI1SK`
- Primary key: `id` (partition key)
- GSI (name exactly `GSI1`):
  - Partition key: `GSI1PK` (value = email)
  - Sort key: `GSI1SK` (value = id)

### `jobs`
- Columns: `id`, `title`, `years_of_experience` (number), `seniority_level` (enum string), `jd_text`, `skills` (object), `education_desired_experience` (object), `responsibilities` (list of { text, source_section? }), `updated_at` (ISO), `created_at` (ISO)
- Primary key: `id` (partition key)

### `candidates`
- Columns: `id`, `pi_details` (object), `sparse_resume` (boolean or string), `resume_summary` (object), `skills_eval` (object), `desired_exp_eval` (object), `education_eval` (object), `status` (string), `resume_text` (string), `job_id` (string FK), `created_at` (ISO), `updated_at` (ISO), `GSI1PK`, `GSI1SK`
- Primary key: `id` (partition key)
- GSI (name exactly `GSI1`):
  - Partition key: `GSI1PK` (value = job_id)
  - Sort key: `GSI1SK` (value = id)

> Note: Column names are strict. Use the exact names above. No renames or extras.

## 3) Install and run

```bash
cd webapp
npm install
npm run dev
```

Open `http://localhost:3000`. You’ll be redirected to `/login` when unauthenticated.

## Auth endpoints
- `POST /api/auth/signup` → body `{name,email,password}`; creates user (bcrypt hash), sets JWT cookie
- `POST /api/auth/login` → verify and set JWT cookie
- `POST /api/auth/logout` → clear cookie
- `GET /api/auth/me` → returns user summary from JWT

## Jobs endpoints
- `POST /api/jobs` → body `{title, years_of_experience, seniority_level, jd_text}`
  - Writes minimal row, calls AgentCore JD synchronously, then sets `skills`, `education_desired_experience`, `responsibilities`, `updated_at`
- `GET /api/jobs` → list
- `GET /api/jobs/:id` → full item
- `PUT /api/jobs/:id` → accepts the same editable fields, re-runs JD process, overwrites derived columns

## Candidates endpoints
- `POST /api/jobs/:jobId/candidates` → body `{resume_text}`
  - Writes candidate with `status="processing"`, calls AgentCore resume synchronously, sets `resume_summary`, `pi_details`, `skills_eval`, `desired_exp_eval`, `education_eval`, `sparse_resume?`, and `status` (default `completed`)
- `GET /api/candidates/:id`
- `PUT /api/candidates/:id` → allow updating `resume_text`; re-run resume process and update evaluation fields
- `GET /api/jobs/:jobId/candidates` → list via GSI on `job_id`

## UI routes
- Public: `/login`, `/signup`
- Protected:
  - `/jobs` (list + Create Job)
  - `/jobs/new` (create form)
  - `/jobs/[id]` (details: Skills, Education/Desired Experience, Responsibilities + Add Candidate)
  - `/jobs/[id]/edit` (edit form; overwrites derived columns on save)
  - `/candidates/[id]` (cards for all evaluation fields)

## Validation & UX
- zod validation on server and forms:
  - Jobs: `title` 2..120, `years_of_experience` 0..50, `seniority_level` enum, `jd_text` 20..10000
  - Candidate create/update: `resume_text` 50..200000
- Tailwind responsive layouts; inputs disabled during in-flight sync; toasts on success/error

## Scripts
- Dev/Build/Start: `npm run dev` / `npm run build` / `npm run start`
- Lint: `npm run lint`
- Unit tests (Vitest): `npm run test` (UI: `npm run test:ui`)
- E2E (Playwright): `npm run e2e` (run dev server separately)

## Notes
- Auth uses a JWT in an HTTP-only cookie named `auth`.
- AgentCore calls are synchronous only (no polling). Mock mode is automatic when AgentCore env is absent.
- AWS SDK v3 DocumentClient is used with `removeUndefinedValues: true` to keep stored items clean.
