# Phase 3 — Backend (NestJS) — Handoff

**Status:** Complete. Five tasks committed on `claude/phase3-prompt-execution-e0hbuf`:

| Task | Commit | Summary |
|------|--------|---------|
| 3-1 | `dd2e089` | Global `PrismaModule`/`PrismaService` + global `ConfigModule`; approved Phase 3 backend deps installed |
| 3-2 | `92df376` | `HealthController` (`GET /health`); `main.ts` prefix `api` excluding health, CORS, global `ValidationPipe` |
| 3-3 | `abaf1b6` | `WeatherModule` — endpoints #2/#3; OpenWeather primary + mock fallback; in-memory cache |
| 3-4 | `4c3be1a` | `UsersModule` preferences — endpoints #4/#5; auto-create-on-first-read |
| 3-5 | `608b838` | Saved-location CRUD/reorder/set-default — endpoints #6–#11; invariants + Decimal→number |

`npm run build` / `npm run lint` / `npm test` are **green across the workspace** (web, api, shared-types).
All 11 §0.2 endpoints were exercised at runtime against a live, migrated Postgres.

---

## What was delivered

The entire NestJS API: a global foundation, the cross-cutting shell, and three feature modules
fulfilling the full §0.2 11-endpoint REST contract with the §0.4 invariants and camelCase JSON. No
schema or shared-types edits — Phase 2 and Phase 1 were consumed read-only.

**Foundation (Task 3-1):**
- `apps/api/src/app/prisma/prisma.service.ts` — `@Injectable()` `PrismaService extends PrismaClient`
  (`@prisma/client`); `$connect()` in `onModuleInit`, `$disconnect()` in `onModuleDestroy`.
- `apps/api/src/app/prisma/prisma.module.ts` — `@Global()` module exporting `PrismaService`.
- `ConfigModule.forRoot({ isGlobal: true })` in `app.module.ts`; feature code reads `ConfigService`,
  never `process.env`.
- **Dependencies installed (approval-gated):** `@nestjs/config`, `@nestjs/cache-manager` +
  `cache-manager`, `class-validator`, `class-transformer`. **HTTP client decision: native `fetch`
  (Node 22 global) — no package added.**

**App shell (Task 3-2):**
- `apps/api/src/app/health/health.controller.ts` — `GET /health` → `{ status: 'ok', service:
  'nimbus-api', time: <ISO> }`.
- `main.ts`: `setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] })`
  (so `/health` is **outside** `/api`); `enableCors({ origin: <CORS_ORIGIN | http://localhost:4200> })`;
  `useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`.
  **No key-renaming transformer** — camelCase preserved.

**WeatherModule (Task 3-3):** endpoints #2/#3.
- `WEATHER_SERVICE` token + `IWeatherService` interface (`weather.tokens.ts`).
- `WeatherService` (facade, bound to `WEATHER_SERVICE`): caches (dashboard 10 min keyed by
  `location+unitSystem`; geocoding 6 hr keyed by query) and runs OpenWeather when a key is configured,
  falling back to the mock on a missing key **or** any upstream error — never 5xx on a missing key.
- `OpenWeatherService` (primary, native `fetch`): `/geo/1.0/direct` + `/geo/1.0/zip`, ZIP 5/9-digit
  detection, US-state normalization, `/data/3.0/onecall?...&exclude=minutely`, imperial/metric mapping,
  timezone-offset-aware times, condition→Unsplash background, 7 hourly (first `Now`) / 5 daily /
  3 previews / 4 metrics (`humidity`/`wind`/`precipitation`/`visibility`) with sparkline `trend` arrays.
- `MockWeatherService` (fallback): deterministic, key-less, network-free, full contract shapes.

**UsersModule (Tasks 3-4 + 3-5):** endpoints #4–#11 under `/api/users/...`.
- `PreferenceService` over `user_preferences`: `getPreferences` **auto-creates** a `imperial` row on
  first read; `updatePreferences` upserts.
- `SavedLocationService` over `saved_locations`: list (ordered by `sortOrder`, **Decimal→number** lat/lon),
  create, update, delete, set-default, reorder. Invariants — **single default per user** (set-default
  atomically clears the others in a `$transaction`), **contiguous `sortOrder`** rewrite on reorder
  (atomic), **no duplicate `(userId, name, region)`** surfaced as **409** from the Phase 2 `@@unique`.
- DTO classes implement the `@nimbus/shared-types` request interfaces with only `class-validator`
  decorators: `UpdatePreferencesDto`, `SaveLocationDto` (#8 reuses it), `ReorderSavedLocationsDto`.
- Mutating endpoints #7–#11 return **`204 No Content`** (`@HttpCode(204)`); `reorder` is routed before
  `:id` so it is not captured as an id.

---

## Verification (performed in-phase)

Booted the built API (`node dist/apps/api/main.js`) against a live Postgres migrated with the Phase 2
`init` migration, and exercised every endpoint:

- **#1** `GET /health` → `200` contract body; `GET /api/health` → `404` (not double-prefixed); CORS
  preflight returns `Access-Control-Allow-Origin: http://localhost:4200`.
- **#2** `GET /api/weather/dashboard?location=San Francisco, CA&unitSystem=imperial&userId=anonymous`
  (key-less → mock): `hourly.length === 7` with `hourly[0].label === 'Now'`, `daily.length === 5`,
  `previews.length === 3`, `metrics.length === 4` (keys + non-empty trends), `temperatureUnit === 'F'` /
  `windUnit === 'mph'`; `unitSystem=metric` → `'C'` / `'m/s'`; `backgroundImageUrl` non-empty.
- **#3** `GET /api/weather/locations` (default `San Francisco`) → `LocationSuggestion[]` with numeric
  `latitude`/`longitude`.
- **#4/#5** GET auto-creates `{ userId, unitSystem: 'imperial' }`; PUT `{ unitSystem: 'metric' }`
  persists; invalid `unitSystem` and unknown fields → `400`.
- **#6–#11** create → `204`, duplicate → `409`; list ordered by `sortOrder` with numeric lat/lon and
  exactly one default; set-default → `204` leaving exactly one default; reorder → `204` rewriting
  `sortOrder` to `0,1,2` in the supplied order; update/delete → `204`; out-of-range latitude → `400`.

`npm run build` / `npm run lint` / `npm test` green across all three projects.

---

## Deviations / notes for later phases

1. **HTTP client = native `fetch`.** No `@nestjs/axios`/`axios` was added. Phase 6 mocked-HTTP tests
   should stub the global `fetch` (or inject a seam) rather than an axios instance.
2. **Caching is per-`WeatherModule`.** `CacheModule.register()` (default in-memory store, cache-manager
   v7; TTLs in **milliseconds**) is registered inside `WeatherModule`, not global. Cache keys:
   `dashboard:<location>:<unitSystem>` and `geo:<query>`.
3. **`.env.example` gained two optional, defaulted entries** — `OPENWEATHER_BASE_URL`
   (`https://api.openweathermap.org`) and `CORS_ORIGIN` (`http://localhost:4200`). Neither is a new
   mandatory secret; the app boots with the file as-is and with no `OPENWEATHER_API_KEY`.
4. **Placeholder `AppController`/`AppService` retained.** The Phase 0 scaffold's `GET /api` placeholder
   is left in place (its specs keep `npm test` green); it is not one of the 11 contract endpoints. A
   future cleanup phase may remove it.
5. **No schema/shared-types/seed changes.** `prisma/schema.prisma`, `prisma/migrations/`, and
   `libs/shared-types` are untouched; `prisma db seed` was not run (Phase 5).

---

## For downstream phases

- **Phase 4 (Frontend):** the HTTP contract is now **locked and live**. The Angular client targets
  `http://localhost:3000` with the global `api` prefix (and `/health` outside it), CORS already allows
  `http://localhost:4200`, and every response matches the `@nimbus/shared-types` shapes the client
  already imports. Mutating saved-location calls return `204` (no body). The app serves real data with
  an `OPENWEATHER_API_KEY` set and mock data without one.
- **Phase 5 (Dev workflow):** `docker compose up -d` + `prisma migrate deploy` (or `migrate dev`)
  brings up the DB the API expects; `prisma db seed` is still unrun. The API reads `DATABASE_URL`,
  `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, and `PORT` from `.env`.
- **Phase 6 (Testing):** the high-value cases are the four §0.4 invariants (auto-create-on-read,
  single-default-per-user, `(userId, name, region)` dedupe → 409, contiguous `sortOrder` on reorder),
  the OpenWeather→mock fallback paths (missing key / upstream error), the cache-hit behavior, and the
  unit/ZIP/timezone mapping in `OpenWeatherService`. No dedicated tests were added in Phase 3.
