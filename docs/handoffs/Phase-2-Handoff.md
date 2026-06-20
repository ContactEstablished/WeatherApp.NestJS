# Phase 2 — Database + Prisma — Handoff

**Status:** Complete. Both tasks committed on `main`:

| Task | Commit | Summary |
|------|--------|---------|
| 2-1 | `f78f462` | Two §0.4 models authored in `prisma/schema.prisma`; `prisma/seed.ts` stub + `package.json` `prisma.seed` hook |
| 2-2 | `84bf29a` | Initial `init` migration created + applied; Prisma Client generated |

`npm run build` / `npm run lint` / `npm test` are green; `npx prisma migrate status` reports **1 migration applied, no drift**.

---

## What was delivered

The Phase 0 Prisma stub is now the project's persistence schema, migrated into local Postgres, with a resolvable generated client. This phase authored **schema, migration, generated client, and a seed stub** — no NestJS providers, no service-layer logic (those are Phase 3).

**Schema — `prisma/schema.prisma` (Task 2-1):**
- `UserPreference` → `@@map("user_preferences")`: `userId` `@id @db.VarChar(120)`, `unitSystem @default("imperial") @db.VarChar(16)`, `createdUtc @default(now())`, `updatedUtc @updatedAt`.
- `SavedLocation` → `@@map("saved_locations")`: `id @id @default(autoincrement())`, `userId`/`name`/`region`/`country` as `@db.VarChar`, `latitude`/`longitude` `@db.Decimal(9, 6)`, `isDefault @default(false)`, `sortOrder @default(0)`, `createdUtc @default(now())`, plus `@@unique([userId, name, region])` and `@@index([userId, sortOrder])`.
- The Phase 0 `generator client { provider = "prisma-client-js" }` and `datasource db { provider = "postgresql"  url = env("DATABASE_URL") }` blocks were left untouched.

**Migration — `prisma/migrations/20260620144720_init/migration.sql` (Task 2-2):**
- `CREATE TABLE "user_preferences"` (PK `user_preferences_pkey` on `userId`).
- `CREATE TABLE "saved_locations"` (`id SERIAL`, PK `saved_locations_pkey`).
- `CREATE INDEX "saved_locations_userId_sortOrder_idx"` and `CREATE UNIQUE INDEX "saved_locations_userId_name_region_key"`.
- `prisma/migrations/migration_lock.toml` locks the provider to `postgresql`.

**Generated client:**
- Prisma Client **6.19.3** generated via `npx prisma generate` (classic `prisma-client-js` generator → `node_modules/.prisma/client`, re-exported through `@prisma/client`).
- `import { PrismaClient } from '@prisma/client'` type-checks, and the `prisma.userPreference` / `prisma.savedLocation` model accessors are present and typed.

**Seed stub + hook (authored, not run):**
- `prisma/seed.ts` — minimal stub with an empty `main()` and a commented-out `anonymous` `UserPreference` upsert; instantiates `PrismaClient` and `$disconnect()`s in `finally`.
- `package.json` → `"prisma": { "seed": "ts-node prisma/seed.ts" }`, reusing the existing `ts-node@10.9.1` devDependency. **The seed has not been run** — Phase 5 owns execution.

---

## Deviations / constraints carried forward (important for later phases)

These extend the Phase 0 handoff's Prisma notes; nothing in the locked Phase 2 decisions (single `init` migration, `prisma generate` run in-phase, seed authored-not-run) was changed.

1. **Prisma 6.x + classic `prisma-client-js` generator.** Per the Phase 0 handoff, Prisma is pinned to `prisma@^6` / `@prisma/client@^6` (resolved **6.19.3**) on the **classic** generator. The client generates into `node_modules/.prisma/client` and surfaces at `@prisma/client`, so the roadmap's `import { PrismaClient } from '@prisma/client'` works as-is. Phase 3 must **not** switch to the Prisma 7 `prisma-client` generator (which would change the import path to a `generated/` output dir and reintroduce a `prisma.config.ts`).
2. **No `prisma.config.ts`.** Prisma config stays driven by the `schema.prisma` `datasource`/`generator` blocks and the `package.json` `prisma.seed` hook. There is no `prisma.config.ts` (the Phase 0 handoff removed the one `init` generated). The `prisma.seed` hook in `package.json` is the canonical seed-runner config.
3. **Prisma 7 deprecation warning is informational only.** Running `prisma` commands on 6.19.x may emit a deprecation notice about the `package.json` `prisma` key / the classic generator moving in Prisma 7. This is **expected and harmless on 6.x** — do not "fix" it by migrating to the new generator or a `prisma.config.ts`; that would break the `@prisma/client` import path Phase 3 depends on. Revisit only as a deliberate, approval-gated Prisma 7 upgrade.
4. **`createdUtc`/`updatedUtc` are `TIMESTAMP(3)` (no timezone).** The migration emits `TIMESTAMP(3)` columns (`updatedUtc` driven by Prisma's `@updatedAt`, `createdUtc` by `DEFAULT CURRENT_TIMESTAMP`). The §0.4 contract does not expose these timestamps in the API response shape, so no boundary handling is required — they are persistence-only bookkeeping.

---

## For downstream phases

- **Phase 3 (Backend) — what it can now rely on:**
  - The generated client at **`@prisma/client`** — `PrismaService` should `extends PrismaClient` and connect in `onModuleInit`. The import resolves today; no generate step is needed before Phase 3 starts (re-run `npx prisma generate` only after a future schema change).
  - The **`PrismaClient`** type and the two model accessors **`prisma.userPreference`** and **`prisma.savedLocation`** are typed and ready to query.
  - The DB-layer guarantees backing the §0.4 invariants: `@@unique([userId, name, region])` (duplicate insert/update fails at the DB) and `@@index([userId, sortOrder])` (cheap ordered reads). The **enforcement logic** (auto-create-on-first-read, single-default-per-user, contiguous `sortOrder` on reorder) is Phase 3 service code — the schema only backs it.
  - **`Decimal` → `number` boundary conversion:** `latitude`/`longitude` come back from Prisma as `Decimal` objects (`@db.Decimal(9, 6)`). Phase 3 must convert them to JSON `number` at the API boundary so responses match the `LocationSuggestion` contract (§4 gotcha).
  - Phase 3 must **not** modify `prisma/schema.prisma` or `prisma/migrations/` — any schema change is a new, approval-gated Phase 2-style migration.
- **Phase 5 (Dev workflow):** the seed is wired (`npm exec prisma db seed` / `prisma db seed` runs `ts-node prisma/seed.ts`) but **has never been run**. Phase 5 owns running it as part of local-DB setup; flesh out the commented `anonymous` row there if a known starting state is wanted.
- **Phase 6 (Testing):** the `PreferenceService` integration tests run against a disposable Postgres (Testcontainers / dedicated test DB) and will apply this same `init` migration; the `@@unique` and single-default behaviors are the high-value cases to cover.
- **No new runtime dependencies were added** in Phase 2 — `@prisma/client@^6.19.3` was already present from Phase 0; only the `package.json` `prisma.seed` hook (reusing `ts-node`) was added.
