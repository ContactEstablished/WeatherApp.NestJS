# Impl 5-1 — `dev` script + `.env.example` reconcile + local-dev docs

**Acceptance contract:** `docs/tasks/Tasks-5-1.md`
**Decision lock:** dev script value is `nx run-many -t serve`; docs home is `CLAUDE.md ## Commands`; `.env.example` work is confirm-and-reconcile only (no new dependency).
**Scope:** ergonomics and documentation only — no application code, schema, or migration changes, no new dependency.

---

## Step 0 — Pre-flight

Open these four files and confirm the current state matches what is described below before touching anything:

| File | What to confirm |
|------|----------------|
| `package.json` | `scripts` block contains `build`, `lint`, `test` — **no `dev` entry yet**. `prisma.seed` is `ts-node prisma/seed.ts`. No `concurrently` or similar in `dependencies`/`devDependencies`. |
| `.env.example` | Contains exactly five variables: `DATABASE_URL`, `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, `PORT`. `DATABASE_URL` is `postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`. Mock-fallback note is present on the `OPENWEATHER_API_KEY` block. `CORS_ORIGIN=http://localhost:4200`. `PORT=3000`. |
| `docker-compose.yml` | `db` service sets `POSTGRES_USER: nimbus`, `POSTGRES_PASSWORD: nimbus`, `POSTGRES_DB: nimbus`. These match the `.env.example` `DATABASE_URL` exactly. |
| `CLAUDE.md` | `## Commands` section exists and currently documents `npm run build`, `npm test`, `npm run lint`, and two separate `npx nx serve <target>` commands under "Dev servers (run in separate terminals)". The `## Configuration` table lists four variables (missing `OPENWEATHER_BASE_URL`). |

**Working branch:** confirm `git status` is clean (only the `docs/RoadMap.md` modification from the prior commit is expected if not yet stashed/committed).

Run baseline checks — both must be green before any edits:

```
npm run build
npm test
```

**Verify:** build output reports success for all projects; test runner reports all suites passing; no pre-existing lint errors. (Run `npm run lint` as well to establish a clean baseline.)

---

## Step 1 — Add `dev` script to `package.json`

**File:** `package.json`

In the `"scripts"` object, add a `"dev"` entry immediately after `"test"`. The resulting block must be:

```json
"scripts": {
  "build": "nx run-many -t build",
  "lint": "nx run-many -t lint",
  "test": "nx run-many -t test",
  "dev": "nx run-many -t serve"
},
```

Rules:
- The value must be exactly `nx run-many -t serve` (no flags, no wrapper, no `concurrently`).
- Do not add, remove, or change any other field in `package.json` (`dependencies`, `devDependencies`, `prisma`, `name`, `version`, etc.).

**Verify:** Open `package.json` and confirm:
1. `"dev": "nx run-many -t serve"` is present.
2. `"prisma": { "seed": "ts-node prisma/seed.ts" }` is unchanged.
3. `dependencies` and `devDependencies` counts are identical to pre-edit.
4. `npm run build` still exits 0 (the script block is valid JSON and the build target is unaffected).

---

## Step 2 — Confirm `.env.example` (no-change reconcile)

**File:** `.env.example`

Read the file in full. Verify each acceptance criterion is already satisfied:

| Criterion | Expected value | Confirmed? |
|-----------|---------------|-----------|
| AC 5 — five variables present | `DATABASE_URL`, `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, `PORT` | Yes |
| AC 6 — `DATABASE_URL` value | `postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public` | Yes |
| AC 7 — mock-fallback note intact | Comment on `OPENWEATHER_API_KEY` block saying "Leave blank (or omit) to run the app with mock weather data instead" | Yes |
| AC 8 — origins and port | `CORS_ORIGIN=http://localhost:4200`, `PORT=3000` | Yes |
| Matches compose credentials | `nimbus:nimbus@localhost:5432/nimbus` matches `docker-compose.yml` `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` | Yes |

**No edits are required.** The file is already correct. Do not touch it.

**Verify:** Run `git diff .env.example` — the diff must be empty (no changes).

---

## Step 3 — STOP: human approval of `CLAUDE.md ## Commands` edit

**This step requires human confirmation before the edit is applied.**

The current `## Commands` section in `CLAUDE.md` (lines 31–46 as of pre-flight) documents build, test, lint, and two separate `npx nx serve` commands. The Task requires replacing it with:

1. The canonical local-dev loop (`docker compose up -d` → `npx prisma migrate dev` → `npm run dev`).
2. Port documentation for what `npm run dev` starts.
3. A note that `migrate deploy` is the Phase 7 production path.
4. The `## Configuration` table updated to include `OPENWEATHER_BASE_URL` (currently missing, making the table inconsistent with `.env.example`).

**Proposed replacement for the `## Commands` section** (present this to the human for review before Step 4):

```markdown
## Commands

```bash
# Build all projects
npm run build           # or: npx nx run-many -t build

# Run tests
npm test                # runs all Jest suites
npm test -- <pattern>   # run a single test file

# Lint
npm run lint            # ESLint across all projects

# Local dev stack (canonical loop)
docker compose up -d            # start PostgreSQL on port 5432
npx prisma migrate dev          # apply migrations (dev only; production uses migrate deploy — Phase 7)
npm run dev                     # serves API on http://localhost:3000 and Angular on http://localhost:4200
```
```

**Proposed replacement for the `## Configuration` table** (adds the missing `OPENWEATHER_BASE_URL` row):

```markdown
| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `OPENWEATHER_API_KEY` | OpenWeather API key | (optional — mock data if absent) |
| `OPENWEATHER_BASE_URL` | OpenWeather API base URL | `https://api.openweathermap.org` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:4200` |
| `PORT` | API listen port | `3000` |
```

**Present the above two blocks to the human and wait for explicit approval before proceeding to Step 4.**

**Verify (gate, not a file check):** Human has confirmed the proposed wording. Proceed only after receiving approval.

---

## Step 4 — Apply approved `CLAUDE.md` edits

**File:** `CLAUDE.md`

Apply exactly the two approved replacements from Step 3.

**Edit 1 — Replace the `## Commands` code block.**

Locate the existing `## Commands` section. It currently reads:

```markdown
## Commands

```bash
# Build all projects
npm run build           # or: npx nx run-many -t build

# Run tests
npm test                # runs all Jest suites
npm test -- <pattern>   # run a single test file

# Lint
npm run lint            # ESLint across all projects

# Dev servers (run in separate terminals)
npx nx serve api        # NestJS on http://localhost:3000
npx nx serve web        # Angular on http://localhost:4200 (proxies /api and /health to :3000)
```
```

Replace the entire content of the `## Commands` section's fenced code block so it becomes the approved text from Step 3. The section heading `## Commands` is retained; only the code block body changes.

**Edit 2 — Replace the `## Configuration` table.**

Locate the `## Configuration` table. It currently has four rows. Replace it with the five-row table from the approved text in Step 3, inserting the `OPENWEATHER_BASE_URL` row between `OPENWEATHER_API_KEY` and `CORS_ORIGIN`.

The surrounding prose ("Environment config lives in dotenv files…") is unchanged.

**Verify:** Read `CLAUDE.md` in full after editing and confirm:
1. `## Commands` code block contains `docker compose up -d`, `npx prisma migrate dev`, and `npm run dev`.
2. `npm run dev` line mentions both `http://localhost:3000` and `http://localhost:4200`.
3. `migrate deploy` is mentioned with a Phase 7 note.
4. The old "Dev servers (run in separate terminals)" block is gone.
5. `## Configuration` table has five rows including `OPENWEATHER_BASE_URL`.
6. All other sections of `CLAUDE.md` (`## Current state`, `## Monorepo layout`, `## Key architecture notes`) are unchanged.

---

## Step 5 — Final verification

Run all three quality checks in order:

```
npm run build
npm run lint
npm test
```

Each must exit 0 with no errors or failures.

Then run:

```
git diff --stat
```

Confirm the diff covers **only** these files:
- `package.json` (one line added: the `dev` script)
- `CLAUDE.md` (Commands section and Configuration table updated)

`.env.example` must **not** appear in the diff.

**Verify:** All three commands green; `git diff --stat` shows exactly 2 files changed.

---

## Step 6 — Commit

Stage and commit with the following conventional-commit message (no Co-Authored-By trailer):

```
chore: add dev script, reconcile .env.example, document local-dev loop in CLAUDE.md
```

Command:

```
git add package.json CLAUDE.md
git commit -m "chore: add dev script, reconcile .env.example, document local-dev loop in CLAUDE.md"
```

**Verify:** `git log --oneline -1` shows the commit message above on the current branch (`main`).
