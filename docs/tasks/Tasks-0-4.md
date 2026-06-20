# Task 0-4 — Add local Postgres (docker-compose) and environment config

## Surface
Local infra + environment configuration. Adds `docker-compose.yml` with a `postgres:16` service and
creates `.env` + `.env.example` carrying `DATABASE_URL`, `OPENWEATHER_API_KEY`, and `PORT=3000`, with
`.env` gitignored and `.env.example` committed. No app code, no contract types, no schema, no UI.

## Why
Every later phase that touches the database needs a local Postgres to point `DATABASE_URL` at (Phase 2
migrations, Phase 3 `PrismaService`, Phase 6 integration tests), and the app must run **out of the box
with no OpenWeather key** by falling back to mock weather data (RoadMap §4). This task provides the
one-command local DB (`docker compose up -d`) and the documented env surface so contributors and later
phases have a consistent, committed reference (`.env.example`) without ever committing real secrets.

## Depends on
- **Task 0-1** (`docs/tasks/Tasks-0-1.md`) — the workspace must exist; `PORT=3000` matches the Nest
  serve port Task 0-1 establishes. **Hard precondition.**
- **Task 0-3** (`docs/tasks/Tasks-0-3.md`) — `prisma init` writes an initial `DATABASE_URL` into `.env`.
  This task owns the **authoritative** `.env` / `.env.example` content; reconcile the `DATABASE_URL`
  value with the `postgres:16` service defined here. Order 0-3 before 0-4, or reconcile if 0-4 runs first.
- **Roadmap Phase 0 — Bootstrap** (`docs/RoadMap.md`, "### Phase 0 — Bootstrap"): the "Local Postgres +
  environment config" scope bullet, the `docker compose up -d` and `.env.example` success criteria, and
  the "Commit `.env.example` only; gitignore `.env`" decision — flagged **Approval required before apply**.
- **Roadmap §4 — Risks / gotchas** (`docs/RoadMap.md` lines ~495–501): "The mock fallback must work
  key-less so the app runs out of the box" — the `OPENWEATHER_API_KEY`-may-be-blank behavior `.env.example`
  must document.
- **Roadmap §6 — New repository creation** (`docs/RoadMap.md` lines ~514–518): "Add `.env` to
  `.gitignore`; commit `.env.example`".
- **Enumerated task split** (`docs/RoadMap.md`, Phase 0 "Enumerated task split" item 4).
- No ADRs in `docs/decisions/` and no handoff in `docs/handoffs/` (both absent) — the roadmap is the
  only locked source.

## Locked decisions (from the roadmap's "Decisions needed" — recorded so the implementer does not re-litigate)
- **`.env` policy → commit `.env.example` only, gitignore `.env` (LOCKED). APPROVAL REQUIRED BEFORE APPLY.**
  The roadmap tags this a **repo-policy edit requiring approval before apply**. Carry that flag: the
  implementer must **surface this for human sign-off and must NOT commit a real, secret-bearing `.env`**.
  Concretely — `.env.example` is committed (placeholder values only); `.env` (if created for local use)
  stays gitignored and is never committed. The existing `.gitignore` already covers the `.env*` family;
  confirm it still does.

## Precondition / blocker — VERIFY BEFORE STARTING
> **STOP and flag if Task 0-1 has not landed** (no workspace yet) — do not hand-scaffold it here.
>
> **APPROVAL GATE:** committing `.env.example` and the `.gitignore` `.env` policy is a repo-policy edit
> the roadmap marks **"approval required before apply."** Surface it for sign-off before committing;
> never commit a real `.env` with a real `OPENWEATHER_API_KEY` or DB password.

## Required reading
- `docs/RoadMap.md` — Phase 0 "Local Postgres + environment config" bullet, the `docker compose up -d`
  + `.env.example` success criteria, and the "Commit `.env.example` only; gitignore `.env`" decision.
  **Mirror:** a `postgres:16` service; the three documented vars; the no-key mock-fallback note.
- `docs/RoadMap.md` — §1 tree (`docker-compose.yml`, `.env` / `.env.example` at the repo root). **Mirror:**
  file locations.
- `docs/RoadMap.md` — §4 (mock fallback when `OPENWEATHER_API_KEY` is missing) and §6 (gitignore `.env`,
  commit `.env.example`). **Mirror:** the documented behavior and the commit policy.
- `.gitignore` (existing, repo root) — already ignores `.env`, `.env.development`, `.env.test`,
  `.env.production`. **Mirror:** confirm `.env` is covered; do not weaken it.
- `.env` (if Task 0-3's `prisma init` created it) — reconcile its `DATABASE_URL` with the compose
  service. **Mirror:** keep the same DB name/credentials/port across compose, `.env`, and `.env.example`.
- `CLAUDE.md` — the "Configuration" section (dotenv files; secrets never committed) and the verify
  commands. **Mirror:** secrets stay out of committed files.

## Acceptance criteria
1. **`docker-compose.yml` exists with a `postgres:16` service.** At the repo root, a compose file
   defines a Postgres service on image **`postgres:16`** with:
   - `environment` setting `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` to values that match
     the `DATABASE_URL` in `.env` / `.env.example`;
   - a host port mapping exposing Postgres (default `5432:5432`, matching the `DATABASE_URL`);
   - a named volume for data persistence (so the DB survives `docker compose down`).
2. **`docker compose up -d` brings up Postgres.** Running `docker compose up -d` (from the repo root)
   starts the `postgres:16` container and it reaches a healthy/accepting-connections state. (A
   `healthcheck` using `pg_isready` is recommended but not required.)
3. **`.env.example` is committed and documents exactly the three vars.** `.env.example` exists at the
   repo root, is tracked by git, and documents:
   - `DATABASE_URL` — a PostgreSQL connection string whose user/password/host/port/db match the compose
     service (e.g. `postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public` — placeholder creds).
   - `OPENWEATHER_API_KEY` — shown **blank** (e.g. `OPENWEATHER_API_KEY=`) with a comment stating that
     **a missing/blank key makes the app serve mock weather data** (per §4), so the app runs with no key.
   - `PORT` — set to **`3000`** (the Nest API port; a comment may note the Angular dev server is 4200).
   `.env.example` contains **placeholder values only — no real secrets.**
4. **`.env` is gitignored, never committed (APPROVAL GATE).** `.gitignore` ignores `.env` (already does
   — confirm). If a local `.env` is created for development, it is **not** added to git. `git status`
   must not show `.env` as a tracked/staged file. Do not commit any real `OPENWEATHER_API_KEY` or DB
   password. Surface the repo-policy edit for approval before committing `.env.example` + the gitignore
   policy.
5. **`DATABASE_URL` is consistent everywhere.** The connection string in `.env.example` (and any local
   `.env`) matches the compose service's user/password/db/port, and matches whatever Task 0-3's
   `prisma init` left in `.env` (reconcile to one consistent value). `npx prisma validate` (from Task
   0-3) still passes with the reconciled `DATABASE_URL`.
6. **Build/lint/test stay green.** `npm run build`, `npm run lint`, and `npm test` still pass — adding
   infra/env files must not break the Task 0-1 baseline. Do not add new specs (testing is Phase 6).

## What NOT to modify
- Do **not** add `api`/`web` services to `docker-compose.yml` — Phase 0 only needs the local `postgres:16`
  service. The full `db` + `api` + `web` compose and the Dockerfiles are **Phase 7**. If a step seems to
  need app containers, STOP and ask.
- Do **not** author Prisma models or run `prisma migrate` — Phase 2 (Task 0-3 did `prisma init` only).
- Do **not** add `@nestjs/config`, CORS, the `api` prefix, or any env-reading code in the app — that is
  Phase 3. This task only provides the files; wiring is later.
- Do **not** commit a real `.env` or any real secret (`OPENWEATHER_API_KEY`, DB password). `.env.example`
  carries placeholders only.
- Do **not** weaken or remove the `.env*` entries in `.gitignore`.
- **No schema migration / no new dependency** unless the roadmap says so. If a task seems to need one,
  STOP and ask.

## Suggested commit
```
chore(infra): add local Postgres compose and env config

Add docker-compose.yml with a postgres:16 service (volume + matching
credentials) so docker compose up -d brings up local Postgres, and commit
.env.example documenting DATABASE_URL, OPENWEATHER_API_KEY (blank -> mock
weather fallback per RoadMap §4), and PORT=3000. Keep .env gitignored.

Approval-gated repo-policy edit (commit .env.example, gitignore .env);
no real secrets committed. App/web compose services and Dockerfiles are
Phase 7.
```
