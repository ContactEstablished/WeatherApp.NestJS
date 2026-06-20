# Task 3-2 — App shell: health endpoint, global prefix, CORS, global ValidationPipe

## Surface
Backend cross-cutting wiring in `apps/api` only — a `HealthController` serving `GET /health`, and the
bootstrap configuration in `apps/api/src/main.ts`: the authoritative global prefix `api` **excluding**
the health route, CORS for the Angular dev origin, and the global `ValidationPipe`. Also registers the
health controller in `app.module.ts`. No weather/users logic, no schema or shared-types edits.

## Why
This task makes the API a contract-correct shell that every later endpoint slots into. RoadMap §0.2
requires endpoint #1 `GET /health` to live **outside** the `api` prefix while #2–#11 live under it
(§4 "Health route placement" gotcha), so the prefix and its exclusion must be set authoritatively here
— the Phase 0 scaffold left `main.ts` with a bare `app.setGlobalPrefix('api')` and no exclusion (Phase
0 handoff deviation #4 explicitly defers the authoritative prefix to Phase 3). It also installs the two
cross-cutting policies the rest of Phase 3 relies on: CORS allowing `http://localhost:4200` (§4 CORS/
ports gotcha — origins changed from the Vue/.NET 5173/5078 to Angular 4200 / Nest 3000) and the global
`ValidationPipe` that the Task 3-4 / 3-5 request-DTO classes are validated by. Doing this before the
feature modules means Tasks 3-3 through 3-5 add controllers that are automatically prefixed and
validated.

## Depends on
- **Task 3-1** (`docs/tasks/Tasks-3-1.md`): `class-validator` + `class-transformer` are installed (the
  global `ValidationPipe` needs them) and `ConfigModule` is global (the CORS origin is read from
  config). **Hard precondition** — without 3-1 the deps and config provider do not exist.
- **Roadmap Phase 3 — Backend (NestJS)** (`docs/RoadMap.md`, "### Phase 3"): the `HealthController →
  GET /health` scope bullet (returns `{ status: 'ok', service: 'nimbus-api', time: <ISO> }`, excluded
  from `api`), the "Cross-cutting wiring" bullet (global `ValidationPipe`; CORS `http://localhost:4200`;
  prefix `api` excluding `health`; keep camelCase — **no** snake/Pascal transformer), and the
  "Validation strictness" decision (`whitelist` + `forbidNonWhitelisted` + `transform`). Enumerated
  task-split item **2**.
- **Roadmap §0.2** (`docs/RoadMap.md` lines ~55–72): endpoint #1 `GET /health` → `{ status, service,
  time }`, and the note "`/health` is **not** under `/api`… set a global prefix `api` but **exclude**
  the health route."
- **Roadmap §4 — Risks/gotchas** (`docs/RoadMap.md` lines ~725–731): health-route placement, camelCase
  JSON (do not add a transformer), CORS/ports.
- **Phase 0 — Bootstrap — Handoff** (`docs/handoffs/Phase-0-Handoff.md`) deviation #4: `main.ts` ships
  the generated `app.setGlobalPrefix('api')`; Phase 3 owns the authoritative prefix + `/health`
  exclusion. The Angular dev server is port 4200; Nest listens on `process.env.PORT || 3000`.
- No ADRs exist in `docs/decisions/`.

## Required reading
- `apps/api/src/main.ts` — **Mirror:** the current bootstrap shape (`NestFactory.create(AppModule)`,
  `app.setGlobalPrefix('api')`, `app.listen(process.env.PORT || 3000)`). Replace the bare
  `setGlobalPrefix('api')` with the excluded form and add CORS + the global pipe; keep the listen/port
  logic.
- `apps/api/src/app/app.module.ts` — **Mirror:** register `HealthController` in `controllers`. (If you
  remove the placeholder `AppController`/`AppService`, ensure `app.controller.spec.ts` /
  `app.service.spec.ts` still pass or are removed with them — keep `npm test` green either way.)
- `apps/api/src/app/app.controller.ts` — **Mirror:** the `@Controller()` + `@Get()` shape for the new
  `HealthController`.
- `@nimbus/shared-types` (`libs/shared-types/src/index.ts`) — note there is **no** shared type for the
  health body; `{ status, service, time }` is endpoint #1 only and is typed locally/inline. Do **not**
  add it to shared-types (Phase 1 is read-only).
- `docs/handoffs/Phase-0-Handoff.md` — **Mirror:** deviation #4 (authoritative prefix is this task) and
  the 4200 / 3000 port split.
- `CLAUDE.md` — `npm run build` / `npm run lint` / `npm test`.

## Acceptance criteria
1. **`HealthController` created** (e.g. `apps/api/src/app/health/health.controller.ts`),
   `@Controller('health')` (or `@Controller()` with `@Get('health')`) returning exactly:
   ```ts
   { status: 'ok', service: 'nimbus-api', time: new Date().toISOString() }
   ```
   `status` is the literal `'ok'`, `service` is the literal `'nimbus-api'`, and `time` is a fresh ISO-8601
   timestamp (`Date.prototype.toISOString()`). Keys are camelCase as written.
2. **Global prefix `api` with `/health` excluded.** `main.ts` calls
   `app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] })` (or the
   equivalent `'health'` exclude form). Net behaviour:
   - `GET /health` → `200` with the body in (1).
   - `GET /api/health` → `404` (the health route is **not** double-prefixed).
   - feature routes added by later tasks resolve under `/api/...` (e.g. a probe of any not-yet-existent
     `/api/...` path is handled by the prefix, not by `/...`).
3. **CORS allows the Angular dev origin.** `app.enableCors({ origin: 'http://localhost:4200' })` (origin
   read from `ConfigService` with `http://localhost:4200` as the default). A request with
   `Origin: http://localhost:4200` receives an `Access-Control-Allow-Origin: http://localhost:4200`
   response header; the preflight `OPTIONS` for a mutating method succeeds.
4. **Global `ValidationPipe` registered** via `app.useGlobalPipes(new ValidationPipe({ whitelist: true,
   forbidNonWhitelisted: true, transform: true }))`. This is the pipe the Task 3-4 / 3-5 DTO classes are
   validated against; with no DTO controllers yet, the pipe is wired but exercised in later tasks.
5. **camelCase JSON preserved.** No `ClassSerializerInterceptor` naming strategy, no snake_case/
   PascalCase transformer, no global interceptor that rewrites keys is added (§4). The default JS
   camelCase serialization stands.
6. **App boots and serves.** `nx serve api` (or a `NestFactory` boot) starts on `process.env.PORT ||
   3000` and `GET http://localhost:3000/health` returns the (1) body; the startup log still reflects the
   running port.
7. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` all pass. Do not add
   new specs (testing is Phase 6).

## Out of scope (do NOT do these here)
- **`PrismaModule` / `ConfigModule` / dependency install** — **Task 3-1** (precondition).
- **`WeatherModule` (#2/#3), `UsersModule` (#4–#11)** — Tasks **3-3 / 3-4 / 3-5**. This task wires the
  shell those controllers register into; it adds no feature routes.
- **`CacheModule` / weather caching TTLs** — Task 3-3.
- **Any request-DTO classes** — Tasks 3-4 / 3-5 author the DTO classes; this task only installs the
  pipe that will validate them.
- **`Decimal`→`number` conversion** — Tasks 3-4 / 3-5.
- **Schema / shared-types edits** — Phases 2 / 1, read-only here.

## Approval gates / what NOT to run
- **No new dependency** — `@nestjs/common` (`ValidationPipe`), `class-validator`, and
  `class-transformer` were installed in Task 3-1; this task adds none. If a step seems to need a new
  package, STOP and ask.
- **No schema migration** — this task touches no Prisma artifact. If it seems to, STOP.
- **Do not introduce a key-renaming transformer** — camelCase is the contract; "fixing" serialization
  would break §0.2 fidelity.

## Files affected
- `apps/api/src/app/health/health.controller.ts` — created.
- `apps/api/src/main.ts` — modified (excluded global prefix, CORS, global `ValidationPipe`).
- `apps/api/src/app/app.module.ts` — modified (register `HealthController`; possibly drop the
  placeholder `AppController`/`AppService` + their specs).

## Suggested commit
```
feat(api): add /health endpoint and wire prefix, CORS, and ValidationPipe

Author HealthController serving GET /health -> { status: 'ok', service:
'nimbus-api', time: <ISO> } and set the authoritative bootstrap config in
main.ts:

- global prefix 'api' with /health excluded, so #1 sits outside /api and
  #2-#11 resolve under /api (RoadMap §0.2 / §4 health-route gotcha);
- CORS allowing http://localhost:4200 (origin from ConfigService);
- global ValidationPipe { whitelist, forbidNonWhitelisted, transform } for
  the Task 3-4/3-5 request DTOs.

camelCase JSON preserved (no key-renaming transformer added). App boots on
PORT||3000; GET /health returns the contract body. Feature modules are
Tasks 3-3..3-5. build/lint/test green.
```
