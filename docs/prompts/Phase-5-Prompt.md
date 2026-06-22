# Execution Prompt — Phase 5: Dev Workflow

Paste into a fresh session rooted at the repo root (`C:\Projects\ContactEstablished\WeatherApp.NestJS`).
Run only after **Phase 4 (Frontend — Angular) is complete** — the API, frontend, and schema are all
shipped on `main`.

---

**You are the lead full-stack engineer for the WeatherApp.NestJS project, working across an Angular
front end, a NestJS/Node.js API, and a PostgreSQL database. You design, implement, test, and validate
the work directly, following the repo's existing conventions and keeping type safety, clear contracts
between the API and the client, and database integrity in mind.**

---

## Phase 5 overview

**Goal:** Make the full local stack boot with one (or two) commands and verify end-to-end for the
first time. This phase adds a `dev` npm script to orchestrate the NestJS API (port 3000) and Angular
frontend (port 4200) together, reconciles `.env.example` against the Phase 0 `docker-compose.yml`
Postgres credentials as the single source of truth, documents the canonical local-dev loop in
`CLAUDE.md`, brings up the Phase 0 Docker Postgres database, applies the committed Phase 2 migration
cleanly, and confirms the Phase 4 dev proxy forwards `/api` and `/health` to the API at runtime with
mock weather data. **This phase touches no application code, schema, migrations, or runtime
dependencies.** It is pure ergonomics and verification.

---

## Session-start checklist

- [ ] Working tree is clean: `git status` shows only untracked files (none expected yet).
- [ ] `npm run build` succeeds (all three projects: `api`, `web`, `shared-types`).
- [ ] `npm run lint` succeeds (0 errors; pre-existing warnings in Phase 4 are acceptable).
- [ ] `npm test` succeeds (all suites pass).
- [ ] You have read:
  - [ ] The Phase 5 entry in `docs/RoadMap.md` (lines 861–1011).
  - [ ] `docs/tasks/Tasks-5-1.md` and `docs/tasks/Tasks-5-2.md` (the two task specs).
  - [ ] `CLAUDE.md` (current state and conventions).
  - [ ] `docs/handoffs/Phase-4-Handoff.md` (what Phase 4 shipped).
- [ ] You understand that Phases 0–4 are read-only for this phase; you will not edit
  `docker-compose.yml`, `prisma/schema.prisma`, migrations, or any code under `apps/` or `libs/`.

---

## Important context (from the roadmap)

- **Dev workflow is pure ergonomics — no code/schema changes.** Phase 5 orchestrates existing
  infrastructure: the Phase 0 `docker-compose.yml` Postgres service, the Phase 2 `init` migration,
  the Phase 2 seed stub, the Phase 4 dev proxy, and the Phase 3 API. Running and verifying them is
  in scope; authoring new migrations, seeds, or app code is not.
- **Approval gate for `CLAUDE.md` edits.** Edits to conventions docs require human confirmation
  before applying. Draft the proposed `## Commands` section (Task 5-1) and request approval before
  committing.
- **Approval gate for migration drift.** If `npx prisma migrate dev` reports drift or wants to
  create a new migration (instead of applying the committed `init` cleanly), **stop and request
  approval.** This is out of scope for Phase 5.
- **No new dependencies.** The `dev` script uses `nx run-many -t serve` (Nx is already installed);
  do **not** add `concurrently` or any other package.
- **Mock data is the expected path.** The local-dev loop assumes no `OPENWEATHER_API_KEY` is set,
  so the Phase 3 API falls back to mock weather data. This is intentional — the app must run
  out-of-the-box.

---

## Mission: Deliver Phase 5 — Dev Workflow end to end

### Step 0 — Lock decisions

The roadmap Phase 5 section has already recorded all "Decisions needed" (lines 933–959); they are
pre-locked for this execution:

- **`dev` script:** `"dev": "nx run-many -t serve"` (no `concurrently`, no new dependency).
- **Migrate command:** `npx prisma migrate dev` for local; note `migrate deploy` is Phase 7.
- **Seed:** Run `npx prisma db seed` (the no-op stub) to prove the hook; do not author seed data.
- **Docs home:** `CLAUDE.md` `## Commands` section (single canonical place).

These are locked. If you discover a need to deviate, **stop and request approval before proceeding.**

---

### Step 1 — Task 5-1: `dev` script + `.env.example` reconcile + local-dev docs (one commit)

**Goal:** Add the `dev` npm script, confirm `.env.example` against compose credentials, and document
the local-dev loop in `CLAUDE.md`.

**Source material:** Read `docs/tasks/Tasks-5-1.md` for the full spec and acceptance criteria.

**Tasks:**

1. **Add the `dev` script to `package.json`.** Open `package.json`, find the `scripts` block
   (currently has `build`, `lint`, `test` — each `nx run-many -t <target>`). Add a new entry:
   ```json
   "dev": "nx run-many -t serve"
   ```
   matching the existing `nx run-many` form. Verify `npm run dev` executes without error (it should
   list both the API and web targets preparing to serve).

2. **Reconcile `.env.example` against `docker-compose.yml`.** Open both files:
   - `docker-compose.yml` — line with `db` service shows `POSTGRES_USER=nimbus`, `POSTGRES_PASSWORD=nimbus`,
     `POSTGRES_DB=nimbus`, port `5432:5432`.
   - `.env.example` — should already list all five vars (`DATABASE_URL`, `OPENWEATHER_API_KEY`,
     `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, `PORT`). Confirm the `DATABASE_URL` is
     `postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public` and credentials match compose.
     Confirm the mock-fallback note is present (app runs with mock weather data if `OPENWEATHER_API_KEY`
     is blank). Confirm `CORS_ORIGIN=http://localhost:4200` and `PORT=3000`. If any genuine drift exists
     (e.g. wrong credentials), fix it; otherwise leave the file as-is.

3. **Document the local-dev loop in `CLAUDE.md`.** Open `CLAUDE.md` and find the `## Commands`
   section. Add or update it to document the three-step boot:
   ```
   docker compose up -d    # Bring up the db service (postgres:16, healthy check)
   npx prisma migrate dev  # Apply the committed init migration (local dev path)
   npm run dev             # Start both servers (api:3000, web:4200)
   ```
   Note that `migrate deploy` (with no client regen / no dev prompts) is the Phase 7 production path.
   Document that `npm run dev` runs the API on `http://localhost:3000` and the Angular dev server on
   `http://localhost:4200`.

   **Approval gate:** Draft the proposed `## Commands` edit and show it to the human before committing.

4. **Verify no regressions.** Run `npm run build`, `npm run lint`, `npm test` — all should stay green.

**Commit:** Follow the conventional style. The suggested message is:
```
chore(dev): add npm dev script and document local-dev loop

Add a `dev` npm script (`nx run-many -t serve`) that boots the NestJS API
and Angular app together, reconcile `.env.example` against the compose `db`
credentials, and document the `docker compose up -d` -> `prisma migrate dev`
-> `npm run dev` loop in CLAUDE.md. No app, schema, or dependency changes.
```

No `Co-Authored-By` trailer (the config disables it).

---

### Step 2 — Task 5-2: Local DB bring-up, migration apply, seed decision, and end-to-end proxy check (one commit)

**Goal:** Verify the local-dev loop works end-to-end for the first time.

**Source material:** Read `docs/tasks/Tasks-5-2.md` for the full spec and acceptance criteria.

**Tasks:**

1. **Bring up the Phase 0 Postgres database.**
   ```bash
   docker compose up -d
   ```
   Verify the `db` service is healthy:
   ```bash
   docker compose ps
   ```
   The `db` container should show `healthy` status (the `pg_isready` healthcheck passes).

2. **Prepare the `.env` file.** Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Verify `.env` contains `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`
   and other five vars match `.env.example`. This is what `prisma migrate dev` will read.

3. **Apply the Phase 2 migration against the live database.**
   ```bash
   npx prisma migrate dev
   ```
   This runs against the `DATABASE_URL` in `.env` and applies the committed
   `prisma/migrations/20260620144720_init/` migration. Watch for any errors; the command should
   complete cleanly without asking to create a new migration.

   **Approval gate:** If `migrate dev` reports drift or wants to create a *new* migration, **stop
   immediately and request approval.** This is out of scope for Phase 5.

4. **Verify the migration applied cleanly.**
   ```bash
   npx prisma migrate status
   ```
   Expected output: `1 migration applied` and no pending / drift / schema-vs-database differences.
   Confirm the `init` migration appears in the history with no error flags.

5. **Execute the seed decision.** The Phase 2 `prisma/seed.ts` is a no-op stub and `package.json`
   carries the `prisma.seed` hook (`ts-node prisma/seed.ts`). Run:
   ```bash
   npx prisma db seed
   ```
   The command should complete successfully (it is a no-op, so it returns immediately). This proves
   the `prisma.seed` hook is wired correctly and the seed script is runnable.

6. **Start the full local stack and verify the proxy end-to-end.** In one terminal, run:
   ```bash
   npm run dev
   ```
   Both servers should start: the NestJS API logs initializing on port 3000, and the Angular dev
   server logs initializing on port 4200. Wait for both to be ready.

7. **Test the `/api/weather/dashboard` proxy.** In another terminal (or a browser), make a request:
   ```bash
   curl "http://localhost:4200/api/weather/dashboard?location=San%20Francisco,%20CA&unitSystem=imperial&userId=anonymous"
   ```
   Expected: HTTP 200, JSON body with a `WeatherDashboard` shape (mock data, because no
   `OPENWEATHER_API_KEY` is set). The response should include:
   - `current` (temperature, condition, icon, etc.)
   - `hourly` (7 hourly forecasts, first labeled "Now")
   - `daily` (5 daily forecasts)
   - `previews` (3 condition previews)
   - `metrics` (4 metrics: humidity, wind, precipitation, visibility)
   - `locations` (saved locations, initially empty)
   - `unitSystem`, `temperatureUnit`, `windUnit`

   This confirms the proxy forwards `/api/*` from 4200 to the API on 3000.

8. **Test the `/health` proxy.** Make a request:
   ```bash
   curl "http://localhost:4200/health"
   ```
   Expected: HTTP 200, JSON body `{ status: "ok", service: "nimbus-api", time: "<ISO 8601>" }`.

   This confirms the proxy also forwards `/health` (outside the `/api` prefix) to the API on 3000.

9. **Verify no regressions.** Stop the `npm run dev` process (Ctrl+C). Run:
   ```bash
   npm run build
   npm run lint
   npm test
   ```
   All should stay green.

**Commit:** Follow the conventional style. The suggested message is:
```
docs(dev): verify local boot loop and record seed decision

Bring up the compose db, apply the committed init migration (status: 1
applied, no drift), run the no-op seed via the prisma.seed hook, and confirm
the Phase 4 proxy forwards /api/weather/dashboard and /health from 4200 to
the API on 3000. Documentation only; no app, schema, or migration changes.
```

No `Co-Authored-By` trailer (the config disables it).

---

### Step 3 — Phase exit

**Verify all success criteria are met:**

- [ ] `package.json` `dev` script is `nx run-many -t serve` (no new dependency).
- [ ] `npm run dev` starts both servers (API on 3000, web on 4200) in one invocation.
- [ ] `.env.example` documents all five vars with correct compose credentials and mock-fallback note.
- [ ] `CLAUDE.md` `## Commands` documents the `docker compose up -d` → `migrate dev` → `npm run dev`
      local-dev loop.
- [ ] `docker compose up -d` brings the `db` service to healthy state.
- [ ] `npx prisma migrate dev` applies the committed `init` migration cleanly (no new migration
      created).
- [ ] `npx prisma migrate status` reports 1 migration applied, no drift.
- [ ] `npx prisma db seed` runs the no-op stub successfully.
- [ ] With `npm run dev` running:
  - `/api/weather/dashboard` (from localhost:4200) returns a full `WeatherDashboard` with mock data.
  - `/health` (from localhost:4200) returns the correct health shape.
- [ ] `npm run build`, `npm run lint`, `npm test` stay green.

**Close out the phase:**

1. Flip the Phase 5 row in `docs/RoadMap.md` to complete (update the phase header comment if it has
   a "Shipped" section; the pattern is in earlier phases).

2. Write a handoff document at `docs/handoffs/Phase-5-Handoff.md` (follow the Phase 4 handoff as a
   template). Record:
   - What tasks were completed and which commits landed.
   - The dev-workflow setup: `npm run dev` script, `.env.example` reconciliation, local-dev loop
     documentation.
   - Verification: `docker compose up -d`, `migrate dev` (1 applied, no drift), seed hook wired,
     proxy forwarding `/api` + `/health` confirmed end-to-end.
   - Notes for Phase 6 (testing): mention that automated test infrastructure is next.

3. Final verification: `npm run build`, `npm run lint`, `npm test` all green. `git log --oneline`
   shows the two Phase 5 commits on top of Phase 4.

**All done.** Phase 5 is complete; the local-dev loop is documented and verified. The next phase
(Phase 6) is Testing.

---

## Scope guardrails (do NOT)

- **Do not modify `docker-compose.yml`.** The Phase 0 `db` service is the source of truth; this
  phase verifies it, not rewrites it.
- **Do not modify `prisma/schema.prisma`, `prisma/seed.ts`, or any migration files.** These are
  Phase 0–2 artifacts; Phase 5 applies them, not edits them.
- **Do not modify `apps/api/`, `apps/web/`, or `libs/shared-types/`.** These are Phases 1–4
  artifacts; Phase 5 verifies them, not edits them.
- **Do not add a new dependency.** The `dev` script uses Nx, which is already installed. Do not add
  `concurrently`, `dotenv`, or any other package.
- **Do not create a new migration.** If `npx prisma migrate dev` reports drift or wants to create
  a new migration, **stop and request approval.** Phase 5 applies the committed migration only.
- **Do not author seed data.** The `prisma/seed.ts` stub is intentionally empty/no-op. Running it
  proves the hook; adding rows is not in scope.
- **Do not edit the `build`, `lint`, `test`, or `prisma.seed` scripts in `package.json`.** Only
  add the `dev` script.

---

## Commit-trailer rule

Conventional commit style. No `Co-Authored-By` trailer — the config sets `ai_coauthor_trailer: false`.
Plain messages only (e.g., `chore(dev): ...` and `docs(dev): ...` per the roadmap suggestion).

