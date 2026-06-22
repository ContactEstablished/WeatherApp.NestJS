# Impl 5-2 — Local DB bring-up, migration apply, seed decision, and end-to-end proxy check

**Acceptance contract:** `docs/tasks/Tasks-5-2.md`
**Decision lock:** Tasks-5-2 §Decisions locked — `migrate dev` (not `migrate deploy`); seed runs the no-op stub; compose is unedited; dashboard uses mock data.
**Scope:** Runtime verification only — no application code, schema, migration, or dependency changes.

---

## Step 0 — Pre-flight: confirm Task 5-1 is complete and the workspace is clean

This task depends on Task 5-1 having landed. Confirm every pre-condition before touching Docker or Prisma.

**0a. Confirm the `dev` script is present in `package.json`.**

Open `package.json` and verify the `scripts` block contains:

```json
"dev": "nx run-many -t serve"
```

If the `dev` entry is absent, Task 5-1 is not complete. Stop and complete Task 5-1 first.

**0b. Confirm `CLAUDE.md` documents the local-dev loop.**

Open `CLAUDE.md` `## Commands` section and verify it documents the `docker compose up -d` → `npx prisma migrate dev` → `npm run dev` loop. If the loop is absent, Task 5-1 is not complete.

**0c. Confirm `.env.example` is reconciled (five vars, correct `DATABASE_URL`).**

Open `.env.example` and verify:
- Exactly five variables: `DATABASE_URL`, `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, `PORT`.
- `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`
- `PORT=3000` and `CORS_ORIGIN=http://localhost:4200`.

**0d. Confirm `prisma/seed.ts` is the Phase 2 stub (no seed data authored).**

Open `prisma/seed.ts` and verify it contains `async function main() {}` with the upsert block commented out. The file must be unchanged from Phase 2.

**0e. Confirm `apps/web/proxy.conf.json` forwards both prefixes.**

Open `apps/web/proxy.conf.json` and confirm both `/api` and `/health` target `http://localhost:3000`.

**0f. Confirm the one committed migration exists on disk.**

Verify the file `prisma/migrations/20260620144720_init/migration.sql` exists and that `prisma/migrations/migration_lock.toml` is present. No second migration directory must exist under `prisma/migrations/`.

**0g. Confirm `package.json` `prisma.seed` hook is wired.**

Open `package.json` and verify:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

**0h. Confirm `.env` does not yet exist (it will be created in Step 1).**

Run:

```powershell
Test-Path .env
```

If `.env` already exists, verify its `DATABASE_URL` matches the compose credentials before proceeding — do not overwrite a customised `.env` without inspecting it.

**Verify gate:** All pre-conditions pass. If any Task 5-1 deliverable is missing, stop and complete Task 5-1. If `prisma/seed.ts` has been modified or a second migration directory exists, stop and request approval.

---

## Step 1 — Create `.env` from `.env.example`

`.env` is gitignored and must never be committed. Copy `.env.example` to `.env` so the API can read `DATABASE_URL` at runtime.

```powershell
Copy-Item .env.example .env
```

Open `.env` and confirm the `DATABASE_URL` line reads:

```
DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public
```

Leave `OPENWEATHER_API_KEY=` blank (empty value). This is what enables mock-data mode — no real API key is needed for this verification task.

**Verify gate:** `.env` exists at the repo root and contains all five variables. `OPENWEATHER_API_KEY` is blank or absent (mock-data path active).

---

## Step 2 — Start the Postgres `db` service

```powershell
docker compose up -d
```

Expected output: Docker pulls `postgres:16` if not cached, creates the `postgres_data` volume, and starts the `db` container. The command exits immediately (detached).

Wait for the healthcheck to pass (the `pg_isready -U nimbus -d nimbus` probe runs every 10 s with up to 5 retries):

```powershell
docker compose ps
```

Expected output: the `db` service shows `healthy` in the `STATUS` column. Example:

```
NAME        IMAGE         COMMAND                  SERVICE   CREATED         STATUS                   PORTS
<proj>-db-1 postgres:16   "docker-entrypoint.s…"  db        X seconds ago   Up X seconds (healthy)   0.0.0.0:5432->5432/tcp
```

If the status shows `starting` rather than `healthy`, wait 15 seconds and re-run `docker compose ps` until it transitions. If after 60 seconds the container is not healthy, check `docker compose logs db` for the error before proceeding.

**Verify gate:** `docker compose ps` shows the `db` service with status `(healthy)`. Acceptance criterion 1 is satisfied.

---

## Step 3 — Apply the committed migration with `prisma migrate dev`

```powershell
npx prisma migrate dev
```

This command connects to the `nimbus` database using `DATABASE_URL` from `.env`, compares the schema against the database state, and applies any unapplied migrations.

Expected output (first run on a fresh database):

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "nimbus", schema "public" at "localhost:5432"

Applying migration `20260620144720_init`

The following migration(s) have been applied:

migrations/
  └─ 20260620144720_init/
    └─ migration.sql

Your database is now in sync with your schema.
```

**STOP conditions — do not proceed past this step if:**
- The command reports schema drift (the local schema does not match the migration history).
- The command asks "Would you like to create a new migration?" — this means the schema has changed beyond the committed migration. Request approval before answering yes.
- The command fails with a connection error — verify Docker is running and `DATABASE_URL` in `.env` matches the compose credentials.

**Verify gate:** `npx prisma migrate dev` exits 0 with "Your database is now in sync with your schema." No new migration directory was created under `prisma/migrations/`. Acceptance criteria 3 and 5 are satisfied.

---

## Step 4 — Verify migration status reports exactly one applied migration and no drift

```powershell
npx prisma migrate status
```

Expected output:

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "nimbus", schema "public" at "localhost:5432"

1 migration found in prisma/migrations

Following migration have been applied:

migrations/
  └─ 20260620144720_init/
    └─ migration.sql
```

The output must:
- Report exactly **1 migration found**.
- List `20260620144720_init` as applied.
- Contain no drift warnings (no "following migrations have not yet been applied", no "failed", no "following migrations were modified after they were applied").

**Verify gate:** `npx prisma migrate status` exits 0, reports exactly 1 applied migration (`20260620144720_init`), and reports no drift. Acceptance criterion 4 is satisfied.

---

## Step 5 — Execute the seed decision: run `npx prisma db seed`

The task decision is to run the no-op stub (not defer). The stub's `main()` body is empty — it connects to the database, does nothing, and disconnects cleanly.

```powershell
npx prisma db seed
```

Expected output:

```
Running seed command `ts-node prisma/seed.ts` ...

The seed command has been executed.
```

The command must exit 0. No rows are inserted (the upsert block in `seed.ts` remains commented out).

**Verify gate:** `npx prisma db seed` exits 0 with "The seed command has been executed." Acceptance criteria 6 and 7 are satisfied. `prisma/seed.ts` is still the unmodified Phase 2 stub (acceptance criterion 8).

---

## Step 6 — Start the full dev stack with `npm run dev`

Open a **new terminal window** (leave it running for Steps 7 and 8 — do not close it). From the repo root:

```powershell
npm run dev
```

This runs `nx run-many -t serve`, which starts both the NestJS API (`apps/api`) on port 3000 and the Angular dev server (`apps/web`) on port 4200.

Wait until you see both serve targets report ready. Indicators to look for:

- API ready: `[Nest] ... Application is running on: http://localhost:3000` (or similar NestJS bootstrap line).
- Web ready: `** Angular Live Development Server is listening on localhost:4200 **` (or `Local: http://localhost:4200/`).

The Angular dev server loads `apps/web/proxy.conf.json` automatically, which forwards `/api` and `/health` to `http://localhost:3000`.

**Verify gate:** Both servers are running and accepting connections. No fatal startup errors in the terminal output.

---

## Step 7 — Verify the `/api/weather/dashboard` proxy endpoint

With `npm run dev` running, in a separate PowerShell window run:

```powershell
Invoke-WebRequest -Uri "http://localhost:4200/api/weather/dashboard" -UseBasicParsing | Select-Object StatusCode, Content
```

Or with curl if available:

```powershell
curl -s -o - -w "\nHTTP %{http_code}\n" http://localhost:4200/api/weather/dashboard
```

**Expected result:**
- HTTP status code: `200`
- Response body: a JSON object containing all nine top-level keys required by §0.2 (mock data, no `OPENWEATHER_API_KEY` in `.env`):
  - `current`
  - `hourly`
  - `daily`
  - `previews`
  - `metrics`
  - `locations`
  - `unitSystem`
  - `temperatureUnit`
  - `windUnit`

To confirm all nine keys are present, pipe the response through a JSON check:

```powershell
$resp = Invoke-WebRequest -Uri "http://localhost:4200/api/weather/dashboard" -UseBasicParsing
$json = $resp.Content | ConvertFrom-Json
$required = @('current','hourly','daily','previews','metrics','locations','unitSystem','temperatureUnit','windUnit')
$required | ForEach-Object { if (-not ($json.PSObject.Properties.Name -contains $_)) { Write-Error "Missing key: $_" } }
Write-Host "All required keys present."
```

The response arrives via the Angular dev server at port 4200 (not directly from 3000), which proves the proxy is active. This satisfies acceptance criterion 11.

**Verify gate:** HTTP 200 returned from `http://localhost:4200/api/weather/dashboard`. JSON body contains all nine required top-level keys. Acceptance criteria 9 and 11 are satisfied.

---

## Step 8 — Verify the `/health` proxy endpoint

With `npm run dev` still running:

```powershell
Invoke-WebRequest -Uri "http://localhost:4200/health" -UseBasicParsing | Select-Object StatusCode, Content
```

Or with curl:

```powershell
curl -s http://localhost:4200/health
```

**Expected result:**
- HTTP status code: `200`
- Response body (exact shape):

```json
{
  "status": "ok",
  "service": "nimbus-api",
  "time": "<ISO 8601 timestamp>"
}
```

The `time` value will vary (it is the current UTC time in ISO 8601 format, e.g. `"2026-06-22T14:30:00.000Z"`). The `status` must be `"ok"` and `service` must be `"nimbus-api"`.

To confirm the shape:

```powershell
$resp = Invoke-WebRequest -Uri "http://localhost:4200/health" -UseBasicParsing
$json = $resp.Content | ConvertFrom-Json
if ($json.status -ne 'ok') { Write-Error "Expected status=ok, got $($json.status)" }
if ($json.service -ne 'nimbus-api') { Write-Error "Expected service=nimbus-api, got $($json.service)" }
if (-not ($json.time -match '^\d{4}-\d{2}-\d{2}T')) { Write-Error "time is not ISO 8601: $($json.time)" }
Write-Host "Health check shape verified."
```

**Verify gate:** HTTP 200 returned from `http://localhost:4200/health`. Body contains `status: "ok"`, `service: "nimbus-api"`, and `time` as an ISO 8601 string. Acceptance criteria 10 and 11 are satisfied.

---

## Step 9 — Stop the dev stack and run the static quality gates

Stop `npm run dev` in the terminal where it is running (`Ctrl+C`). The Docker `db` container may remain running — it is not required for the build/lint/test commands below.

Run all three quality gates in sequence. Each must exit 0.

**Build:**

```powershell
npm run build
```

Expected: all Nx build targets complete successfully. No TypeScript or Angular compilation errors.

**Lint:**

```powershell
npm run lint
```

Expected: ESLint passes across all projects with no errors. No `prefer-control-flow` violations, no unused-import errors.

**Test:**

```powershell
npm test
```

Expected: all Jest suites pass. Zero failures, zero test-suite errors.

**Verify gate:** All three commands exit 0. Acceptance criterion 12 is satisfied. No files under `apps/`, `libs/`, `prisma/`, or `docker-compose.yml` were modified by this task.

---

## Step 10 — Final sanity check: diff and commit

Confirm that no application files were modified (this task is runtime verification only).

```powershell
git diff --stat
git status
```

Expected: the only untracked or modified file is `.env` (which is gitignored and must not appear in `git status` tracked output). If any tracked file appears modified, inspect it before committing — this task must not change application code.

If `.env` appears in `git status` output at all, confirm `.gitignore` is excluding it (`git check-ignore -v .env`).

This task produces **no commit** — it is a runtime verification pass. All acceptance criteria are satisfied by the runtime evidence collected in Steps 1–9 (no code was changed, so there is nothing to commit).

If Task 5-1 was not yet committed before starting Task 5-2, commit Task 5-1 first using its suggested commit message:

```
chore(dev): add npm dev script and document local-dev loop
```

Task 5-2 itself has no code deliverable and therefore no commit.

**Verify gate:** `git diff --stat` shows no tracked-file changes attributable to Task 5-2. All twelve acceptance criteria have been satisfied by runtime evidence. Phase 5 is complete.
