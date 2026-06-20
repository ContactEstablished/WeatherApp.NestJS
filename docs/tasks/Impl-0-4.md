# Impl 0-4 — Add local Postgres (docker-compose) and environment config

**Acceptance contract:** `docs/tasks/Tasks-0-4.md`
**Decision lock:** RoadMap.md § "Commit `.env.example` only; gitignore `.env`" — APPROVAL REQUIRED BEFORE APPLY.
**Scope:** Repo-root `docker-compose.yml` + `.env.example` only. No app code, no Prisma models, no schema migration, no new npm dependency.

---

## Step 0 — Pre-flight

**STOP conditions — verify before proceeding:**

1. **Task 0-1 must have landed.** Confirm the Nx workspace exists: `package.json`, `nx.json`, `apps/api/`, and `apps/web/` must all be present. If the workspace has not been scaffolded, do not proceed — this task has a hard dependency on the workspace that `npx create-nx-workspace` creates.

2. **Task 0-3 should have landed before this step.** Confirm `prisma/schema.prisma` exists and that `npx prisma validate` passes. If Task 0-3 has not landed yet, note that any `.env` file authored here will need to carry a `DATABASE_URL` that Task 0-3's `prisma init` would ordinarily write, and reconciliation (Step 4) must still happen before finalising.

3. **Clean working tree.** Run `git status` — it must show a clean tree (no uncommitted changes or staged files) before you begin.

4. **Baseline green.** Run `npm run build`, `npm run lint`, and `npm test` — all three must pass before any file is touched. If any gate is red, stop and resolve it before proceeding.

**Files to open before starting:**
- `.gitignore` (repo root) — confirm the `.env*` family is covered (lines 17–20: `.env`, `.env.development`, `.env.test`, `.env.production`). Do not modify this file.
- `prisma/schema.prisma` (if present) — note the `DATABASE_URL` placeholder `prisma init` wrote; you will reconcile it in Step 4.
- Any existing `.env` (if present; it will be gitignored and untracked) — note the `DATABASE_URL` value to carry forward.

---

## Step 1 — Author `docker-compose.yml` at the repo root

**File:** `docker-compose.yml` (repo root — this file does not exist yet; create it).

Create the file with exactly one service (`db`, using `postgres:16`). The credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) must match the `DATABASE_URL` placeholder that will be documented in `.env.example` and set in any local `.env`. Use `nimbus`/`nimbus`/`nimbus` as the placeholder user/password/db — these are development-only values that appear in `.env.example` and must never be real production secrets.

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: nimbus
      POSTGRES_PASSWORD: nimbus
      POSTGRES_DB: nimbus
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nimbus -d nimbus"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Key points to verify in the file:
- The service name is `db` (not `postgres` or `api` — keep it simple and consistent with Phase 5/7 conventions that will add `api`/`web` later).
- Only `postgres:16` is present — do **not** add `api` or `web` services (Phase 7).
- The named volume `postgres_data` is declared at the top-level `volumes:` key so Docker manages its lifecycle independently of `docker compose down`.
- The `pg_isready` healthcheck is recommended; the `-U nimbus -d nimbus` flags match the environment vars.
- Host port `5432:5432` matches the port in the `DATABASE_URL` connection string.

**Verify:** `docker compose config` (from repo root) exits 0 and echoes back the resolved service config with no errors. No container is started yet.

---

## Step 2 — APPROVAL GATE (STOP — do not proceed until sign-off)

**This step is a required human sign-off point. Do not commit `.env.example` or finalize `.gitignore` policy until approval is obtained.**

Surface the following for review:

> **Repo-policy edit — approval required before apply (RoadMap.md, Phase 0 "Decisions needed").**
>
> The next step commits `.env.example` (a new tracked file) and relies on `.gitignore` to permanently
> exclude `.env` from the repository. This is a repo-policy decision the roadmap flags as requiring
> explicit approval:
>
> - `.env.example` will be committed to git containing **placeholder credentials only**
>   (`nimbus`/`nimbus`/`nimbus`; blank `OPENWEATHER_API_KEY`). No real secrets.
> - Any local `.env` a developer creates is and remains gitignored. The existing `.gitignore`
>   already covers `.env`, `.env.development`, `.env.test`, and `.env.production` — this task does
>   not weaken or remove those entries.
> - Real `OPENWEATHER_API_KEY` values and real DB passwords must **never** appear in any committed
>   file, including `.env.example`.
>
> **Sign-off required:** confirm the `.env.example` content (three vars, placeholder values only)
> is acceptable to commit, and that the `.gitignore` `.env*` policy is understood and approved.

**STOP here. Resume at Step 3 only after receiving explicit approval.**

---

## Step 3 — Author `.env.example` at the repo root

**File:** `.env.example` (repo root — this file does not exist yet; create it only after Step 2 approval).

The file documents exactly three environment variables. Placeholder values only — no real secrets.

```dotenv
# ---------------------------------------------------------------------------
# Environment variable reference — copy this file to .env and fill in values.
# .env is gitignored and must never be committed.
# ---------------------------------------------------------------------------

# PostgreSQL connection string.
# Credentials must match the docker-compose.yml 'db' service environment block.
# Run: docker compose up -d  to start the local database.
DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public

# OpenWeather One Call 3.0 API key.
# Leave blank (or omit) to run the app with mock weather data instead —
# the app works out of the box with no key (see RoadMap §4).
OPENWEATHER_API_KEY=

# NestJS API server port.
# Note: the Angular dev server runs on port 4200.
PORT=3000
```

Confirm before saving:
- Exactly three variable names: `DATABASE_URL`, `OPENWEATHER_API_KEY`, `PORT`.
- `DATABASE_URL` user/password/db/port (`nimbus:nimbus@localhost:5432/nimbus`) match the `docker-compose.yml` `db` service environment exactly.
- `OPENWEATHER_API_KEY` is blank (nothing after `=`).
- `PORT` is `3000`.
- The comment on `OPENWEATHER_API_KEY` states that a missing/blank key makes the app serve mock weather data (AC 3, per RoadMap §4).
- No real secrets anywhere in the file.

**Verify:** `git status` shows `.env.example` as an untracked (new) file. Run `git check-ignore -v .env.example` — it must **not** be ignored (it is intended to be committed). Run `git check-ignore -v .env` — it **must** be ignored (covered by the existing `.gitignore`).

---

## Step 4 — Reconcile `DATABASE_URL` across all three locations

Ensure the `DATABASE_URL` value is identical in every location it appears. The authoritative value is the one documented in `.env.example` from Step 3:

```
postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public
```

**Check each location in order:**

1. **`docker-compose.yml`** — the `db` service's `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and exposed port (`5432`) must match the connection string components. Verify:
   - `POSTGRES_USER=nimbus` → matches `nimbus:` (user) in the URL.
   - `POSTGRES_PASSWORD=nimbus` → matches `:nimbus@` (password) in the URL.
   - `POSTGRES_DB=nimbus` → matches `/nimbus?` (database name) in the URL.
   - Port `5432:5432` → matches `:5432/` in the URL.

2. **Local `.env`** (if it exists from Task 0-3's `prisma init`) — open the file and check its `DATABASE_URL`. If `prisma init` wrote a different value (e.g. `postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public`), update it to match the authoritative value:
   ```
   DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public
   ```
   Save the file. It remains gitignored and untracked — do **not** stage or commit it.

3. **`prisma/schema.prisma`** — confirm `url = env("DATABASE_URL")` is present (Task 0-3 wrote this). No changes needed here; the file reads the env var at runtime.

**Verify:** With the local `.env` in place (containing the reconciled `DATABASE_URL`), run:
```
npx prisma validate
```
This must exit 0 with no errors. If it fails because a local `.env` does not exist yet (Task 0-3 hasn't created one), create the `.env` file locally now with only the `DATABASE_URL` line, verify `npx prisma validate` passes, and confirm `git status` still shows `.env` as untracked (not staged).

---

## Step 5 — Smoke-test the compose service

Start the local Postgres container and confirm it accepts connections:

```powershell
docker compose up -d
```

Wait for the `db` container to reach healthy status (the `pg_isready` healthcheck runs every 10 s with up to 5 retries — allow up to ~60 s). Then verify:

```powershell
docker compose ps
```

The `db` service must show status `running` (and, if healthcheck is configured, `healthy`). Confirm Postgres is accepting connections on the host:

```powershell
docker compose exec db pg_isready -U nimbus -d nimbus
```

Expected output: `/var/run/postgresql:5432 - accepting connections`

After confirming, stop the container to keep the local environment clean (the volume persists data):

```powershell
docker compose down
```

**Verify:** `docker compose up -d` brings up Postgres without errors; `pg_isready` inside the container confirms it is accepting connections; `docker compose down` stops it cleanly. The named volume `postgres_data` survives `docker compose down` (it is not removed unless `docker compose down -v` is explicitly used).

---

## Step 6 — Confirm `.gitignore` is not weakened

Open `.gitignore` at the repo root (read-only — do not modify it in this task).

Confirm the following lines are present and unmodified:
```
.env
.env.development
.env.test
.env.production
```

Then run:
```powershell
git check-ignore -v .env
git check-ignore -v .env.development
git check-ignore -v .env.test
git check-ignore -v .env.production
```

Each command must return the `.gitignore` rule that covers it. None of these files must appear as tracked or stageable.

Also confirm `.env.example` is **not** ignored:
```powershell
git check-ignore -v .env.example
```
This must produce no output (meaning git will track it).

**Verify:** All four `.env*` variants are confirmed gitignored; `.env.example` is not gitignored; `git status` shows `.env` (if it exists locally) as untracked and `.env.example` as a new untracked file ready to be staged.

---

## Step 7 — Build/lint/test baseline still green

Run the full verify suite to confirm adding infra and env files has not broken the Task 0-1 baseline:

```powershell
npm run build
npm run lint
npm test
```

All three must pass with no errors or new failures. This task adds only `docker-compose.yml` and `.env.example` — neither file is imported by any TypeScript source, so the build should be unaffected. If any command fails, resolve the failure before proceeding.

**Verify:** All three commands exit 0. The test suite produces the same result as the Step 0 baseline (no new failures introduced by this task).

---

## Step 8 — Stage, review diff, and commit

Stage only the two new files:

```powershell
git add docker-compose.yml .env.example
```

Confirm the diff is exactly what is expected:

```powershell
git diff --staged --stat
```

Expected output (two files only):
```
 .env.example      |  12 ++++++++++++
 docker-compose.yml|  18 ++++++++++++++++++
 2 files changed, 30 insertions(+)
```

Confirm `.env` is **not** staged:

```powershell
git status
```

`.env` must appear as `Untracked files` (if it exists locally) — never as `Changes to be committed`.

Commit with the exact message from the Tasks doc (conventional commit, no Co-Authored-By trailer):

```powershell
git commit -m "chore(infra): add local Postgres compose and env config

Add docker-compose.yml with a postgres:16 service (volume + matching
credentials) so docker compose up -d brings up local Postgres, and commit
.env.example documenting DATABASE_URL, OPENWEATHER_API_KEY (blank -> mock
weather fallback per RoadMap §4), and PORT=3000. Keep .env gitignored.

Approval-gated repo-policy edit (commit .env.example, gitignore .env);
no real secrets committed. App/web compose services and Dockerfiles are
Phase 7."
```

**Verify:** `git show --stat HEAD` shows exactly two files (`docker-compose.yml`, `.env.example`). `git log --oneline -1` shows the `chore(infra):` commit. `git status` is clean. `npm run build`, `npm run lint`, and `npm test` are all still green.

---

## Acceptance criteria cross-check

| AC | Step(s) | Gate |
|----|---------|------|
| 1. `docker-compose.yml` with `postgres:16`, env vars, port mapping, named volume | Step 1 | `docker compose config` exits 0 |
| 2. `docker compose up -d` brings up Postgres healthy | Step 5 | `pg_isready` inside container returns accepting |
| 3. `.env.example` committed with exactly three vars + mock-fallback comment | Steps 3, 8 | `git show HEAD:.env.example` shows all three vars |
| 4. `.env` gitignored, never committed (APPROVAL GATE satisfied in Step 2) | Steps 2, 6 | `git check-ignore -v .env` hits `.gitignore` rule |
| 5. `DATABASE_URL` consistent across compose, `.env`, `.env.example`; `npx prisma validate` passes | Step 4 | `npx prisma validate` exits 0 |
| 6. Build/lint/test green | Steps 0, 7 | All three commands exit 0 |
