# Task 2-2 — Create the initial migration and generate the client

## Surface
Database migration + client generation only — runs `npx prisma migrate dev --name init` (creating
`prisma/migrations/<timestamp>_init/migration.sql` and applying it to the local Postgres) and then
`npx prisma generate`. No schema authoring (Task 2-1 owns `schema.prisma`), no seed execution, and no
NestJS code.

## Why
Task 2-1 authored and statically validated the §0.4 schema. This task realizes it: it generates the
initial migration (the SQL DDL that creates `user_preferences` and `saved_locations` with their unique
constraint and index), applies it to the local Postgres, and regenerates the typed Prisma client so it
exists on disk before Phase 3's `PrismaService` imports `@prisma/client`. Running `prisma generate`
explicitly right after `migrate dev` (which already triggers a generate) makes the dependency order
unambiguous and survives a `migrate` that skips generation. This is the **post-gate** half of Phase 2:
it mutates the database, so it must not begin until the Task 2-1 schema diff is approved.

## Depends on
- **Task 2-1** (`docs/tasks/Tasks-2-1.md`): the authored, `prisma validate`-passing `schema.prisma`
  this task migrates. **Hard precondition** — do not run `migrate dev` against an unauthored or
  unapproved schema.
- **Roadmap Phase 2 — Database + Prisma** (`docs/RoadMap.md`, "### Phase 2"): the "Create the initial
  migration" and "Generate the Prisma client" scope bullets, the "Single `init` migration" and
  "`prisma generate` placement" decisions, and the "schema migration is an approval gate" constraint.
  Enumerated task split item 2.
- **Roadmap §0.4** (`docs/RoadMap.md` lines ~158–208): the schema whose DDL the migration must produce
  (`user_preferences`, `saved_locations`, the `(userId, name, region)` unique constraint, the
  `(userId, sortOrder)` index).
- **Phase 0 — Bootstrap — Handoff** (`docs/handoffs/Phase-0-Handoff.md`): the `docker-compose.yml` `db`
  service is `postgres:16` (creds nimbus/nimbus/nimbus, port 5432, healthcheck); `docker compose up -d`
  was smoke-tested healthy in ~15s. Deviation #3: the **classic `prisma-client-js`** generator emits to
  `node_modules/.prisma/client`, so `import { PrismaClient } from '@prisma/client'` resolves as the
  roadmap assumes.
- **Phase 1 — Shared contract — Handoff** (`docs/handoffs/Phase-1-Handoff.md`): the generated client
  is the persistence layer; do not couple it to `@nimbus/shared-types` here.
- No ADRs exist in `docs/decisions/` — the roadmap is the only locked source.

## Pre-conditions — VERIFY BEFORE STARTING
> **STOP and confirm all three before running any command that touches the database.**
>
> 1. **Schema approved (mandatory gate).** The Task 2-1 `prisma/schema.prisma` diff has been **reviewed
>    and signed off by a human**. §0: "schema migrations require approval before apply." `prisma migrate
>    dev` creates a migration **and mutates the database** — it must not run before approval. If
>    approval has not been given, STOP.
> 2. **Local Postgres is up.** `docker compose up -d` has brought up the `db` (`postgres:16`) service
>    and it is healthy (`docker compose ps` shows healthy / `pg_isready` accepts connections). `migrate
>    dev` needs a live database.
> 3. **`DATABASE_URL` is set.** A local `.env` exists (copied from `.env.example`) with
>    `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public` (matching the
>    docker-compose `db` creds). `.env` is gitignored and must not be committed.

## Required reading
- `prisma/schema.prisma` (Task 2-1 output) — **Mirror:** migrate exactly this schema; do not edit it in
  this task (if it needs a change, that is a Task 2-1 re-author + re-approval, not a fix here).
- `docs/RoadMap.md` Phase 2 "Decisions needed" — **Mirror:** one `--name init` migration (do not split
  into two EF-style migrations); run `prisma generate` explicitly after `migrate dev`.
- `docs/handoffs/Phase-0-Handoff.md` — **Mirror:** bring up the existing `docker-compose.yml` `db`
  service; rely on the classic `prisma-client-js` client output (`node_modules/.prisma/client`).
- `docker-compose.yml` (root) — **Mirror:** the `db` service to start before migrating.
- `.env.example` — **Mirror:** the `DATABASE_URL` shape to put in the local `.env`.
- `CLAUDE.md` — the `npm run build` / `npm test` / `npm run lint` commands and the "secrets never
  committed" rule.

## Acceptance criteria
1. **Migration generated and applied.** Running `npx prisma migrate dev --name init` (after approval,
   with Postgres up) succeeds and creates exactly one migration directory
   `prisma/migrations/<timestamp>_init/` containing `migration.sql`, plus
   `prisma/migrations/migration_lock.toml` (provider = `postgresql`). There is **one** migration (named
   `init`), not two.
2. **Migration DDL creates both tables with the right shape.** `prisma/migrations/<timestamp>_init/migration.sql`:
   - creates table `user_preferences` with columns `userId` (PK, `VARCHAR(120)`), `unitSystem`
     (`VARCHAR(16)`, default `'imperial'`), `createdUtc` (timestamp, default now), `updatedUtc`
     (timestamp);
   - creates table `saved_locations` with columns `id` (PK, identity/serial), `userId` `VARCHAR(120)`,
     `name` `VARCHAR(160)`, `region` `VARCHAR(160)`, `country` `VARCHAR(80)`, `latitude`/`longitude`
     `DECIMAL(9,6)`, `isDefault` boolean default false, `sortOrder` integer default 0, `createdUtc`
     timestamp default now;
   - creates a **unique** constraint/index over `(userId, name, region)` on `saved_locations`;
   - creates a (non-unique) **index** over `(userId, sortOrder)` on `saved_locations`.
   (Exact Postgres DDL spelling — `CREATE UNIQUE INDEX` vs `UNIQUE` constraint, `SERIAL` vs
   `GENERATED ... AS IDENTITY` — is whatever Prisma 6 emits; the requirement is that the unique
   `(userId, name, region)` and the index `(userId, sortOrder)` both appear and the table/column names
   match the `@@map`/field spec above.)
3. **Migration status is clean.** `npx prisma migrate status` reports the database schema is up to date
   with one applied migration and no drift.
4. **Client generated and resolvable.** `npx prisma generate` completes, and a throwaway
   `import { PrismaClient } from '@prisma/client'` type-checks and instantiates. A scratch verification
   (e.g. a temporary `.ts` that imports `PrismaClient` and references `prisma.userPreference` /
   `prisma.savedLocation`) compiles; **remove any scratch file before commit** (no new specs — testing
   is Phase 6).
5. **No schema edits in this task.** `prisma/schema.prisma` is byte-identical to the Task 2-1 / approved
   version (this task migrates it, it does not change it).
6. **Build / lint / test stay green.** `npm run build`, `npm run lint`, and `npm test` pass — generating
   the client must not introduce type breakage into the workspace.
7. **Seed not run.** No `prisma db seed` / `ts-node prisma/seed.ts` was executed; the database contains
   only the migration's schema (and at most whatever a manual check inserted, which must be cleaned up).
   Seed execution is Phase 5.

## Out of scope (deferred)
- **Editing `schema.prisma`** — Task 2-1 (re-author + re-approve if the schema is wrong; do not patch
  it inside the migration step).
- **Running the seed** (`prisma db seed`) — **Phase 5**.
- **`PrismaModule` / `PrismaService` / `UsersModule`** and all §0.4 service-layer invariants — **Phase 3**.
- **`Decimal` → `number` boundary conversion** for `LocationSuggestion` — **Phase 3**.
- **`prisma migrate deploy` / production migration / CI** — Phase 7. This task uses `migrate dev`
  against local Postgres only.

## Approval gates
- **Mandatory: `prisma migrate dev` requires human approval of the Task 2-1 schema diff before it is
  run.** §0: "schema migrations require approval before apply." This task creates and applies a
  migration that mutates the database — **do not run it unattended**. Confirm sign-off (pre-condition 1)
  first; if absent, STOP.
- **No new dependency** — `migrate dev` and `generate` use the already-installed `prisma` /
  `@prisma/client` (6.x). If a step seems to need a new package or a schema change, STOP and ask.

## Files affected
- `prisma/migrations/<timestamp>_init/migration.sql` — created (the initial DDL).
- `prisma/migrations/migration_lock.toml` — created (provider lock).
- Generated Prisma client under `node_modules/.prisma/client` (build artifact; not committed).
- `prisma/schema.prisma`, `prisma/seed.ts`, `package.json` — **not modified** by this task.

## Suggested commit
```
feat(prisma): add initial migration creating user_preferences + saved_locations

Run prisma migrate dev --name init against local Postgres (after schema
approval) to create the single initial migration: DDL for user_preferences
and saved_locations, including the unique (userId, name, region) constraint
and the (userId, sortOrder) index. Run prisma generate so the typed client
resolves for Phase 3's PrismaService.

One init migration (not split). Seed authored in Task 2-1 but not run
(Phase 5). No NestJS providers and no Decimal->number boundary — those are
Phase 3.
```
