# Task 3-3 — WeatherModule: OpenWeather primary + Mock fallback + caching (endpoints #2, #3)

## Surface
Backend feature module in `apps/api` only — a `WeatherModule` with `WeatherController` (endpoints #2
`GET /api/weather/dashboard` and #3 `GET /api/weather/locations`), a `WEATHER_SERVICE` provider token
bound to `OpenWeatherService` (primary) with a `MockWeatherService` fallback, and an in-memory
`CacheModule` registration with the §0/§4 TTLs. Registered in `app.module.ts`. No users/preferences
logic, no schema or shared-types edits.

## Why
Endpoints #2 and #3 are the read-only weather half of the §0.2 contract — the dashboard the Angular
client renders and the autocomplete suggestions it queries. This ports the current .NET
`IWeatherForecastService` layer: an OpenWeather One Call 3.0 integration (geocoding + one-call,
unit/ZIP/timezone handling, condition→Unsplash background map, and the 7-hourly / 5-daily / 3-preview /
4-metric shaping with sparkline `trend` arrays) behind a `WEATHER_SERVICE` token, with a
`MockWeatherService` fallback so the app runs **key-less out of the box** (§4: "the mock fallback must
work key-less"). Caching mirrors the .NET `IMemoryCache`. This is self-contained relative to the users
module (Tasks 3-4 / 3-5) and can ship as its own PR.

## Depends on
- **Task 3-1** (`docs/tasks/Tasks-3-1.md`): `@nestjs/cache-manager` + `cache-manager` are installed, the
  HTTP approach (native `fetch` or `@nestjs/axios`) is chosen, and `ConfigModule` is global (the
  OpenWeather key / base URL / mock flag are read from `ConfigService`). **Hard precondition.**
- **Task 3-2** (`docs/tasks/Tasks-3-2.md`): the global `api` prefix is authoritative, so a
  `@Controller('weather')` resolves at `/api/weather/...`. **Hard precondition** for the path shapes
  below.
- **Roadmap Phase 3 — Backend (NestJS)** (`docs/RoadMap.md`, "### Phase 3"): the `WeatherModule` scope
  bullet (geocoding `/geo/1.0/direct` + `/geo/1.0/zip`; one-call `/data/3.0/onecall?...exclude=minutely`;
  imperial/metric unit mapping; US-state-abbreviation normalization; ZIP detection 5/9-digit;
  timezone-aware time conversion; condition→Unsplash map; 7/5/3/4 shaping with `trend` arrays; HTTP via
  the chosen approach; cache **weather 10 min** keyed by `location + unitSystem`, **geocoding 6 hr**
  keyed by query; fall back to mock when key missing **or** upstream fails). The "HTTP client" and
  "Caching backend" Decisions. Enumerated task-split item **3**.
- **Roadmap §0.2** (lines ~55–72): endpoint #2 `GET /api/weather/dashboard?location&unitSystem&userId`
  → `WeatherDashboard`; endpoint #3 `GET /api/weather/locations?query` (default `"San Francisco"`) →
  `LocationSuggestion[]`.
- **Roadmap §0.3 / `@nimbus/shared-types`**: the `WeatherDashboard`, `CurrentWeather`, `HourlyForecast`,
  `DailyForecast`, `WeatherPreview`, `WeatherMetric`, `LocationSuggestion`, `UnitSystem` response shapes
  the controller must return.
- **Roadmap §4** (lines ~725–731): OpenWeather key-less mock fallback; camelCase JSON.
- **Phase 1 — Shared contract — Handoff** (`docs/handoffs/Phase-1-Handoff.md`): import response types
  from `@nimbus/shared-types`; do not redeclare them.
- No ADRs exist in `docs/decisions/`.

## Required reading
- `libs/shared-types/src/lib/weather.ts` (via `@nimbus/shared-types`) — **Mirror:** the exact response
  shapes the controller returns. `WeatherDashboard` carries `current`, `hourly[]`, `daily[]`,
  `previews[]`, `metrics[]`, `locations[]`, `unitSystem`, `temperatureUnit` (string `"F"`/`"C"`),
  `windUnit` (string `"mph"`/`"m/s"`). `LocationSuggestion` has `latitude`/`longitude` as `number`,
  `id?: number | null`, `isDefault`, `sortOrder`. `WeatherMetric.trend` is `number[]`.
- `apps/api/src/app/app.controller.ts` — **Mirror:** the `@Controller` / `@Get` / `@Query` decorator
  style to follow for `WeatherController`.
- `apps/api/src/app/app.module.ts` — **Mirror:** register `WeatherModule` in `imports`.
- `docs/RoadMap.md` §0.1 feature inventory (items 1–6) — **Mirror:** the user-visible behavior the
  dashboard data backs (3 previews, 7 hourly with first labeled "Now", 5-day list, 4 metric cards with
  sparkline trends) — these fix the array cardinalities below.
- `docs/handoffs/Phase-2-Handoff.md` — note `WeatherModule` does **not** touch Prisma (it has no
  persistence); it is pure HTTP + cache + mapping.
- `CLAUDE.md` — `npm run build` / `npm run lint` / `npm test`; the OpenWeather key lives in `.env`,
  never committed.

## Acceptance criteria
1. **`WEATHER_SERVICE` token + interface.** A DI token (e.g. `export const WEATHER_SERVICE = Symbol('WEATHER_SERVICE')`
   or string token) and an `IWeatherService` interface with two methods — `getDashboard(location: string,
   unitSystem: UnitSystem, userId: string): Promise<WeatherDashboard>` and
   `searchLocations(query: string): Promise<LocationSuggestion[]>`. Both `OpenWeatherService` and
   `MockWeatherService` implement it.
2. **`WeatherController` endpoint #2** — `GET /api/weather/dashboard` with query params `location`,
   `unitSystem`, `userId` returns a `WeatherDashboard`:
   - `hourly.length === 7`, and `hourly[0].label === 'Now'` (§0.1 item 4);
   - `daily.length === 5` (§0.1 item 5);
   - `previews.length === 3` (§0.1 item 3);
   - `metrics.length === 4` with `key` values `'humidity'`, `'wind'`, `'precipitation'`, `'visibility'`
     (§0.1 item 6), each carrying a non-empty `trend: number[]` (sparkline);
   - `unitSystem` echoes the request; for `imperial` → `temperatureUnit === 'F'`, `windUnit === 'mph'`;
     for `metric` → `temperatureUnit === 'C'`, `windUnit === 'm/s'`;
   - `current.backgroundImageUrl` is a non-empty (Unsplash) URL string.
   A request to
   `GET /api/weather/dashboard?location=San%20Francisco,%20CA&unitSystem=imperial&userId=anonymous`
   returns a full, contract-shaped dashboard.
3. **`WeatherController` endpoint #3** — `GET /api/weather/locations` with optional query param `query`
   returns `LocationSuggestion[]`. When `query` is absent it defaults to `"San Francisco"` (§0.2). Each
   suggestion has `latitude`/`longitude` as JSON `number`, plus `name`/`region`/`country`/`isDefault`/
   `sortOrder` (these are search results, not saved rows — `id` may be `null`/absent, `isDefault`
   `false`, `sortOrder` `0`).
4. **`OpenWeatherService` (primary)** ports the OpenWeather logic against the configured base URL:
   geocoding via `/geo/1.0/direct` and `/geo/1.0/zip`; one-call via
   `/data/3.0/onecall?...&exclude=minutely`; **ZIP detection** routes 5-digit and 9-digit (`#####` /
   `#####-####`) inputs to `/geo/1.0/zip` and other inputs to `/geo/1.0/direct`; **US-state-abbreviation
   normalization** maps `"city, CA"`-style inputs; **imperial/metric unit mapping** passes the correct
   `units` and produces the `temperatureUnit`/`windUnit` strings in (2); **timezone-aware** time
   conversion uses the one-call `timezone_offset` to produce `observedAt` / `sunrise` / `sunset` /
   hourly `time` / hourly `label`; a **condition→Unsplash** map sets `current.backgroundImageUrl`. HTTP
   uses the Task 3-1 chosen approach.
5. **`MockWeatherService` (fallback)** returns a fully-shaped `WeatherDashboard` and a non-empty
   `LocationSuggestion[]` with **no** network call and **no** API key — satisfying every cardinality/
   field check in (2) and (3) with deterministic mock data.
6. **Fallback policy.** The `WEATHER_SERVICE` resolves to `OpenWeatherService` when an
   `OPENWEATHER_API_KEY` is configured **and** the upstream call succeeds; it falls back to
   `MockWeatherService` when (a) the key is missing/blank **or** (b) the upstream OpenWeather call
   throws/errors. With no key set, `GET /api/weather/dashboard` and `GET /api/weather/locations` return
   the mock-backed contract shapes and never 5xx on a missing key.
7. **In-memory caching with the §0/§4 TTLs.** `CacheModule.register({ isGlobal? })` with the in-memory
   store. Dashboard responses are cached **10 minutes** keyed by `location + unitSystem`; geocoding/
   location results are cached **6 hours** keyed by the query. A second identical request within the TTL
   returns the **same payload** without re-invoking the upstream HTTP path (verifiable by a repeated call
   yielding an identical object / no second fetch).
8. **camelCase JSON.** Responses serialize camelCase (no transformer); keys match the
   `@nimbus/shared-types` shapes exactly.
9. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` pass. Dedicated
   OpenWeather mocked-HTTP tests are **Phase 6** — do not add them here, but keep the suite green.

## Out of scope (do NOT do these here)
- **`UsersModule` / `PreferenceService` / endpoints #4–#11** — Tasks **3-4 / 3-5**. `WeatherModule` does
  not read or write the database; the `locations` array it returns is search results, not saved rows.
- **`PrismaModule` / `ConfigModule` / dependency install** — **Task 3-1** (precondition).
- **`HealthController` / prefix / CORS / `ValidationPipe`** — **Task 3-2** (precondition).
- **`Decimal`→`number` conversion** — that boundary concern is for the persisted saved-location rows in
  Tasks 3-4 / 3-5; the weather search results here are already plain `number`.
- **Dedicated weather tests (mocked HTTP, cache-hit, unit mapping)** — **Phase 6**.
- **Schema / shared-types edits** — Phases 2 / 1, read-only here.

## Approval gates / what NOT to run
- **No new dependency** — `@nestjs/cache-manager` + `cache-manager` and the HTTP approach were installed
  in Task 3-1. If the port reveals a need for an extra package (e.g. a timezone or HTTP retry lib), STOP
  and ask — do not add it silently.
- **No schema migration** — `WeatherModule` is stateless; it touches no Prisma artifact. If it seems to
  need one, STOP.
- **Do not commit an API key** — `OPENWEATHER_API_KEY` stays in `.env` (gitignored); the app must run
  with it blank.

## Files affected
- `apps/api/src/app/weather/weather.module.ts` — created.
- `apps/api/src/app/weather/weather.controller.ts` — created (endpoints #2, #3).
- `apps/api/src/app/weather/weather.service.ts` (or `weather.tokens.ts`) — created (`WEATHER_SERVICE`
  token + `IWeatherService` interface).
- `apps/api/src/app/weather/open-weather.service.ts` — created (`OpenWeatherService`).
- `apps/api/src/app/weather/mock-weather.service.ts` — created (`MockWeatherService`).
- `apps/api/src/app/app.module.ts` — modified (register `WeatherModule`; `CacheModule` if not global).

## Suggested commit
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

camelCase JSON, types from @nimbus/shared-types. Mocked-HTTP/cache tests
are Phase 6. build/lint/test green.
```
