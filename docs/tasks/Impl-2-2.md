# Impl 2-2 — Create the initial migration and generate the client

**Acceptance contract:** `docs/tasks/Tasks-2-2.md`
**Decision lock:** `docs/RoadMap.md` Phase 2 — "Single `init` migration" and "`prisma generate`
placement" decisions; "schema migration is an approval gate" constraint. No ADRs in `docs/decisions/`.
**Scope:** Run `npx prisma migrate dev --name init` then `npx prisma generate` against the Task 2-1
authored `prisma/schema.prisma`. No schema change, no new dependency, no NestJS code.

---

## Step 0 — Pre-flight

**All three conditions below must be true before running any command that touches the database.
If any condition is unmet, STOP and resolve it before continuing.**

### 0-A — Schema approved (mandatory gate)

The Task 2-1 `prisma/schema.prisma` diff must have been **reviewed and signed off by a human**.
RoadMap §0 states: "schema migrations require approval before apply." `prisma migrate dev` creates a
migration *and* mutates the live database — it must not run before that approval is on record.

Verify the Task 2-1 commit is the current HEAD of `main` and that the reviewer has confirmed sign-off:

```powershell
git log --oneline -5
```

Expected: the Task 2-1 commit (`feat(prisma): author §0.4 UserPreference + SavedLocation models and
seed stub`) appears, and a human has explicitly approved the schema diff. If approval has not been
given, **STOP**.

Also confirm `prisma/schema.prisma` is byte-for-byte the approved version — it must contain both
`UserPreference` and `SavedLocation` models with `@@unique([userId, name, region])` and
`@@index([userId, sortOrder])`:

```powershell
Get-Content prisma\schema.prisma
```

Expected: the full §0.4 schema (generator + datasource + both models). If the file is still the
Phase 0 stub (no models), Task 2-1 has not been completed — STOP.

### 0-B — Local Postgres is up

```powershell
docker compose ps
```

Expected: the `db` service is listed as **running** with health status **healthy**. If the container
is not shown or is unhealthy, start it:

```powershell
docker compose up -d
```

Wait ~15 s, then verify again with `docker compose ps`. Alternatively, probe directly:

```powershell
docker exec $(docker compose ps -q db) pg_isready -U nimbus -d nimbus
```

Expected output: `localhost:5432 - accepting connections`. If the container does not become healthy,
do not proceed — a dead database means `migrate dev` will fail or silently corrupt state.

### 0-C — `DATABASE_URL` is set in `.env`

```powershell
Get-Content .env | Select-String "DATABASE_URL"
```

Expected: `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public` (credentials
must match the `docker-compose.yml` `db` service). If `.env` does not exist, copy it from the
example:

```powershell
Copy-Item .env.example .env
```

`.env` is gitignored — confirm it is **not** staged:

```powershell
git status
```

Expected: `.env` does not appear in the output. If it does, remove it from the index immediately
(`git rm --cached .env`) — it must never be committed.

### 0-D — Baseline build is green

```powershell
npm run build
npm test
npm run lint
```

All three must pass before any migration work begins. If any fails, that is a pre-existing regression
from a prior task — fix it before continuing (do not attribute it to this task's changes).

**Files to open before starting:**

- `prisma/schema.prisma` — the schema being migrated (do not edit it in this task)
- `docker-compose.yml` — confirm the `db` service name and credentials
- `.env` — confirm `DATABASE_URL` matches docker-compose

---

## Step 1 — Run the initial migration

With all three pre-flight conditions confirmed, create and apply the single initial migration:

```powershell
npx prisma migrate dev --name init
```

This command:
1. Compares the current `prisma/schema.prisma` against the empty database.
2. Generates `prisma/migrations/<timestamp>_init/migration.sql` containing the full DDL.
3. Applies that DDL to the local Postgres (`nimbus` database).
4. Creates `prisma/migrations/migration_lock.toml` locking the provider to `postgresql`.
5. Runs `prisma generate` implicitly at the end (Step 2 runs it again explicitly for certainty).

**Expected terminal output (approximate):**

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "nimbus", schema "public" at "localhost:5432"

Applying migration `<timestamp>_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ <timestamp>_init/
    └─ migration.sql

Your database is now in sync with your schema.
```

If you see a prompt asking whether to reset the database (because drift exists), answer **Y** only if
the database is genuinely empty and disposable. If there is existing data you must preserve, STOP and
investigate before answering.

**Verify:**

```powershell
npx prisma migrate status
```

Expected output:

```
Status
1 migration found in prisma/migrations

DATABASE
1 migration have been applied:

- 20xxxxxxxxxxxxxx_init

No drift detected. Your database schema is in sync with your migration history.
```

Exactly **one** migration must be listed (`init`), with no drift and no pending migrations. If two
migrations appear, or if drift is reported, STOP — do not continue until the migration state is clean.

---

## Step 2 — Inspect the generated migration SQL

Locate the migration file and verify the DDL is correct. The file name is
`prisma/migrations/<timestamp>_init/migration.sql` — the `<timestamp>` is a 14-digit UTC string
(e.g. `20260620143022`).

```powershell
Get-ChildItem prisma\migrations -Recurse -Filter "*.sql"
```

Open the file and check for all of the following (exact Postgres DDL spelling is whatever Prisma 6
emits — `CREATE UNIQUE INDEX` vs inline `UNIQUE` constraint, `SERIAL` vs `GENERATED AS IDENTITY` are
both acceptable):

- `CREATE TABLE "user_preferences"` with columns `userId VARCHAR(120) PRIMARY KEY`, `unitSystem
  VARCHAR(16) DEFAULT 'imperial'`, `createdUtc TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `updatedUtc
  TIMESTAMP`.
- `CREATE TABLE "saved_locations"` with columns `id` (integer PK with autoincrement/serial/identity),
  `userId VARCHAR(120)`, `name VARCHAR(160)`, `region VARCHAR(160)`, `country VARCHAR(80)`,
  `latitude DECIMAL(9,6)`, `longitude DECIMAL(9,6)`, `isDefault BOOLEAN DEFAULT false`, `sortOrder
  INTEGER DEFAULT 0`, `createdUtc TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.
- A **unique** constraint or `CREATE UNIQUE INDEX` covering `(userId, name, region)` on
  `saved_locations`.
- A (non-unique) **index** (`CREATE INDEX`) covering `(userId, sortOrder)` on `saved_locations`.

Also confirm `prisma/migrations/migration_lock.toml` exists:

```powershell
Get-Content prisma\migrations\migration_lock.toml
```

Expected:

```toml
# Please do not edit this file manually
# It should be added in your version-control system (i.e. git)
provider = "postgresql"
```

**Verify:** Both structural checks above pass (unique `(userId, name, region)` and index `(userId,
sortOrder)` appear in the SQL). If either is missing, the schema models in `prisma/schema.prisma` are
incomplete — but remember, this task must not modify `schema.prisma`. STOP and raise the issue as a
Task 2-1 re-author + re-approval before any further migration work.

---

## Step 3 — Explicitly regenerate the Prisma client

Run `prisma generate` explicitly to make the dependency order unambiguous and to ensure the typed
client is on disk even if `migrate dev` skipped its built-in generate step:

```powershell
npx prisma generate
```

Expected terminal output (approximate):

```
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.x.x) to ./node_modules/.prisma/client in XXXms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
```

The generator is `prisma-client-js` (classic), so the output lands in `node_modules/.prisma/client`
— **not** in a `generated/` directory. This is per Phase 0 Handoff deviation #3 and is the correct
target for `import { PrismaClient } from '@prisma/client'`.

**Verify:**

```powershell
node -e "const { PrismaClient } = require('@prisma/client'); console.log('PrismaClient loaded OK');"
```

Expected: `PrismaClient loaded OK` (no error). If `require('@prisma/client')` throws (module not
found or no generated client), the generate step failed — rerun `npx prisma generate` and check for
errors in the output.

---

## Step 4 — Type-check the generated client (scratch verification)

Create a throwaway TypeScript file to verify `PrismaClient` and its generated accessors
(`userPreference`, `savedLocation`) resolve without type errors. This scratch file must be deleted
before committing.

Create the file:

```powershell
@"
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Type-check that the generated accessors exist.
// These lines are never executed — this is a compile-only check.
void (prisma.userPreference satisfies object);
void (prisma.savedLocation satisfies object);
"@ | Set-Content _prisma_check.ts
```

Run `tsc` against it (using the root tsconfig for path resolution):

```powershell
npx tsc --noEmit --skipLibCheck --esModuleInterop --module commonjs --target es2020 _prisma_check.ts
```

Expected: exits 0 with no output. If the compile fails with "Property 'userPreference' does not
exist" or similar, the generated client is stale or incomplete — rerun `npx prisma generate` and
repeat.

**Delete the scratch file immediately — it must not be committed:**

```powershell
Remove-Item _prisma_check.ts
```

Confirm it is gone:

```powershell
git status
```

Expected: `_prisma_check.ts` does not appear in tracked or untracked files.

**Verify:** `tsc` exited 0 on the scratch file, and `_prisma_check.ts` is deleted.

---

## Step 5 — Confirm `prisma/schema.prisma` was not modified

This task must not touch `schema.prisma`:

```powershell
git diff prisma/schema.prisma
```

Expected: no output (empty diff). If the file appears in the diff, something modified it during the
migration or generate step — revert it immediately:

```powershell
git checkout -- prisma/schema.prisma
```

Then verify `git diff prisma/schema.prisma` is empty again.

**Verify:** `git diff prisma/schema.prisma` is empty; the file is byte-identical to the Task 2-1
approved version.

---

## Step 6 — Confirm seed was not run

```powershell
docker exec $(docker compose ps -q db) psql -U nimbus -d nimbus -c "SELECT COUNT(*) FROM user_preferences;"
```

Expected: `count = 0`. If rows are present, the seed was accidentally run — truncate the table and
note it in the commit message. Do not run `npx prisma db seed` at any point in this task.

**Verify:** `user_preferences` count is 0 (or only rows inserted by a deliberate manual check, which
must be deleted before the final gate below).

---

## Step 7 — Full build / lint / test gate

Run all three verification commands and confirm they stay green after the migration and client
generation:

```powershell
npm run build
```

Expected: exits 0. The generated client is in `node_modules/.prisma/client` (a build artifact, not
committed) — it must not introduce TypeScript errors into `apps/api`, `apps/web`, or `libs/shared-types`.

```powershell
npm run lint
```

Expected: exits 0.

```powershell
npm test
```

Expected: exits 0, all existing tests pass. No new test files are added in this task (testing is
Phase 6).

**Verify:** all three commands exit 0 on the post-migration workspace.

---

## Step 8 — Check committed files and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected files to appear as new (untracked → to be added):**

- `prisma/migrations/<timestamp>_init/migration.sql`
- `prisma/migrations/migration_lock.toml`

**Must NOT appear in the diff:**

- `prisma/schema.prisma` (not modified)
- `prisma/seed.ts` (not modified — authored in Task 2-1)
- `package.json` (not modified)
- `node_modules/.prisma/client/**` (build artifact; must be gitignored)
- `_prisma_check.ts` (must have been deleted in Step 4)
- `.env` (must remain gitignored and uncommitted)

If `node_modules/` appears, check `.gitignore` — it should already exclude it from the Phase 0
bootstrap. If `.env` appears, unstage it immediately and add it to `.gitignore` before continuing.

### Stage the migration files

```powershell
git add prisma/migrations/
```

Confirm the staged set:

```powershell
git status
```

Expected staged files: the two items listed above (`migration.sql` and `migration_lock.toml`) and
nothing else.

### Commit

```powershell
git commit -m "feat(prisma): add initial migration creating user_preferences + saved_locations

Run prisma migrate dev --name init against local Postgres (after schema
approval) to create the single initial migration: DDL for user_preferences
and saved_locations, including the unique (userId, name, region) constraint
and the (userId, sortOrder) index. Run prisma generate so the typed client
resolves for Phase 3's PrismaService.

One init migration (not split). Seed authored in Task 2-1 but not run
(Phase 5). No NestJS providers and no Decimal->number boundary — those are
Phase 3."
```

No `Co-Authored-By` trailer.

**Verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit message above appears at HEAD; the stat shows exactly `prisma/migrations/` files
(two entries: `migration.sql` and `migration_lock.toml`).

---

## Summary of gates

| Step | Gate |
|------|------|
| 0-A | Schema approved by human — STOP if absent |
| 0-B | `docker compose ps` shows `db` healthy |
| 0-C | `.env` has `DATABASE_URL`; not committed |
| 0-D | `npm run build` + `npm test` + `npm run lint` green at baseline |
| 1 | `npx prisma migrate status` — 1 applied migration, no drift |
| 2 | `migration.sql` contains `@@unique(userId, name, region)` + `@@index(userId, sortOrder)` DDL; `migration_lock.toml` provider = postgresql |
| 3 | `node -e "require('@prisma/client')"` exits 0 |
| 4 | `tsc --noEmit` on scratch file exits 0; scratch file deleted |
| 5 | `git diff prisma/schema.prisma` is empty |
| 6 | `user_preferences` row count is 0 (seed not run) |
| 7 | `npm run build` + `npm run lint` + `npm test` green post-generate |
| 8 | Staged diff is exactly `prisma/migrations/` (2 files); commit message matches Tasks doc |
