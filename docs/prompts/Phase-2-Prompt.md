# Execution Prompt — Phase 2: Database + Prisma

Paste into a fresh session rooted at the repo root. Run only after Phase 0 (Bootstrap) and Phase 1 (Shared contract) are complete.

---

You are the lead full-stack engineer for the WeatherApp.NestJS project, working across an Angular front end, a NestJS/Node.js API, and a PostgreSQL database. You design, implement, test, and validate the work directly, following the repo's existing conventions and keeping type safety, clear contracts between the API and the client, and database integrity in mind.

---

## Session-start checklist

Before writing any code:

1. **Tree is clean.** `git status` shows no uncommitted changes.
2. **Build / lint / test pass.** Run `npm run build`, `npm run lint`, and `npm test`. All pass.
3. **Phase 1 is complete.** `libs/shared-types` exports all thirteen types (`@nimbus/shared-types` resolves cleanly from both apps).
4. **Local Postgres is available.** `docker compose up -d` brings up the `db` service; `docker compose ps` shows it healthy. (You will *not* migrate until approval — just confirm it is runnable.)
5. **`.env` is set.** A local `.env` exists (you may copy `.env.example` if it does not) with `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public` matching the docker-compose `db` service creds.

---

## Important context — RoadMap Phase 2

Read **`docs/RoadMap.md`** § Phase 2 — Database + Prisma. Key constraints:

- **Schema and migration only, no providers.** This phase touches `prisma/schema.prisma`, `prisma/migrations/`, the generated client, and the seed mechanism. It writes **no** NestJS code: `PrismaModule`, `PrismaService`, `UsersModule`, and §0.4 service-layer invariants are Phase 3.
- **Schema migration is an approval gate.** Authoring `schema.prisma` and running `npx prisma validate` may proceed freely (they do not mutate the database). The `npx prisma migrate dev` step is **gated on human approval** — present the authored schema diff for review before running any migration command.
- **No new dependencies.** The seed hook reuses the existing `ts-node@10.9.1` devDependency.
- **One `init` migration, not two.** Both models are authored fresh in a single step; there is no reason to split history.
- **Prisma 6.x / classic `prisma-client-js` generator.** Do not switch to the new style or add a `prisma.config.ts`.

Also read:

- **`docs/RoadMap.md` § 0.4 — Data model** (lines ~158–208): the authoritative spec for the two models and their constraints.
- **`docs/handoffs/Phase-1-Handoff.md`**: what Phase 1 delivered; the shared types define the API response shape; the schema owns the persistence shape.
- **`docs/handoffs/Phase-0-Handoff.md`**: Prisma initialization, docker-compose setup, and `.env` shape.
- **Task docs** (below): the acceptance criteria for each task and the approval gates.

---

## Mission

Deliver Phase 2 — Database + Prisma end to end: author the two §0.4 models (`UserPreference`, `SavedLocation`) with their exact field types, constraints, and indexes into `prisma/schema.prisma`, create the initial migration against local Postgres, generate the Prisma client, and author the seed mechanism.

The phase delivers **schema, migration, and client — no NestJS providers and no business logic**.

### Task 2-1 — Author the two §0.4 models (and seed stub) and validate the schema

**Read:** `docs/tasks/Tasks-2-1.md` (all sections — understand the approval gate and the out-of-scope boundaries).

**Scope:** Replace the Phase 0 stub in `prisma/schema.prisma` with the two §0.4 models exactly (see Tasks-2-1.md Acceptance Criteria #1 for the verbatim SDL). Author a minimal `prisma/seed.ts` stub and wire the `package.json` `prisma.seed` hook.

**Execute:**

1. Edit `prisma/schema.prisma`. Keep the existing `generator client` and `datasource db` blocks **untouched**. Append the two models:

   - `UserPreference` with `userId @id @db.VarChar(120)`, `unitSystem @default("imperial") @db.VarChar(16)`, `createdUtc @default(now())`, `updatedUtc @updatedAt`, and `@@map("user_preferences")`.
   - `SavedLocation` with all eight fields (`id`, `userId`, `name`, `region`, `country`, `latitude`, `longitude`, `isDefault`, `sortOrder`, `createdUtc`), the `@@unique([userId, name, region])` constraint, the `@@index([userId, sortOrder])` index, and `@@map("saved_locations")`.

2. Validate the schema. Run `npx prisma validate`. It must exit 0 with no errors.

3. Author `prisma/seed.ts`. A minimal stub with an empty or commented-out `main()` body, sufficient to be run later by `ts-node prisma/seed.ts` (Phase 5 owns execution).

4. Wire the `package.json` `prisma.seed` hook. Add a top-level `"prisma": { "seed": "ts-node prisma/seed.ts" }` block; reuse the existing `ts-node@10.9.1` devDependency.

5. Verify build / lint / test still pass. `npm run build`, `npm run lint`, `npm test` must be green (no new specs; testing is Phase 6).

**Acceptance:** See `docs/tasks/Tasks-2-1.md` Acceptance Criteria — the schema is word-for-word per §0.4, `npx prisma validate` passes, the seed stub and hook are in place, and the workspace builds/lints/tests cleanly.

**Approval gate:** The **schema diff is the artifact to be reviewed**. Present the authored `prisma/schema.prisma` for human sign-off. Do **not** run `npx prisma migrate dev` — that is Task 2-2 and requires approval before apply. If you feel you must touch the database, STOP.

**Suggested commit:**
```
feat(prisma): author §0.4 UserPreference + SavedLocation models and seed stub
```

---

### Task 2-2 — Create the initial migration and generate the client

**Read:** `docs/tasks/Tasks-2-2.md` (all sections — understand the pre-conditions and approval requirement).

**Scope:** Run `npx prisma migrate dev --name init` against the local Postgres (after the Task 2-1 schema diff is approved), then run `npx prisma generate`. This creates the migration files and generates the typed Prisma client.

**Pre-conditions (VERIFY before starting):**

1. **Schema approved (mandatory gate).** The Task 2-1 `prisma/schema.prisma` diff has been reviewed and signed off by a human. **If approval has not been given, STOP.** `migrate dev` creates a migration and mutates the database — it must not run before approval.
2. **Local Postgres is up.** `docker compose up -d` brings up the `db` service; `docker compose ps` shows it healthy.
3. **`.env` is set.** `DATABASE_URL` is correct in your local `.env`.

**Execute:**

1. Run the initial migration. `npx prisma migrate dev --name init`. This creates `prisma/migrations/<timestamp>_init/migration.sql` (the DDL) and applies it to the database. Confirm the output shows one migration created and applied.

2. Generate the Prisma client. `npx prisma generate`. This ensures the typed client is present on disk before Phase 3's `PrismaService` imports it.

3. Verify migration status. `npx prisma migrate status` should report the schema is up to date with one applied migration and no drift.

4. Verify the client resolves. A throwaway import like `import { PrismaClient } from '@prisma/client'` must type-check. (Create a temporary `.ts` file to verify if needed, then delete it before committing.)

5. Verify build / lint / test still pass. `npm run build`, `npm run lint`, `npm test` must be green.

**Acceptance:** See `docs/tasks/Tasks-2-2.md` Acceptance Criteria — the migration files exist, the DDL creates both tables with the right constraints/indexes, migration status is clean, the client resolves, no schema edits were made, and the workspace builds/lints/tests cleanly.

**Out of scope:** Do **not** run `prisma db seed` or edit `schema.prisma` in this task.

**Suggested commit:**
```
feat(prisma): add initial migration creating user_preferences + saved_locations
```

---

## Phase 2 success criteria (from RoadMap)

- `prisma/schema.prisma` contains the two §0.4 models exactly — all field types, constraints, defaults, and `@@map` table names — and `npx prisma validate` passes.
- `npx prisma migrate dev --name init` succeeds and produces a `prisma/migrations/<timestamp>_init/migration.sql` whose DDL creates `user_preferences` and `saved_locations` with the unique constraint and the index.
- `npx prisma generate` completes and the generated client resolves — a throwaway `import { PrismaClient } from '@prisma/client'` type-checks.
- `prisma/seed.ts` exists and `package.json` carries a `prisma.seed` hook, but no seed has been run (Phase 5 owns execution).
- `npm run build` stays green (no schema-driven type breakage introduced into the workspace).

---

## Scope guardrails (do NOT)

- **No schema change in Task 2-2.** Task 2-1 owns the schema authoring. If the schema needs a fix, return to Task 2-1, re-author, re-approve, and only then migrate.
- **No new dependencies.** The phase specifies none beyond the existing Prisma 6.x, `ts-node`, and generated client.
- **No `PrismaModule` / `PrismaService` / `UsersModule`.** Those are Phase 3 (Backend).
- **No service-layer invariant code** (auto-create-on-first-read, single-default-per-user, etc.) — Phase 3.
- **No seed execution in Phase 2.** `prisma/seed.ts` is authored and wired here but executed in Phase 5.
- **No `Decimal` → `number` boundary conversion.** That is Phase 3 (API-boundary concern).
- **No refactoring of Phase 0 / Phase 1 artifacts** unless the roadmap explicitly says so — STOP and ask.
