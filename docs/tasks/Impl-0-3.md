# Impl 0-3 — Initialize Prisma (stub schema, no models)

**Acceptance contract:** `docs/tasks/Tasks-0-3.md`
**Decision lock:** No ADRs in `docs/decisions/` (directory absent). No cross-cutting approval gates
beyond the explicit fences noted below.
**Scope:** Install `prisma` + `@prisma/client`, run `npx prisma init --datasource-provider postgresql`
to produce `prisma/schema.prisma` (generator + datasource blocks only). No schema change beyond the
init stub, no new dependency beyond these two packages, no migration, no models, no app code.

---

## Step 0 — Pre-flight

### Hard precondition — STOP if Task 0-1 has not landed

This task installs into the Nx workspace and `package.json` that Task 0-1 creates. Before
proceeding, verify:

```
# Must exist and be non-empty:
<repo-root>/package.json
<repo-root>/nx.json

# Workspace must be on a clean working branch:
git status
# Expected: "nothing to commit, working tree clean"
```

If `package.json` is absent, the Nx workspace has not been scaffolded. **Do not hand-scaffold it
here.** Flag the missing Task 0-1 dependency and stop.

### Baseline build/test/lint must be green

```powershell
npm run build
npm run lint
npm test
```

All three must pass before any change is made. If any fails, the baseline is broken — fix or flag
before proceeding, do not proceed with a red baseline.

### Files to open before starting

- `package.json` — inspect current `dependencies` and `devDependencies` to confirm `prisma` and
  `@prisma/client` are not already listed.
- `.gitignore` — confirm `.env` is already ignored (it is: lines 16–19 cover `.env`,
  `.env.development`, `.env.test`, `.env.production`). No edit needed here.
- `docs/RoadMap.md` §0.4 — read the target `schema.prisma` with `UserPreference` / `SavedLocation`
  models **only to know what NOT to author**. Those models are Phase 2.

---

## Step 1 — Install `prisma` (devDependency) and `@prisma/client` (dependency)

**File affected:** `package.json`, `package-lock.json`

Run from the repo root:

```powershell
npm install --save-dev prisma
npm install @prisma/client
```

After installation, open `package.json` and confirm:

- `prisma` appears under `devDependencies` (any `^5.x` or later version the registry resolved).
- `@prisma/client` appears under `dependencies` (matching version).

Do not add any other package. If npm prompts for or installs any additional dependency beyond these
two (and their transitive deps), that is expected npm behavior — do not add more top-level entries.

**Verify:**
`package.json` contains `"prisma"` in `devDependencies` and `"@prisma/client"` in `dependencies`.
`package-lock.json` reflects both. Running `npx prisma --version` should now resolve (the binary is
available via the locally-installed package):

```powershell
npx prisma --version
# Expected: prints Prisma CLI version line, e.g. "prisma: 5.x.x"
```

---

## Step 2 — Run `prisma init` with the PostgreSQL datasource provider

**Files created:** `prisma/schema.prisma`, `.env` (default `DATABASE_URL` line appended or created)

Run from the repo root:

```powershell
npx prisma init --datasource-provider postgresql
```

The `--datasource-provider postgresql` flag ensures the generated datasource block targets
PostgreSQL from the start, avoiding any need to hand-edit the provider afterward.

This command creates two things:

1. `prisma/schema.prisma` — the stub schema file.
2. `.env` — a file with a placeholder `DATABASE_URL` line (if `.env` does not already exist, Prisma
   creates it; if it does, Prisma appends or notes the variable). Because `.gitignore` already
   covers `.env`, this file will not be staged or committed.

**Do not create `prisma/migrations/` or run any migrate command.** If `prisma init` produces a
`migrations/` directory (it does not by default), delete it immediately and flag the anomaly.

**Coordinate with Task 0-4:** The `DATABASE_URL` that `prisma init` writes is a placeholder
(`postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public` or similar). Task 0-4
owns the authoritative `.env` / `.env.example` and will replace this value with the connection
string matching the `postgres:16` Docker service it defines. Do not override or finalize
`DATABASE_URL` here — leave it as Prisma wrote it, and do not commit `.env`.

**Verify:**
- `prisma/schema.prisma` exists.
- `prisma/migrations/` does **not** exist.
- `.env` is present locally but does **not** appear in `git status` (it is gitignored).

---

## Step 3 — Inspect and confirm the stub schema is correct

**File:** `prisma/schema.prisma` (read-only inspection — edit only if the provider is wrong)

Open `prisma/schema.prisma` and confirm it contains exactly two blocks and nothing else:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Acceptance check per criterion 2:

- `generator client` block present with `provider = "prisma-client-js"`.
- `datasource db` block present with `provider = "postgresql"` (not `sqlite`, not `mysql`).
- `url = env("DATABASE_URL")` present.
- **Zero `model` blocks.** Specifically: no `model UserPreference`, no `model SavedLocation`, no
  other model. Run a quick grep to be certain:

```powershell
Select-String -Path prisma\schema.prisma -Pattern "^model "
# Expected: no output (zero matches)
```

If the provider is not `postgresql` (e.g. `prisma init` defaulted to `sqlite`), edit
`prisma/schema.prisma` to set `provider = "postgresql"`. That is the only permitted edit to this
file in this task.

**Verify:**
Grep/inspection confirms two blocks (`generator client`, `datasource db`), `provider = "postgresql"`,
and zero `model` lines.

---

## Step 4 — Validate the stub schema with `npx prisma validate`

**No file changes — CLI validation only.**

```powershell
npx prisma validate
```

Expected output: Prisma CLI reports the schema is valid (something like
`The schema at prisma/schema.prisma is valid`). A stub schema with no models is valid Prisma SDL —
this command confirms the CLI can parse and accept the file as-is.

If `npx prisma validate` fails, inspect the error. The only permitted fix at this step is a
correction to the `generator` or `datasource` block syntax that `prisma init` produced. Do not add
models to make validation pass.

**Verify:**
`npx prisma validate` exits with code 0 and reports a valid schema. `npx prisma --version` also
runs cleanly (already confirmed in Step 1, but re-confirm if in doubt).

---

## Step 5 — Confirm no `prisma/migrations/` directory exists

**No file changes — filesystem inspection only.**

```powershell
Test-Path prisma\migrations
# Expected: False
```

If `prisma/migrations/` exists (it should not after a plain `prisma init`), delete it entirely and
do not run any migrate command. No migration is in scope for this task.

**APPROVAL GATE — schema migrations require approval before apply.** If any step seems to require
running `prisma migrate dev` or `prisma migrate deploy`, or writing `UserPreference` / `SavedLocation`
model blocks, **STOP and raise the question before proceeding.** These are Phase 2 changes that
require explicit approval.

**Verify:**
`prisma/migrations/` is absent. `git status` shows no `prisma/migrations/` path.

---

## Step 6 — Confirm `.env` is not staged and no secret is committed

**No file changes — git inspection only.**

```powershell
git status
```

Expected: `.env` does **not** appear in staged or unstaged changes (it is covered by `.gitignore`).
`prisma/schema.prisma` appears as a new untracked or modified file. `package.json` and
`package-lock.json` appear as modified files. No other files should be affected.

If `.env` appears in `git status` (staged or untracked), do **not** commit it. Verify that
`.gitignore` has `.env` on a line by itself (it does — line 17 of the existing `.gitignore`). If
somehow `.env` is not gitignored, add it before proceeding.

The `DATABASE_URL` placeholder written by `prisma init` is a non-secret example value, but `.env`
must never be committed regardless — Task 0-4 owns the authoritative content.

**Verify:**
`git status` shows `.env` absent. Only `package.json`, `package-lock.json`, and `prisma/schema.prisma`
(plus any Prisma-generated `.gitignore` additions if Prisma appended to `.gitignore`) are changed.

---

## Step 7 — Build/lint/test baseline still green

Run the full verify suite to confirm adding Prisma has not broken the Task 0-1 baseline:

```powershell
npm run build
npm run lint
npm test
```

All three must pass. Adding `prisma` and `@prisma/client` as packages only — with no source code
changes — should not break any existing targets. If a failure occurs:

- Check whether any Nx target now tries to type-check `prisma/schema.prisma` (it should not by
  default; `tsconfig` excludes non-TS files).
- Do not add new test specs to make this step pass — testing is Phase 6.
- Do not wire `PrismaService` or `PrismaModule` into Nest — that is Phase 3.

**Verify:**
`npm run build` exits 0. `npm run lint` exits 0. `npm test` exits 0. No new failures versus the
Step 0 baseline.

---

## Step 8 — Final commit

Confirm `git diff --stat` shows exactly the expected files and nothing else:

```powershell
git diff --stat HEAD
```

Expected changed files (only these):
- `package.json` — `prisma` added to `devDependencies`, `@prisma/client` added to `dependencies`.
- `package-lock.json` — lock file updated for both packages.
- `prisma/schema.prisma` — new file: stub generator + datasource blocks, zero models.

Files that must **not** appear:
- `.env` (gitignored — must not be staged)
- `prisma/migrations/` (must not exist)
- Any source file under `apps/`, `libs/`, or `src/`
- Any new test file

Stage and commit:

```powershell
git add package.json package-lock.json prisma/schema.prisma
git commit -m "chore(prisma): initialize Prisma with a stub PostgreSQL schema

Install prisma (dev) + @prisma/client and run prisma init to create the
prisma/schema.prisma stub with the postgresql datasource and
prisma-client-js generator. npx prisma is runnable; the schema validates.

No models authored and no migration run -- schema authoring per RoadMap
SS0.4 and prisma migrate are Phase 2."
```

Note: use `git add` with explicit paths rather than `git add .` to guarantee `.env` is never
accidentally staged.

**Verify:**
`git log --oneline -1` shows the commit with message starting
`chore(prisma): initialize Prisma with a stub PostgreSQL schema`.
`git show --stat HEAD` lists only `package.json`, `package-lock.json`, and `prisma/schema.prisma`.
No Co-Authored-By trailer (config sets `ai_coauthor_trailer: false`).

---

## Acceptance criteria cross-check

| Criterion | Verified in step |
|-----------|-----------------|
| 1. `prisma` in `devDependencies`, `@prisma/client` in `dependencies` | Step 1 |
| 2. `prisma/schema.prisma` exists with `postgresql` datasource + `prisma-client-js` generator | Steps 2, 3 |
| 3. Zero `model` blocks in `prisma/schema.prisma` | Step 3 (grep) |
| 4. No `prisma/migrations/` directory; no migration run; `.env` not committed | Steps 5, 6 |
| 5. `npx prisma --version` and `npx prisma validate` run successfully | Steps 1, 4 |
| 6. `npm run build`, `npm run lint`, `npm test` still pass | Steps 0, 7 |

## What NOT to do (fences carried from Tasks-0-3)

- Do **not** author any Prisma model (`UserPreference`, `SavedLocation`, or any other) — Phase 2,
  requires approval before schema migration is applied.
- Do **not** run `prisma migrate dev` / `prisma migrate deploy` or create `prisma/migrations/`.
- Do **not** create `PrismaService` / `PrismaModule` or wire Prisma into Nest — Phase 3.
- Do **not** author the authoritative `.env` / `.env.example` content — Task 0-4 owns it.
- Do **not** add `docker-compose.yml` — Task 0-4.
- Do **not** add any dependency beyond `prisma` (dev) and `@prisma/client`. If a step seems to
  require another package, STOP and ask.
