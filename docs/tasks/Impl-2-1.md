# Impl 2-1 — Author the two §0.4 models (and seed stub) and validate the schema

**Acceptance contract:** `docs/tasks/Tasks-2-1.md`
**Decision lock:** No ADR. Locked by `docs/RoadMap.md` §0.4 (verbatim SDL) and
`docs/handoffs/Phase-0-Handoff.md` deviation #3 (Prisma 6.x / classic `prisma-client-js`
generator / no `prisma.config.ts`).
**Scope:** Schema authoring + static validation only — no schema migration, no client
regeneration, no seed execution, no new dependency, no NestJS code.

---

## Step 0 — Pre-flight

Before touching any file, confirm the following gates are all green.

**Branch check**

```
git status
```

Expected: `nothing to commit, working tree clean` on `main`.

**Baseline build / test / lint green**

```
npm run build
npm test
npm run lint
```

All three must exit 0 before any edits are made. If any fail, stop and resolve the
pre-existing breakage before continuing.

**Files to open before starting**

| File | What to confirm |
|---|---|
| `prisma/schema.prisma` | Contains exactly the Phase 0 stub: `generator client { provider = "prisma-client-js" }` + `datasource db { provider = "postgresql" url = env("DATABASE_URL") }` — **zero model blocks**. |
| `package.json` (root) | Has no top-level `"prisma"` key. Has `"ts-node": "10.9.1"` in `devDependencies`. Has `"prisma": "^6.19.3"` in `devDependencies` and `"@prisma/client": "^6.19.3"` in `dependencies`. |
| `.env` | Exists (gitignored) and contains `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`. |

**STOP if any of the following are true:**
- `prisma/schema.prisma` already contains any `model` block.
- `package.json` already has a top-level `"prisma"` key.
- `ts-node` is absent from `devDependencies`.
- `npm run build`, `npm test`, or `npm run lint` fails.

---

## Step 1 — Append the two §0.4 models to `prisma/schema.prisma`

**File:** `prisma/schema.prisma`

**Action:** Replace the entire file with the content below. The `generator client` and
`datasource db` blocks are reproduced exactly as they exist in the Phase 0 stub — do not
alter a single character of those blocks. The two model blocks are appended after them,
separated by a blank line, exactly as specified in `docs/RoadMap.md` §0.4.

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model UserPreference {
  userId     String   @id @db.VarChar(120)
  unitSystem String   @default("imperial") @db.VarChar(16)
  createdUtc DateTime @default(now())
  updatedUtc DateTime @updatedAt

  @@map("user_preferences")
}

model SavedLocation {
  id         Int      @id @default(autoincrement())
  userId     String   @db.VarChar(120)
  name       String   @db.VarChar(160)
  region     String   @db.VarChar(160)
  country    String   @db.VarChar(80)
  latitude   Decimal  @db.Decimal(9, 6)
  longitude  Decimal  @db.Decimal(9, 6)
  isDefault  Boolean  @default(false)
  sortOrder  Int      @default(0)
  createdUtc DateTime @default(now())

  @@unique([userId, name, region])
  @@index([userId, sortOrder])
  @@map("saved_locations")
}
```

**Checklist before saving:**
- `generator client` and `datasource db` blocks are identical to the Phase 0 stub.
- `UserPreference.userId` is `String @id @db.VarChar(120)` — the `@id` annotation.
- `UserPreference.unitSystem` is `String @default("imperial") @db.VarChar(16)`.
- `UserPreference.updatedUtc` carries `@updatedAt` (not `@default(now())`).
- `UserPreference` carries `@@map("user_preferences")`.
- `SavedLocation.latitude` and `.longitude` are both `Decimal @db.Decimal(9, 6)` — note the
  space inside the parentheses: `(9, 6)`.
- `@@unique([userId, name, region])` precedes `@@index([userId, sortOrder])`.
- `SavedLocation` carries `@@map("saved_locations")`.
- No `prisma/migrations/` directory has been created.

**Verify:**

```
npx prisma validate
```

Expected output (exit 0): `The schema at prisma/schema.prisma is valid` (exact wording may
vary by Prisma 6.x patch; what matters is exit code 0 and no error lines).

> `prisma validate` performs a static parse + semantic check only. It does **not** require a
> running database. However, the Prisma CLI must be able to resolve `DATABASE_URL` from `.env`
> to avoid a "environment variable not found" error — confirm `.env` is present before running.

**STOP if `npx prisma validate` exits non-zero.** Do not proceed to Step 2 until the schema
is valid.

---

## Step 2 — Create `prisma/seed.ts` (minimal stub)

**File:** `prisma/seed.ts` (new file — create it)

**Action:** Create the file with the content below. The active body of `main()` is empty;
the `upsert` row is present but commented out because `@prisma/client`'s generated types
(`prisma.userPreference`) do not exist until Task 2-2 runs `prisma generate`. Keeping the
active body empty means this file is valid TypeScript that does not depend on generated
output.

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Phase 2 ships an intentionally minimal seed; Phase 5 owns execution.
  // Optional starter row (uncomment after Task 2-2 generates the client):
  // await prisma.userPreference.upsert({
  //   where: { userId: 'anonymous' },
  //   update: {},
  //   create: { userId: 'anonymous', unitSystem: 'imperial' },
  // });
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

**Checklist before saving:**
- `import { PrismaClient } from '@prisma/client'` is the only import.
- The `main()` body has no active statements — only the block comment and the commented-out
  `upsert`.
- The `.catch` / `.finally` chain is present so `ts-node` handles async teardown correctly.
- Do **not** uncomment the `upsert` block — `prisma.userPreference` does not type-check until
  after Task 2-2 (`prisma generate`).

**Verify:**

```
npm run build
```

Expected: exits 0. The `prisma/seed.ts` file is outside the NestJS `apps/api` TypeScript
project boundary (it lives at the repo root's `prisma/` directory, not inside `apps/`), so
the build command (`nx run-many -t build`) should not attempt to compile it. If the build
fails citing `prisma/seed.ts`, check that `prisma/seed.ts` is not accidentally inside a
`tsconfig.json` `include` glob.

---

## Step 3 — Add the `prisma.seed` hook to `package.json`

**File:** `package.json` (root)

**Action:** Add a top-level `"prisma"` key immediately after the `"private": true` line
(position is cosmetic — any top-level position is correct). The value is exactly:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
},
```

The resulting `package.json` top-level structure must include this key alongside `"name"`,
`"version"`, `"scripts"`, `"private"`, `"devDependencies"`, and `"dependencies"`. No other
changes to `package.json` are made — specifically, do **not** add any new entry to
`devDependencies` or `dependencies`; `ts-node@10.9.1` is already present and is the runtime
the hook uses.

**Checklist before saving:**
- The `"prisma"` key is top-level (not nested under `"scripts"` or `"devDependencies"`).
- The value of `"seed"` is the exact string `"ts-node prisma/seed.ts"`.
- No dependency entry has been added or modified.
- JSON is valid (no trailing commas, properly paired braces).

**Verify:**

```
npm run build
npm run lint
npm test
```

All three must exit 0. The `package.json` modification must not affect any build target or
test suite.

---

## Step 4 — Full verification pass

Run all checks in sequence and confirm each exits 0:

```
npx prisma validate
npm run build
npm run lint
npm test
```

Then confirm the diff contains exactly the expected files and nothing else:

```
git diff --stat HEAD
```

Expected output (three files, no migrations directory):

```
 package.json         |  3 +++
 prisma/schema.prisma | 32 ++++++++++++++++++++++++++++++++
 prisma/seed.ts       | 16 ++++++++++++++++
 3 files changed, 51 insertions(+)
```

(Line counts are approximate; exact counts depend on spacing. The key assertion is that only
these three files appear in the diff and no `prisma/migrations/` path is present.)

**APPROVAL GATE — STOP HERE.**

The authored `prisma/schema.prisma` is the artifact for human review before Task 2-2 begins.
Present the schema diff for sign-off. **Do not run `npx prisma migrate dev`, `npx prisma
generate`, or `npx prisma db seed`** — those are Task 2-2 and Phase 5 respectively, and the
migration requires explicit approval before apply per RoadMap §0 constraint
"schema migrations require approval before apply".

---

## Step 5 — Commit

Once the approval gate above is cleared by a human reviewer, create the single commit:

```
git add prisma/schema.prisma prisma/seed.ts package.json
git commit -m "feat(prisma): author §0.4 UserPreference + SavedLocation models and seed stub

Replace the Phase 0 model-free stub in prisma/schema.prisma with the two
RoadMap §0.4 models: UserPreference (userId PK, unitSystem default
\"imperial\", created/updated timestamps) and SavedLocation (decimal(9,6)
lat/lon, @@unique([userId, name, region]), @@index([userId, sortOrder]),
@@map table names). Add a minimal prisma/seed.ts stub and wire the
package.json prisma.seed hook (ts-node) — seed authored, not run.

npx prisma validate passes. No migration, no generate, no seed run, no
NestJS code — those are Task 2-2 and Phase 3/5. Schema diff is the
approval-gate artifact before migrate dev."
```

No `Co-Authored-By` trailer.

**Final verify after commit:**

```
git show --stat HEAD
```

Confirm: three files changed, commit message matches, author is the git user (no co-author
trailer).
