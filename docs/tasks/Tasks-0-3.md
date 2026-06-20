# Task 0-3 — Initialize Prisma (stub schema, no models)

## Surface
Database tooling only — installs Prisma into the workspace and runs `prisma init` to create the
`prisma/schema.prisma` stub and the Prisma CLI wiring. **No models are authored** (schema authoring per
§0.4 is Phase 2) and **no migration is run**. No app code, no contract types, no UI.

## Why
Later phases need Prisma to exist as a runnable tool with a schema file to land into: Phase 2 authors
the `UserPreference` / `SavedLocation` models in `prisma/schema.prisma` and runs `prisma migrate dev`,
and Phase 3's `PrismaService` extends the generated client. This task only stands up that scaffolding —
the `prisma/schema.prisma` stub (with the `postgresql` datasource and `prisma-client-js` generator) and
a runnable `npx prisma` — so Phase 2 has a place to write models and Phase 3 has a client to generate.
Doing only `prisma init` here keeps Phase 0 to "structure and configuration only".

## Depends on
- **Task 0-1** (`docs/tasks/Tasks-0-1.md`) — the Nx workspace and `package.json` must exist so
  `npm i -D prisma` / `npm i @prisma/client` install into the workspace. **Hard precondition.**
- **Roadmap Phase 0 — Bootstrap** (`docs/RoadMap.md`, "### Phase 0 — Bootstrap"): the "Initialize
  Prisma (no models)" scope bullet and the "`npx prisma` is runnable and `prisma/schema.prisma` exists
  (stub, no models)" success criterion. Note the explicit constraint: "**No models are authored here**".
- **Roadmap §0.4 — Data model** (`docs/RoadMap.md` lines ~158–208) — the target `schema.prisma` and
  models, shown here **only so the implementer knows what NOT to author yet**. These are Phase 2.
- **Roadmap Phase 2 — Database + Prisma** (`docs/RoadMap.md`, "### Phase 2") — the *consumer* of this
  stub. Do **not** implement Phase 2 here.
- **Enumerated task split** (`docs/RoadMap.md`, Phase 0 "Enumerated task split" item 3).
- **Relationship to Task 0-4:** `prisma init` writes a default `DATABASE_URL` line into `.env`. Task
  0-4 owns the authoritative `.env`/`.env.example` content (and gitignoring `.env`). Coordinate so the
  `DATABASE_URL` shape matches the `postgres:16` service Task 0-4 stands up — see acceptance criterion 4.
- No ADRs in `docs/decisions/` and no handoff in `docs/handoffs/` (both absent) — the roadmap is the
  only locked source.

## Precondition / blocker — VERIFY BEFORE STARTING
> **STOP and flag if Task 0-1 has not landed.** This task installs into the Task 0-1 `package.json`.
> If there is no Nx workspace yet, do not hand-scaffold one — flag the missing dependency and stop.

## Required reading
- `docs/RoadMap.md` — Phase 0 "Initialize Prisma (no models)" bullet and the matching success
  criterion. **Mirror:** run exactly `npm i -D prisma`, `npm i @prisma/client`, `npx prisma init`; author
  no models.
- `docs/RoadMap.md` — §0.4 "Data model" target schema. **Mirror nothing yet** — read it only to know
  the `UserPreference`/`SavedLocation` models are Phase 2 and must NOT be written here.
- `package.json` (from Task 0-1) — where `prisma` / `@prisma/client` get added. **Mirror:** match the
  existing dependency-style (npm).
- `.gitignore` (existing) — already ignores `.env`; relevant because `prisma init` touches `.env`.
- `CLAUDE.md` — the "Configuration" section (env config lives in dotenv files; secrets never committed)
  and the `npm run build`/`npm test`/`npm run lint` commands. **Mirror:** keep secrets out of committed
  files.

## Acceptance criteria
1. **Prisma installed.** `prisma` is in `package.json` `devDependencies` and `@prisma/client` is in
   `dependencies` (per the roadmap's `npm i -D prisma` / `npm i @prisma/client`). `package-lock.json`
   reflects both.
2. **`prisma init` ran.** `prisma/schema.prisma` exists at the repo root and contains exactly the stub
   `prisma init` produces, set to **PostgreSQL**:
   - a `generator client { provider = "prisma-client-js" }` block, and
   - a `datasource db { provider = "postgresql"  url = env("DATABASE_URL") }` block.
   If `prisma init` defaulted the datasource to a different provider, set it to `postgresql`
   (e.g. `npx prisma init --datasource-provider postgresql`).
3. **NO models authored.** `prisma/schema.prisma` contains **zero** `model` blocks — specifically not
   `UserPreference` and not `SavedLocation` (those are Phase 2). The file is the bare stub plus the
   datasource/generator only.
4. **NO migration run.** There is **no** `prisma/migrations/` directory and no migration has been
   applied. `prisma generate` is not required by this task (no models to generate from); if it is run
   it must not introduce models. Coordinate `DATABASE_URL` with Task 0-4 (which owns `.env`); do not
   commit a real secret-bearing `.env`.
5. **`npx prisma` is runnable.** `npx prisma --version` (or `npx prisma validate`) runs successfully
   and recognizes `prisma/schema.prisma`. `npx prisma validate` reports the stub schema as valid.
6. **Build/lint/test stay green.** `npm run build`, `npm run lint`, and `npm test` still pass — adding
   Prisma must not break the Task 0-1 baseline. Do not add new specs (testing is Phase 6).

## What NOT to modify
- Do **not** author any Prisma model (`UserPreference`, `SavedLocation`, or any other) — that is
  **Phase 2**, and **schema migrations require approval before apply** per the roadmap. If a step seems
  to need a model, STOP and ask.
- Do **not** run `prisma migrate dev` / `prisma migrate deploy` or create `prisma/migrations/` — Phase 2.
- Do **not** create a `PrismaService` / `PrismaModule` or wire Prisma into Nest — Phase 3.
- Do **not** author the authoritative `.env` / `.env.example` content here — Task 0-4 owns it. Only the
  `DATABASE_URL` line that `prisma init` writes is in scope, and it must not carry a real secret.
- Do **not** add `docker-compose.yml` — Task 0-4.
- **No additional new dependency** beyond `prisma` and `@prisma/client`. If a step seems to need
  another, STOP and ask.

## Suggested commit
```
chore(prisma): initialize Prisma with a stub PostgreSQL schema

Install prisma (dev) + @prisma/client and run prisma init to create the
prisma/schema.prisma stub with the postgresql datasource and
prisma-client-js generator. npx prisma is runnable; the schema validates.

No models authored and no migration run — schema authoring per RoadMap
§0.4 and prisma migrate are Phase 2.
```
