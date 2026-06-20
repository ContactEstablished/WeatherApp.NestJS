# Execution Prompt — Phase 3: Backend (NestJS)

Paste into a fresh session rooted at the repo root. Run only after Phase 0 (Bootstrap), Phase 1 (Shared contract), and Phase 2 (Database + Prisma) are complete.

---

You are the lead full-stack engineer for the WeatherApp.NestJS project, working across an Angular front end, a NestJS/Node.js API, and a PostgreSQL database. You design, implement, test, and validate the work directly, following the repo's existing conventions and keeping type safety, clear contracts between the API and the client, and database integrity in mind.

---

## Session-start checklist

Before writing any code:

1. **Tree is clean.** `git status` shows no uncommitted changes.
2. **Build / lint / test pass.** Run `npm run build`, `npm run lint`, and `npm test`. All pass.
3. **Phase 0 is complete.** `apps/web` and `apps/api` exist and the Nx workspace builds cleanly.
4. **Phase 1 is complete.** `libs/shared-types` exports all thirteen types (`@nimbus/shared-types` resolves cleanly from both apps).
5. **Phase 2 is complete.** Prisma schema is authored, the initial migration exists and is applied (postgres up, schema migrated, `npx prisma migrate status` reports 1 applied), and `import { PrismaClient } from '@prisma/client'` resolves. Both models (`UserPreference`, `SavedLocation`) are accessible via `prisma.userPreference` and `prisma.savedLocation`.
6. **Local Postgres is available and migrated.** `docker compose up -d` brings up the `db` service; `docker compose ps` shows it healthy; `npx prisma migrate status` reports the schema is current with no drift.
7. **`.env` is set.** A local `.env` exists with `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public` matching the docker-compose `db` service creds; `OPENWEATHER_API_KEY` may be blank (the app falls back to mock data); `PORT=3000`.

---

## Required reading, in order, before any code

1. **`docs/RoadMap.md` § Phase 3 — Backend (NestJS)** (lines ~525–667): the goal, scope, decisions, and success criteria for the entire phase. Read the "Constraint — backend only" and "Constraint — new dependencies require approval" blocks carefully. The task split at the end lists the five tasks in order.
2. **`docs/RoadMap.md` § 0.2 REST contract** (lines ~55–72): the authoritative 11-endpoint spec with paths, params, JSON shapes, and status codes Phase 3 must reproduce exactly.
3. **`docs/RoadMap.md` § 0.3 Data contract** (lines ~74–156): the `WeatherDashboard` and related response interfaces Phase 1 lifted into `@nimbus/shared-types`; this phase returns these exact shapes.
4. **`docs/RoadMap.md` § 0.4 Data model** (lines ~158–208): the two Prisma models (schema is Phase 2, but this section documents the invariants Phase 3 service code enforces).
5. **`docs/RoadMap.md` § 4 — Risks / gotchas** (lines ~725–731): health-route placement, camelCase JSON, Decimal→number conversion, the two high-risk invariants, and CORS/ports.
6. **`docs/handoffs/Phase-2-Handoff.md`** — what Phase 2 delivered; the generated client is ready at `@prisma/client`; no new schema changes are allowed.
7. **Task docs, one per task** — read in order as you start each:
   - `docs/tasks/Tasks-3-1.md` — PrismaModule + ConfigModule + backend dependencies (approval gate for new deps).
   - `docs/tasks/Tasks-3-2.md` — Health endpoint, global prefix, CORS, ValidationPipe.
   - `docs/tasks/Tasks-3-3.md` — WeatherModule (endpoints #2, #3), OpenWeather, mock, caching.
   - `docs/tasks/Tasks-3-4.md` — UsersModule preferences (endpoints #4, #5), PreferenceService, auto-create invariant.
   - `docs/tasks/Tasks-3-5.md` — UsersModule saved locations (endpoints #6–#11), CRUD, reorder, set-default, Decimal→number.
8. **`docs/handoffs/Phase-0-Handoff.md`** — the Nx workspace structure, port assignments (web 4200, api 3000), Node version, Nest scaffold shape.
9. **`CLAUDE.md`** — project conventions and the build/test/lint commands.

---

## Important context — Phase 3 scope and constraints

**What Phase 3 owns (the entire NestJS API):**
- The global `PrismaModule`/`PrismaService` (DB access point for all other modules).
- The global `ConfigModule` (typed env access).
- The `HealthController` endpoint (`GET /health`).
- The `WeatherModule` (endpoints #2–#3: dashboard, location search; OpenWeather primary + mock fallback, caching).
- The `UsersModule` (endpoints #4–#11: preferences get/put, saved-location list/create/update/delete/set-default/reorder).
- Cross-cutting wiring: the `api` global prefix (excluding `/health`), CORS for `http://localhost:4200`, the global `ValidationPipe`, camelCase JSON.
- Five task phases, split to isolate dependencies and dependencies and allow parallel review.

**What Phase 3 does NOT own:**
- Schema or migrations (Phase 2, already migrated, read-only from here).
- Shared-types edits (Phase 1, consumed read-only).
- Frontend code (Phase 4).
- Seed execution (Phase 5).
- Integration tests (Phase 6).

**Critical constraints:**
- **New dependencies require approval before install.** The roadmap lists a specific set: `@nestjs/config`, `@nestjs/cache-manager` + `cache-manager`, `class-validator`, `class-transformer`, plus either native `fetch` (Node 22 global, **no package**) or `@nestjs/axios` + `axios` (if interceptor ergonomics are wanted). **Do not install anything else.** Present the list for approval, STOP for sign-off, then install.
- **Contract fidelity is non-negotiable.** All 11 endpoints must reproduce §0.2 exactly: paths, params, JSON shapes, status codes (`204 No Content` on the mutating location endpoints). The `/health` endpoint must sit **outside** the `api` prefix.
- **The two high-risk invariants** (§4 gotcha): single default per user (setting a default atomically clears it on the others) and contiguous `sortOrder` on reorder (rewrite to 0, 1, 2, …). Port them carefully; they are the Phase 6 test focus.
- **No schema changes.** Phase 2 locked the schema (both models, both constraints, both indexes). Phase 3 is read-only on `prisma/schema.prisma` and `prisma/migrations/`. If a task seems to need a new column/index, STOP and ask — that is a new approval-gated Phase 2-style migration.
- **Decimal→number boundary conversion.** Prisma returns `Decimal` objects for `@db.Decimal(9, 6)` lat/lon. Convert them to JSON `number` at the API boundary (endpoint #6 response, not in the DB layer) so responses match the `LocationSuggestion` contract.
- **No key-renaming transformer.** camelCase is the contract default in JavaScript; do not introduce a `ClassSerializerInterceptor` or snake_case/PascalCase transformer that would break fidelity.

---

## Mission

Deliver Phase 3 — Backend (NestJS) end to end: stand up the global foundation (`PrismaModule`, `ConfigModule`, backend dependencies), wire the cross-cutting shell (health, prefix, CORS, ValidationPipe), and implement all five feature tasks to fulfill the complete §0.2 11-endpoint REST contract with the §0.4 invariants and camelCase JSON. The phase is split into five tasks for independent review and shipping.

### Step 0 — Lock the "Decisions needed" from the RoadMap entry into the task specs

Before coding any task, read the roadmap Phase 3 "Decisions needed" section (lines ~593–612) and the roadmap "Decisions needed" blocks in the task docs (e.g., Tasks-3-1.md, Tasks-3-3.md). Lock these decisions:

1. **HTTP client for OpenWeather calls** — native `fetch` (Node 22 global, **no package**, recommended) **or** `@nestjs/axios` + `axios` (for interceptor ergonomics, if wanted). Record which one you choose.
2. **Caching backend** — `@nestjs/cache-manager` with the **in-memory** store (mirrors the .NET `IMemoryCache`). TTLs are fixed by §0/§4: 10 min for weather keyed by `location + unitSystem`, 6 hr for geocoding keyed by query.
3. **Validation pipe options** — enable `whitelist`, `forbidNonWhitelisted`, and `transform` so request bodies are coerced to DTO classes and unknown fields are rejected.
4. **DTO ↔ shared-types binding** — request DTO **classes** in `apps/api` `implements` the `@nimbus/shared-types` request interfaces (`SaveLocationRequest`, etc.) and add only `class-validator` decorators — no field redeclaration.

Lock these and **proceed to the tasks**.

### Step 1 — Install approved backend dependencies (Task 3-1)

**Read:** `docs/tasks/Tasks-3-1.md` (all sections).

**Scope:** Present the Phase 3 runtime dependency set for approval, STOP for human sign-off, then install into `package.json`:
- `@nestjs/config`
- `@nestjs/cache-manager` + `cache-manager`
- `class-validator` + `class-transformer`
- HTTP approach: **native `fetch`** (no package, Node 22 global) or **`@nestjs/axios` + `axios`** (your choice from Step 0, recorded in commit body).

**Execute (after approval):**

1. Create the global `PrismaModule` at `apps/api/src/app/prisma/prisma.module.ts`:
   - Mark it `@Global()`, `@Module({ providers: [PrismaService], exports: [PrismaService] })`.

2. Create the global `PrismaService` at `apps/api/src/app/prisma/prisma.service.ts`:
   - `@Injectable()` class that `extends PrismaClient` (from `@prisma/client`).
   - Implements `OnModuleInit` calling `this.$connect()`.
   - Implements `OnModuleDestroy` calling `this.$disconnect()` (or register `app.enableShutdownHooks()`).

3. Register `PrismaModule` in `apps/api/src/app/app.module.ts`:
   - Add `PrismaModule` to the `@Module({ imports: [...] })` block.

4. Set up `ConfigModule` in `apps/api/src/app/app.module.ts`:
   - Import `ConfigModule.forRoot({ isGlobal: true })` (loads the root `.env`).
   - Create a thin typed accessor if you want (optional); providers must obtain config via `ConfigService`, not by reading `process.env` directly.

5. Install the approved dependencies.
   - `npm install` the above set. Verify `npm install` completes with no peer-dependency errors.

6. Verify the app boots and injects both.
   - `npm run build`, `npm run lint`, `npm test` must all pass.
   - With no `OPENWEATHER_API_KEY` set, the app must boot without throwing — config access must tolerate a blank key.

**Approval gate:** **STOP before `npm install`** and present the exact approved dependency list. Do not install unattended.

**Suggested commit:**
```
feat(api): add global PrismaModule + ConfigModule and Phase 3 backend deps

Install the approved Phase 3 runtime dependencies (@nestjs/config,
@nestjs/cache-manager + cache-manager, class-validator, class-transformer;
HTTP via native fetch | @nestjs/axios) and stand up the backend foundation:

- PrismaService extends PrismaClient and connects in onModuleInit,
  disconnecting on shutdown; exposed via a @Global() PrismaModule.
- ConfigModule.forRoot({ isGlobal: true }) provides typed env access for
  OpenWeather key/base URL, DB URL, CORS origin, mock-fallback flag.

App boots with no OPENWEATHER_API_KEY set. main.ts cross-cutting wiring
(prefix, CORS, ValidationPipe, /health) is Task 3-2. build/lint/test green.
```

---

### Step 2 — Wire the app shell: health, prefix, CORS, ValidationPipe (Task 3-2)

**Read:** `docs/tasks/Tasks-3-2.md` (all sections).

**Scope:** Author the `HealthController`, wire the global prefix `api` **excluding** `/health`, enable CORS for `http://localhost:4200`, and register the global `ValidationPipe` with `whitelist` / `forbidNonWhitelisted` / `transform`.

**Execute:**

1. Create `HealthController` at `apps/api/src/app/health/health.controller.ts`:
   - `@Controller('health')` or `@Controller()` with `@Get('health')`.
   - Returns exactly: `{ status: 'ok', service: 'nimbus-api', time: new Date().toISOString() }`.

2. Register `HealthController` in `apps/api/src/app/app.module.ts`:
   - Add it to `@Module({ ..., controllers: [HealthController] })`.

3. Wire the bootstrap configuration in `apps/api/src/main.ts`:
   - Set the global prefix **excluding** health:
     ```typescript
     app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] })
     ```
     (or the equivalent exclude form).
   - Enable CORS:
     ```typescript
     app.enableCors({ origin: 'http://localhost:4200' })
     ```
     (origin read from `ConfigService` with `http://localhost:4200` as default).
   - Register the global `ValidationPipe`:
     ```typescript
     app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
     ```
   - Keep the listen/port logic: `app.listen(process.env.PORT || 3000)`.

4. Verify the shell works:
   - `npm run build`, `npm run lint`, `npm test` must pass.
   - `nx serve api` (or boot the app) and confirm `GET http://localhost:3000/health` returns the contract body.
   - `GET http://localhost:3000/api/health` must return `404` (health is **not** double-prefixed).

**Suggested commit:**
```
feat(api): add /health endpoint and wire prefix, CORS, and ValidationPipe

Author HealthController serving GET /health -> { status: 'ok', service:
'nimbus-api', time: <ISO> } and set the authoritative bootstrap config:

- global prefix 'api' with /health excluded (RoadMap §0.2 / §4 health-route
  gotcha);
- CORS allowing http://localhost:4200 (origin from ConfigService);
- global ValidationPipe { whitelist, forbidNonWhitelisted, transform } for
  the Task 3-4/3-5 request DTOs.

camelCase JSON preserved (no key-renaming transformer). App boots on
PORT||3000; GET /health returns the contract body. build/lint/test green.
```

---

### Step 3 — Implement WeatherModule: OpenWeather + Mock + caching (Task 3-3)

**Read:** `docs/tasks/Tasks-3-3.md` (all sections).

**Scope:** Implement the `WeatherModule` with `WeatherController` (endpoints #2 `GET /api/weather/dashboard` and #3 `GET /api/weather/locations`), a `WEATHER_SERVICE` token bound to `OpenWeatherService` (primary) with a `MockWeatherService` fallback, and an in-memory `CacheModule` with the §0/§4 TTLs.

**Decisions:** HTTP client is already locked in Step 0. Caching backend is `@nestjs/cache-manager` in-memory store.

**Execute:**

1. Define the `WEATHER_SERVICE` token and interface:
   - A DI token (e.g., `export const WEATHER_SERVICE = Symbol('WEATHER_SERVICE')` or a string `'WEATHER_SERVICE'`).
   - An `IWeatherService` interface with two methods:
     - `getDashboard(location: string, unitSystem: UnitSystem, userId: string): Promise<WeatherDashboard>`
     - `searchLocations(query: string): Promise<LocationSuggestion[]>`

2. Create `OpenWeatherService`:
   - Implements `IWeatherService`.
   - Calls OpenWeather API (via the Step 0 chosen HTTP approach — native `fetch` or `@nestjs/axios`).
   - Implements:
     - **Geocoding:** `/geo/1.0/direct` for city names and `"city, state"` inputs; `/geo/1.0/zip` for ZIP codes.
     - **ZIP detection:** 5-digit (`#####`) or 9-digit (`#####-####`) strings route to `/geo/1.0/zip`; others to `/geo/1.0/direct`.
     - **US-state normalization:** map inputs like `"San Francisco, CA"` to proper state names if needed.
     - **One-call:** `/data/3.0/onecall?...&exclude=minutely` with imperial/metric unit mapping.
     - **Unit mapping:** `imperial` → `units=imperial`, `temperatureUnit = 'F'`, `windUnit = 'mph'`; `metric` → `units=metric`, `temperatureUnit = 'C'`, `windUnit = 'm/s'`.
     - **Timezone-aware time conversion:** use the one-call `timezone_offset` to compute `observedAt`, `sunrise`, `sunset`, hourly `time`, and the hourly `label` (first labeled `"Now"`, rest as `"HH PM"`/`"HH AM"`).
     - **Condition→Unsplash map:** map condition codes to Unsplash URLs for `current.backgroundImageUrl` (e.g., "rain" → rain image URL, "cloud" → cloud URL, etc.).
     - **Dashboard shaping:**
       - `hourly`: exactly 7 items, first labeled `"Now"`, with `label`, `time`, `condition`, `temperature`, `windSpeed`, `precipitationChance`.
       - `daily`: exactly 5 items with `day`, `date`, `condition`, `high`, `low`, `precipitationChance`.
       - `previews`: exactly 3 items with `condition`, `high`, `low`, `description`.
       - `metrics`: exactly 4 items (keys: `'humidity'`, `'wind'`, `'precipitation'`, `'visibility'`) each with `label`, `value`, `unit`, `hint`, and a non-empty `trend: number[]` (sparkline array).
   - Fall back to `MockWeatherService` if the OpenWeather key is missing, blank, or the upstream call throws/errors.

3. Create `MockWeatherService`:
   - Implements `IWeatherService`.
   - Returns a fully-shaped `WeatherDashboard` and a non-empty `LocationSuggestion[]` with no network call and no API key.
   - Cardinalities match (2) above; all fields populated with deterministic mock data.

4. Create `WeatherController`:
   - `@Controller('weather')` (resolves to `/api/weather/...` under the prefix).
   - Endpoint #2: `GET /api/weather/dashboard` with query params `location`, `unitSystem`, `userId` returning `WeatherDashboard`.
   - Endpoint #3: `GET /api/weather/locations` with optional `query` (default `"San Francisco"`) returning `LocationSuggestion[]`.
   - Both inject the `WEATHER_SERVICE` token and call the appropriate method.

5. Register `CacheModule` in the `WeatherModule`:
   - Use in-memory store with 10-minute TTL for dashboard (keyed by `location + unitSystem`).
   - Use 6-hour TTL for geocoding (keyed by query).
   - A repeated request within the TTL returns the **same cached object** without re-invoking the HTTP path.

6. Register `WeatherModule` in `apps/api/src/app/app.module.ts`:
   - Add `WeatherModule` to `imports`.

7. Verify:
   - `npm run build`, `npm run lint`, `npm test` pass.
   - Test an endpoint with a missing/blank `OPENWEATHER_API_KEY` — it falls back to mock data and never 5xx.

**Out of scope:** Do not add dedicated mocked-HTTP tests here; that is Phase 6. Keep the test suite green but don't expand it.

**Suggested commit:**
```
feat(api): add WeatherModule with OpenWeather primary, mock fallback, caching

Implement RoadMap §0.2 endpoints #2 and #3 behind a WEATHER_SERVICE token:

- WeatherController: GET /api/weather/dashboard (location/unitSystem/userId
  -> WeatherDashboard with 7 hourly [first 'Now'] / 5 daily / 3 previews /
  4 metrics with sparkline trends, F/mph or C/(m/s) units) and GET
  /api/weather/locations (?query default 'San Francisco' -> LocationSuggestion[]).
- OpenWeatherService (primary): geocoding (/geo/1.0/direct + /geo/1.0/zip),
  one-call (/data/3.0/onecall?...exclude=minutely), ZIP 5/9-digit detection,
  US-state normalization, imperial/metric mapping, timezone-aware times,
  condition->Unsplash background.
- MockWeatherService fallback: full contract shapes with no key/no network,
  used when the key is missing or the upstream call fails (app runs key-less).
- In-memory cache: dashboard 10 min (location+unitSystem), geocoding 6 hr
  (query).

camelCase JSON, types from @nimbus/shared-types. build/lint/test green.
```

---

### Step 4 — Implement UsersModule preferences (Task 3-4)

**Read:** `docs/tasks/Tasks-3-4.md` (all sections).

**Scope:** Implement the `UsersModule` with the preferences endpoints (#4 `GET /api/users/{userId}/preferences` and #5 `PUT /api/users/{userId}/preferences`), backed by a Prisma-backed `PreferenceService` implementing the auto-create-on-first-read invariant, plus the `UpdatePreferencesRequest` DTO class.

**Execute:**

1. Create the `UpdatePreferencesRequest` DTO class at `apps/api/src/app/users/dto/update-preferences.dto.ts`:
   - A class that `implements UpdatePreferencesRequest` from `@nimbus/shared-types`.
   - Single field: `@IsIn(['imperial', 'metric']) unitSystem!: UnitSystem;`.
   - No other fields declared (the interface defines the contract).
   - Under the Task 3-2 `ValidationPipe`, a request with an unknown field or invalid `unitSystem` is rejected with `400`.

2. Create `PreferenceService` at `apps/api/src/app/users/preference.service.ts`:
   - `@Injectable()`, inject `PrismaService`.
   - `getPreferences(userId: string): Promise<UserPreferences>`:
     - **Auto-create on first read:** if no `user_preferences` row exists for `userId`, create one with `unitSystem: 'imperial'` and return it.
     - Otherwise return the existing row mapped to `{ userId, unitSystem }` (omit `createdUtc`/`updatedUtc`).
   - `updatePreferences(userId: string, dto: UpdatePreferencesRequest): Promise<UserPreferences>`:
     - Upsert/update the row's `unitSystem` and return the updated `UserPreferences`.

3. Create `UsersModule` at `apps/api/src/app/users/users.module.ts`:
   - `@Module({ providers: [PreferenceService], controllers: [UsersController] })`.

4. Create `UsersController` at `apps/api/src/app/users/users.controller.ts`:
   - `@Controller('users')` (resolves to `/api/users/...`).
   - Endpoint #4: `GET /api/users/:userId/preferences` → `UserPreferences` (200).
   - Endpoint #5: `PUT /api/users/:userId/preferences` with body `{ unitSystem }` → `UserPreferences` (200).
   - Both call the `PreferenceService` methods.

5. Register `UsersModule` in `apps/api/src/app/app.module.ts`:
   - Add `UsersModule` to `imports`.

6. Verify:
   - `npm run build`, `npm run lint`, `npm test` pass.
   - A GET for a new `userId` creates and returns an `imperial` row.
   - A PUT updates the unit system; a subsequent GET returns the persisted value.

**Out of scope:** Do not add dedicated integration tests here; that is Phase 6. Do not implement saved-location endpoints (#6–#11) — that is Task 3-5.

**Suggested commit:**
```
feat(api): add UsersModule preferences (GET/PUT) with auto-create-on-read

Implement RoadMap §0.2 endpoints #4 and #5 and stand up UsersModule:

- PreferenceService (Prisma-backed over user_preferences): getPreferences
  auto-creates a unitSystem='imperial' row on first read (§0.4 invariant);
  updatePreferences upserts the unit system.
- UsersController: GET /api/users/:userId/preferences and PUT
  /api/users/:userId/preferences ({ unitSystem }) -> UserPreferences.
- UpdatePreferencesRequest DTO class implements the @nimbus/shared-types
  interface with @IsIn(['imperial','metric']); rejected by the global pipe
  on unknown/invalid fields.

camelCase JSON ({ userId, unitSystem }), no exposed timestamps. Saved
locations (#6-#11) are Task 3-5. build/lint/test green.
```

---

### Step 5 — Implement UsersModule saved locations (Task 3-5)

**Read:** `docs/tasks/Tasks-3-5.md` (all sections).

**Scope:** Extend `UsersModule` to serve endpoints #6–#11 (saved-location list/create/update/delete/set-default/reorder) over the Phase 2 `saved_locations` table, enforcing the three remaining §0.4 invariants (single-default-per-user, contiguous-`sortOrder`-on-reorder, no-duplicate `(userId, name, region)`), converting Prisma `Decimal` lat/lon to JSON `number` at the boundary, and returning `204 No Content` on the mutating endpoints.

**Decisions:** Invariants are enforced via service-layer logic using `$transaction` for atomicity. `Decimal` is converted at the response boundary (endpoint #6) via `Number(row.latitude)` / `.toNumber()` or similar.

**Execute:**

1. Create the `SaveLocationRequest` DTO class at `apps/api/src/app/users/dto/save-location.dto.ts`:
   - A class that `implements SaveLocationRequest` from `@nimbus/shared-types`.
   - Fields: `@IsString() name`, `@IsString() region`, `@IsString() country`, `@IsNumber({ lat: -90..90, lon: -180..180 }) latitude`, `@IsNumber() longitude`, `@IsBoolean() @IsOptional() isDefault`.
   - No field redeclaration beyond the interface.

2. Create the `ReorderSavedLocationsRequest` DTO class at `apps/api/src/app/users/dto/reorder-saved-locations.dto.ts`:
   - A class that `implements ReorderSavedLocationsRequest` from `@nimbus/shared-types`.
   - Field: `@IsArray() @IsInt({ each: true }) locationIds: number[]`.

3. Extend `PreferenceService` (or create a sibling `SavedLocationService`) with methods for saved locations:
   - `listLocations(userId: string): Promise<LocationSuggestion[]>` — fetch all rows for the user ordered by `sortOrder` ascending; convert `Decimal` lat/lon to `number`; return the `LocationSuggestion[]` shape.
   - `createLocation(userId: string, dto: SaveLocationRequest): Promise<void>` — insert a new row; if `isDefault: true`, apply the single-default invariant (atomically clear default on other rows); handle unique-constraint errors as `409 Conflict`.
   - `updateLocation(userId: string, locationId: number, dto: SaveLocationRequest): Promise<void>` — update an existing row; enforce the same invariants (single-default, unique constraint).
   - `deleteLocation(userId: string, locationId: number): Promise<void>` — delete the row.
   - `setDefault(userId: string, locationId: number): Promise<void>` — **atomically** set this row's `isDefault = true` and clear `isDefault` on all other rows for the user (run in a `$transaction`).
   - `reorderLocations(userId: string, locationIds: number[]): Promise<void>` — **atomically** rewrite `sortOrder` contiguously (0, 1, 2, …) to match the supplied id array order (run in a `$transaction`).

4. Extend `UsersController` with the saved-location endpoints:
   - Endpoint #6: `GET /api/users/:userId/locations` → `LocationSuggestion[]` (200), ordered by `sortOrder`.
   - Endpoint #7: `POST /api/users/:userId/locations` body `SaveLocationRequest` → `204 No Content`.
   - Endpoint #8: `PUT /api/users/:userId/locations/:id` body `SaveLocationRequest` → `204 No Content`.
   - Endpoint #9: `DELETE /api/users/:userId/locations/:id` → `204 No Content`.
   - Endpoint #10: `PUT /api/users/:userId/locations/:id/default` → `204 No Content`.
   - Endpoint #11: `PUT /api/users/:userId/locations/reorder` body `{ locationIds: number[] }` → `204 No Content`.
   - Use `@HttpCode(204)` on the mutating endpoints to suppress a response body.

5. Handle the three invariants:
   - **Single-default per user:** when setting a location as default, atomically clear `isDefault` on all other rows for that user. Use `prisma.$transaction([...])` to ensure atomicity.
   - **Contiguous `sortOrder` on reorder:** rewrite `sortOrder` as 0, 1, 2, … in the order of the supplied `locationIds` array. Atomic transaction.
   - **No duplicate `(userId, name, region)`:** the Phase 2 `@@unique` constraint prevents this at the DB; catch the unique-constraint error and surface it as `409 Conflict` rather than an unhandled 500.

6. Verify `Decimal`→`number` conversion:
   - Every `LocationSuggestion` returned by endpoint #6 must have `latitude`/`longitude` as primitive `number`, not `Decimal` objects or strings (e.g., `{ latitude: 37.7749, longitude: -122.4194 }`).

7. Verify:
   - `npm run build`, `npm run lint`, `npm test` pass.
   - Test all six endpoints (#6–#11) with the invariants exercised.

**Out of scope:** Do not add dedicated integration tests here; that is Phase 6.

**Suggested commit:**
```
feat(api): add saved-location CRUD, reorder, and set-default (endpoints #6-#11)

Complete the §0.2 contract over the Phase 2 saved_locations table:

- GET /api/users/:userId/locations -> LocationSuggestion[] ordered by
  sortOrder; POST/PUT/:id/DELETE/:id/PUT/:id/default/PUT/reorder all return
  204 No Content.
- Invariants: single default per user (set-default atomically clears the
  others in a $transaction); contiguous sortOrder rewrite on reorder
  (atomic); no duplicate (userId, name, region) surfaced as 409 from the
  Phase 2 @@unique.
- Decimal -> number conversion for latitude/longitude at the response
  boundary so JSON matches LocationSuggestion (§4).
- SaveLocationRequest and ReorderSavedLocationsRequest DTO classes
  implement the @nimbus/shared-types interfaces with class-validator
  decorators (#8 reuses SaveLocationRequest).

camelCase JSON, empty 204 bodies. No schema edits. build/lint/test green.
```

---

## Phase 3 success criteria (from RoadMap)

Before closing Phase 3, verify every criterion:

- **All 11 §0.2 endpoints respond with the exact paths, params, JSON shapes, and status codes:**
  - Endpoint #1: `GET /health` (outside `api`) → `{ status: 'ok', service: 'nimbus-api', time: <ISO> }` (200).
  - Endpoints #2–#11: under `/api/...` with camelCase JSON.
  - Endpoints #7–#11 (mutating locations): `204 No Content` (no body).
- **`GET /api/weather/dashboard?location=San%20Francisco,%20CA&unitSystem=imperial&userId=anonymous` returns a full `WeatherDashboard`** (mock data when `OPENWEATHER_API_KEY` is absent), with:
  - 7 hourly (first labeled `"Now"`), 5 daily, 3 previews, 4 metrics with sparkline `trend` arrays.
  - `temperatureUnit = 'F'`, `windUnit = 'mph'` for imperial; `'C'`, `'m/s'` for metric.
- **The four §0.4 invariants hold:**
  - First preferences read auto-creates an `imperial` row.
  - Setting a default clears it on all others (single-default-per-user).
  - A duplicate `(userId, name, region)` is rejected (`409`).
  - Reorder rewrites `sortOrder` contiguously (0, 1, 2, …).
- **Saved-location `latitude`/`longitude` serialize as JSON `number`, not Prisma `Decimal`.**
- **CORS allows `http://localhost:4200`;** the global `ValidationPipe` rejects malformed request bodies; JSON keys stay camelCase (no transformer added).
- **`npm run build` / `npm run lint` / `npm test` are green across the workspace.**

---

## Scope guardrails (do NOT)

- **No schema change.** Phase 2 locked the schema. Phase 3 is read-only on `prisma/schema.prisma` and `prisma/migrations/`. If a task reveals a need for a schema change, STOP and ask — that is a new approval-gated Phase 2-style migration.
- **No new dependency beyond the Phase 3 approved list** (`@nestjs/config`, `@nestjs/cache-manager` + `cache-manager`, `class-validator`, `class-transformer`, native `fetch` **or** `@nestjs/axios` + `axios`). If a step seems to need a package not on that list, STOP and ask.
- **No Phase 4 frontend work.** `apps/web` is untouched; Angular components, `WeatherStore`, and API consumption are Phase 4.
- **No seed execution.** `prisma/seed.ts` was authored in Phase 2 and is wired (not run). Phase 5 owns running it; do not run `prisma db seed` here.
- **No refactoring of Phase 0 / Phase 1 / Phase 2 artifacts** unless the roadmap explicitly says so — STOP and ask.

---

## Commit policy

**Commit style:** conventional (`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`).

**No Co-Authored-By trailer.** Plain conventional messages only; do **not** append a `Co-Authored-By:` or any AI co-author trailer. This keeps a single author and avoids skewing GitHub contributor counts.

Each task's suggested commit is in the Step above. Follow the style and the narrative.

---

## What to do after Phase 3 ships

When all five tasks are complete and merged:

1. **Verify Phase 3 success criteria** (above).
2. **Write the Phase 3 handoff** to `docs/handoffs/Phase-3-Handoff.md`:
   - What was delivered (the five NestJS modules, the 11 endpoints, the invariants).
   - Commit hashes for the five tasks.
   - Verification: `npm run build` / `npm run lint` / `npm test` green; the 11 endpoints serve the correct shapes; the invariants hold.
   - Forward pointers: what Phase 4 (Frontend) will import and use; the HTTP contract is now locked.
3. **Update `docs/RoadMap.md`** to mark Phase 3 complete (if the roadmap has a phase-completion ledger).
4. **Commit the handoff and ledger updates** as a separate `docs: close out Phase 3` commit.

Phase 3 is then complete and Phase 4 (Frontend) can begin.
