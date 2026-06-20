# Task 3-1 — PrismaModule + ConfigModule + backend dependency install

## Surface
Backend foundation in `apps/api` only — the global `PrismaModule`/`PrismaService`, the global
`ConfigModule` (typed env access), their registration in `apps/api/src/app/app.module.ts`, and the
**one-time install** of the Phase 3 backend runtime dependencies into the root `package.json`. No
controllers, no weather/users logic, no `main.ts` cross-cutting wiring (that is Task 3-2), and no
schema or shared-types edits.

## Why
Phase 3 builds the whole NestJS API, but every later Task 3-x needs two things in place first: a
single injectable DB access point (`PrismaService`, extending the Phase 2 generated `PrismaClient`)
and typed env access (`ConfigService`) for the OpenWeather key/base URL, the CORS origin, and the
mock-fallback flag. It also needs the runtime packages (`@nestjs/config`, `@nestjs/cache-manager` +
`cache-manager`, `class-validator`, `class-transformer`, and the HTTP approach) actually installed —
none of them are present yet (`apps/api`'s only runtime deps are `@nestjs/*` core,
`@prisma/client`, `reflect-metadata`, `rxjs`). This task is the explicit **dependency-approval gate**
for the phase: it presents and installs the full dependency set once, so Tasks 3-2 through 3-5 can
assume the packages and the two global providers already exist.

## Depends on
- **Roadmap Phase 3 — Backend (NestJS)** (`docs/RoadMap.md`, "### Phase 3"): the `PrismaModule →
  PrismaService` and `ConfigModule (@nestjs/config)` scope bullets, the "Add the backend runtime
  dependencies" bullet, the "new dependencies require approval before install" constraint, and the
  HTTP-client / caching-backend "Decisions needed". Enumerated task-split item **1**.
- **Phase 2 — Database + Prisma — Handoff** (`docs/handoffs/Phase-2-Handoff.md`): the generated client
  resolves at **`@prisma/client`** (classic `prisma-client-js`, Prisma 6.19.3 → `node_modules/.prisma/
  client`); `PrismaService` should `extends PrismaClient` and connect in `onModuleInit`. **Do not**
  switch to the Prisma 7 `prisma-client` generator (it would change the import path).
- **Phase 0 — Bootstrap — Handoff** (`docs/handoffs/Phase-0-Handoff.md`): the classic, project.json-based
  integrated Nx workspace (Node 22.14, Nest 11); generate code accordingly. The `api` app listens on
  `process.env.PORT || 3000`.
- No ADRs exist in `docs/decisions/` — the roadmap is the only locked source. (Per the roadmap's
  Decisions note, the HTTP-client choice / caching backend / dependency set are the natural ADR
  candidates; if ADRs are introduced, record them here before install.)

## Required reading
- `apps/api/src/app/app.module.ts` — **Mirror:** the current `@Module({ imports: [], controllers:
  [AppController], providers: [AppService] })` shape; add `ConfigModule.forRoot({...})` and
  `PrismaModule` to `imports`. Keep the existing `AppController`/`AppService` for now (Task 3-2 owns the
  health endpoint; do not delete them in this task).
- `apps/api/project.json` — **Mirror:** the `build` target is `webpack-cli build` (cwd `apps/api`),
  `lint` is `@nx/eslint:lint`, `test` is `@nx/jest:jest` with `passWithNoTests: true`. New deps must
  not break the webpack build.
- `package.json` (root) — **Mirror:** existing dependency layout. `@prisma/client@^6.19.3` is already a
  runtime dep; `ts-node@10.9.1` and `reflect-metadata` are present. Add the new packages here.
- `.env.example` — **Mirror:** the three documented vars (`DATABASE_URL`,
  `OPENWEATHER_API_KEY` (blank = mock), `PORT=3000`). `ConfigModule` reads these. If config needs an
  OpenWeather **base URL** or an explicit mock flag, add documented entries here (with sensible
  defaults so the app still boots with the file as-is) — do not require new mandatory secrets.
- `docs/handoffs/Phase-2-Handoff.md` — **Mirror:** `PrismaService extends PrismaClient`, connect in
  `onModuleInit`; `prisma.userPreference` / `prisma.savedLocation` accessors are typed and ready.
- `CLAUDE.md` — project conventions and the `npm run build` / `npm run lint` / `npm test` commands.

## Acceptance criteria
1. **Dependencies installed (approval-gated — see "Approval gates").** After sign-off, install the
   agreed runtime set into the root `package.json` `dependencies`:
   - `@nestjs/config`
   - `@nestjs/cache-manager` + `cache-manager`
   - `class-validator` + `class-transformer`
   - the chosen HTTP approach: **native `fetch`** (Node 22 global — **no package**, the roadmap's
     recommendation) **or** `@nestjs/axios` + `axios` if interceptor ergonomics are wanted. Record which
     was chosen in the commit body. No other runtime packages are added.
   The versions must satisfy the Nest 11 peer ranges; `npm install` completes with no peer-dependency
   errors.
2. **`PrismaService` created** at `apps/api/src/app/prisma/prisma.service.ts`: an `@Injectable()` class
   that `extends PrismaClient` (imported from `@prisma/client`) and implements `OnModuleInit` (calling
   `this.$connect()`). It exposes the typed `userPreference` and `savedLocation` accessors by
   inheritance. Graceful shutdown: either implement `OnModuleDestroy` calling `this.$disconnect()` **or**
   register `app.enableShutdownHooks()` — the chosen mechanism must close the connection on shutdown.
3. **`PrismaModule` created** at `apps/api/src/app/prisma/prisma.module.ts`: marked `@Global()`,
   `providers: [PrismaService]`, `exports: [PrismaService]`, so any feature module can inject
   `PrismaService` without re-importing the module.
4. **`ConfigModule` registered globally.** `app.module.ts` imports `ConfigModule.forRoot({ isGlobal:
   true })` (loading the root `.env`). A small typed accessor is acceptable but not required; providers
   must obtain the OpenWeather API key, the OpenWeather base URL, the DB URL, the CORS origin, and the
   "use mock when key missing" flag through `ConfigService` (or a thin typed wrapper), **not** by
   reading `process.env` directly in feature code.
5. **App boots and injects both.** A `NestFactory.create(AppModule)` boot succeeds with the new modules
   wired; injecting `PrismaService` and `ConfigService` resolves (no Nest DI resolution errors). With no
   `OPENWEATHER_API_KEY` set, boot must not throw — config access must tolerate a blank/absent key (the
   mock-fallback path is Task 3-3, but the **config layer** must already report the key as absent rather
   than crash).
6. **No `main.ts` cross-cutting changes.** `apps/api/src/main.ts` is unchanged in this task (global
   prefix, CORS, `ValidationPipe`, and the `/health` exclusion are **Task 3-2**).
7. **Build / lint / test stay green.** `npm run build`, `npm run lint`, and `npm test` all pass across
   the workspace. Do not add new specs (testing is Phase 6); `passWithNoTests` keeps `api` green.

## Out of scope (do NOT do these here)
- **`HealthController`, the authoritative global prefix, `/health` exclusion, CORS, the global
  `ValidationPipe`** — all **Task 3-2** (`main.ts` wiring).
- **`WeatherModule` / `OpenWeatherService` / `MockWeatherService` / caching TTLs** — **Task 3-3**. This
  task installs `@nestjs/cache-manager` but does **not** configure a `CacheModule` or any TTL.
- **`UsersModule` / `PreferenceService` / request-DTO classes / `Decimal`→`number` conversion** —
  Tasks **3-4 / 3-5**.
- **Editing `prisma/schema.prisma` or `prisma/migrations/`** — Phase 2, approval-gated. This task
  consumes the generated client read-only; **do not run `prisma migrate`**.
- **Editing `libs/shared-types`** — Phase 1, consumed read-only via `@nimbus/shared-types`.
- **Running the Prisma seed / `nx serve` dev wiring** — Phase 5.

## Approval gates / what NOT to run
- **MANDATORY — new dependencies require approval before install.** The roadmap marks the dependency
  set as a cross-cutting change: "present the dependency list for approval before running the install."
  **Present the exact package list (with the HTTP-client decision resolved) and STOP for human sign-off
  before running `npm install`.** Do not install unattended.
- **No schema migration / no new dependency beyond the approved list** — if a step seems to need a
  package not on the approved list, or a schema change, STOP and ask.
- **Do not run `prisma migrate dev` / `prisma generate`** — the Phase 2 client already resolves; regen
  only after a future approved schema change.

## Files affected
- `package.json` (root) — modified (add the approved runtime deps; lockfile updated by install).
- `apps/api/src/app/prisma/prisma.service.ts` — created.
- `apps/api/src/app/prisma/prisma.module.ts` — created.
- `apps/api/src/app/app.module.ts` — modified (import `ConfigModule.forRoot` + `PrismaModule`).
- `.env.example` — modified only if a documented OpenWeather base URL / mock flag is added (with safe
  defaults; no new mandatory secret).

## Suggested commit
```
feat(api): add global PrismaModule + ConfigModule and Phase 3 backend deps

Install the approved Phase 3 runtime dependencies (@nestjs/config,
@nestjs/cache-manager + cache-manager, class-validator, class-transformer;
HTTP via <native fetch | @nestjs/axios>) and stand up the backend
foundation the rest of Phase 3 builds on:

- PrismaService extends the Phase 2 PrismaClient (@prisma/client) and
  connects in onModuleInit, disconnecting on shutdown; exposed via a
  @Global() PrismaModule so any feature module can inject it.
- ConfigModule.forRoot({ isGlobal: true }) provides typed env access for
  the OpenWeather key/base URL, DB URL, CORS origin, and mock-fallback
  flag; feature code reads ConfigService, not process.env.

App boots and injects both with no OPENWEATHER_API_KEY set. main.ts
cross-cutting wiring (prefix, CORS, ValidationPipe, /health) is Task 3-2.
Dependency set installed only after approval. build/lint/test green.
```
