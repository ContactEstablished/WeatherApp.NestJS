# Task 2-1 — Author the two §0.4 models (and seed stub) and validate the schema

## Surface
Database schema authoring only — `prisma/schema.prisma` (replace the stub body with the two §0.4
models), `prisma/seed.ts` (new minimal stub), and the root `package.json` (`prisma.seed` hook). This
is **authoring and static validation only**: no migration is run, no client is regenerated, no seed is
executed, and no NestJS code is written.

## Why
Phase 0 left `prisma/schema.prisma` as a model-free stub (generator + datasource only). This task turns
it into the project's persistence schema by writing the `UserPreference` and `SavedLocation` models per
RoadMap §0.4 — the exact field types, `@db.VarChar`/`@db.Decimal` annotations, defaults, timestamps,
`@@unique`/`@@index` constraints, and `@@map` table names. It also wires the seed *mechanism* (a stub
`prisma/seed.ts` + the `package.json` `prisma.seed` hook) so Phase 5 can run it later without further
wiring. Splitting authoring (this task) from `migrate dev` (Task 2-2) is deliberate: the schema diff is
an **approval gate** (§0: "schema migrations require approval before apply"), so the schema must be
authored and statically validated before anyone touches the database. This unblocks Task 2-2 (which
migrates the authored schema) and, downstream, Phase 3's `PrismaService`.

## Depends on
- **Roadmap Phase 2 — Database + Prisma** (`docs/RoadMap.md`, "### Phase 2"): the "Author the two §0.4
  models" / "Carry the two constraints exactly" / "Author a `prisma/seed.ts` stub…" scope bullets, the
  "schema + migration only, no providers" constraint, and the "schema migration is an approval gate"
  constraint. Enumerated task split item 1.
- **Roadmap §0.4 — Data model** (`docs/RoadMap.md` lines ~158–208): the authoritative model spec and
  the exact target `schema.prisma` SDL — reproduce it verbatim (embedded below).
- **Task 0-3** (`docs/tasks/Tasks-0-3.md`): produced the Phase 0 stub this task replaces (datasource +
  generator, zero models). Hard precondition.
- **Phase 0 — Bootstrap — Handoff** (`docs/handoffs/Phase-0-Handoff.md`), deviation #3: Prisma is
  pinned to **6.x** with the **classic `prisma-client-js` generator** (generates into
  `node_modules/.prisma/client`); the datasource carries an explicit `url = env("DATABASE_URL")` and
  there is **no** `prisma.config.ts`. Do not switch to the new `prisma-client` generator or add a
  `prisma.config.ts`.
- **Phase 1 — Shared contract — Handoff** (`docs/handoffs/Phase-1-Handoff.md`), "For downstream phases":
  "The shared types define the API **response** shape; the schema owns the **persistence** shape." This
  task authors the persistence shape and must **not** import or align field-for-field with
  `@nimbus/shared-types` (the `Decimal`→`number` boundary is a Phase 3 concern).
- No ADRs exist in `docs/decisions/` — the roadmap is the only locked source.

## Required reading
- `prisma/schema.prisma` (current Phase 0 stub) — **Mirror:** keep the existing `generator client` and
  `datasource db` blocks **untouched and unmoved**; append the two models below them only.
- `docs/RoadMap.md` §0.4 (lines ~158–208) — **Mirror:** the target `schema.prisma` SDL exactly
  (reproduced in Acceptance criteria below). Note the §0.4 invariants table is context for *why* the
  `@@unique`/`@@index` exist; the enforcement code is Phase 3, not here.
- `docs/handoffs/Phase-0-Handoff.md` — **Mirror:** Prisma 6.x / classic `prisma-client-js` generator;
  do not regenerate it to the new style.
- `docs/tasks/Tasks-0-3.md` — **Mirror:** the "author schema only, do not migrate" discipline this task
  continues (Task 0-3 deferred models to Phase 2; this task writes exactly those models and nothing
  more).
- `package.json` (root) — **Mirror:** existing style; `ts-node@10.9.1` is already a devDependency, so
  the `prisma.seed` hook can use `ts-node prisma/seed.ts` with **no new dependency**.
- `.env.example` — **Mirror:** confirms the `DATABASE_URL` shape
  (`postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`); read-only here — `validate` does
  not need a live DB, but the env var must be resolvable for the CLI.
- `CLAUDE.md` — project conventions and the `npm run build` / `npm test` / `npm run lint` commands.

## Acceptance criteria
1. **`prisma/schema.prisma` contains exactly the two §0.4 models, verbatim**, appended below the
   untouched Phase 0 `generator client` + `datasource db` blocks. The full file must read:

   ```prisma
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

   Field-level checks the diff must satisfy (do not paraphrase the annotations):
   - `UserPreference.userId` is the `@id`, typed `String @db.VarChar(120)`.
   - `UserPreference.unitSystem` is `String @default("imperial") @db.VarChar(16)`.
   - `UserPreference.createdUtc` is `DateTime @default(now())`; `updatedUtc` is `DateTime @updatedAt`.
   - `UserPreference` carries `@@map("user_preferences")`.
   - `SavedLocation.id` is `Int @id @default(autoincrement())`.
   - `userId @db.VarChar(120)`, `name @db.VarChar(160)`, `region @db.VarChar(160)`,
     `country @db.VarChar(80)`.
   - `latitude` and `longitude` are both `Decimal @db.Decimal(9, 6)` (note the space: `(9, 6)`).
   - `isDefault Boolean @default(false)`; `sortOrder Int @default(0)`; `createdUtc DateTime @default(now())`.
   - `@@unique([userId, name, region])` and `@@index([userId, sortOrder])` are both present on
     `SavedLocation`, in that field order.
   - `SavedLocation` carries `@@map("saved_locations")`.
2. **Schema validates.** `npx prisma validate` exits 0 and reports the schema is valid. (This is a
   static check — it does **not** require a running database, but `DATABASE_URL` must be resolvable from
   `.env`.)
3. **`prisma/seed.ts` exists as a minimal stub.** A new file `prisma/seed.ts` that either has an empty
   `main()` body or upserts a single `anonymous` `UserPreference` row, then disconnects. It must be a
   valid TypeScript file runnable by `ts-node prisma/seed.ts` (it is **not run** in this task — see
   "Approval gates / what NOT to run"). Recommended skeleton:
   ```ts
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   async function main() {
     // Phase 2 ships an intentionally minimal seed; Phase 5 owns execution.
     // Optional starter row:
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
   > Note: the commented-out `upsert` references `@prisma/client`'s generated types, which do not exist
   > until Task 2-2 runs `prisma generate`. Keeping the active body empty (or the row commented) means
   > `prisma/seed.ts` need not compile against generated types in this task; if you uncomment the row,
   > it will only type-check after Task 2-2.
4. **`package.json` carries the `prisma.seed` hook.** A top-level `"prisma": { "seed": "ts-node prisma/seed.ts" }`
   block is added to the root `package.json`. Reuse the existing `ts-node@10.9.1` devDependency — **add
   no new dependency**. The hook is wired but **not invoked** (`prisma db seed` is Phase 5).
5. **Build / lint / test stay green.** `npm run build`, `npm run lint`, and `npm test` (the config's
   `build_command` / `test_command` / `extra_checks`) still pass — authoring the schema and the seed
   stub must not break the Phase 1 baseline. Do **not** add new specs (testing is Phase 6).

## Out of scope (do NOT do these here — they are Task 2-2 or later phases)
- **`npx prisma migrate dev` / any migration.** No `prisma/migrations/` directory is created in this
  task. The migration is **Task 2-2** and is gated on schema approval.
- **`npx prisma generate` / regenerating the client.** Task 2-2. (Do not rely on generated types here.)
- **Running the seed** (`npx prisma db seed` / `ts-node prisma/seed.ts`). Authored here, **executed in
  Phase 5**.
- **`PrismaModule` / `PrismaService` / `UsersModule`** and every §0.4 service-layer invariant
  (auto-create-on-first-read, single-default-per-user, `(userId,name,region)` dedupe, contiguous
  `sortOrder`) — **Phase 3**. The `@@unique`/`@@index` only back those rules at the DB layer.
- **`Decimal` → `number` boundary conversion** for the `LocationSuggestion` contract — **Phase 3**.
- **Aligning the schema to `@nimbus/shared-types`** — the shared types are the response shape; the
  schema is the persistence shape. Do not import from or reshape against the shared lib.

## Approval gates / what NOT to run
- This task is the **pre-gate** half of Phase 2. Authoring and `prisma validate` may proceed freely
  (they do not mutate the database). The **schema diff produced here is the artifact to be reviewed**:
  present the authored `prisma/schema.prisma` for human sign-off. **Do not run `prisma migrate dev`** —
  that is Task 2-2 and **requires approval before apply** (§0). If a step seems to require touching the
  database, STOP.
- **No schema migration / no new dependency** beyond what the roadmap specifies — and Phase 2 specifies
  none for this task (the seed hook reuses the existing `ts-node`). If a task seems to need one, STOP
  and ask.

## Files affected
- `prisma/schema.prisma` — modified (stub body replaced with the two §0.4 models).
- `prisma/seed.ts` — created (minimal stub).
- `package.json` (root) — modified (add the `prisma.seed` hook only; no dependency changes).

## Suggested commit
```
feat(prisma): author §0.4 UserPreference + SavedLocation models and seed stub

Replace the Phase 0 model-free stub in prisma/schema.prisma with the two
RoadMap §0.4 models: UserPreference (userId PK, unitSystem default
"imperial", created/updated timestamps) and SavedLocation (decimal(9,6)
lat/lon, @@unique([userId, name, region]), @@index([userId, sortOrder]),
@@map table names). Add a minimal prisma/seed.ts stub and wire the
package.json prisma.seed hook (ts-node) — seed authored, not run.

npx prisma validate passes. No migration, no generate, no seed run, no
NestJS code — those are Task 2-2 and Phase 3/5. Schema diff is the
approval-gate artifact before migrate dev.
```
