# Impl 3-3 — WeatherModule: OpenWeather primary + Mock fallback + caching (endpoints #2, #3)

**Acceptance contract:** `docs/tasks/Tasks-3-3.md`
**Decision lock:** `docs/RoadMap.md` Phase 3 — "HTTP client" (native `fetch`, locked in Task 3-1) and
"Caching backend" (`@nestjs/cache-manager` in-memory, locked in Task 3-1) decisions; "new dependencies
require approval before install" constraint. No ADRs in `docs/decisions/`.
**Scope:** Create `apps/api/src/app/weather/` (5 files) and update `apps/api/src/app/app.module.ts` to
register `WeatherModule`. No schema change, no new dependency, no `@nimbus/shared-types` edits.

---

## Step 0 — Pre-flight

### Hard preconditions

Tasks 3-1 and 3-2 must both be committed on `main` before starting this task. Verify:

```powershell
git log --oneline -8
```

Expected: commits for Task 3-1 (`feat(api): add global PrismaModule + ConfigModule and Phase 3 backend
deps`) and Task 3-2 (`feat(api): add /health endpoint and wire prefix, CORS, and ValidationPipe`) are
present. `GET /health` must return `{ status: 'ok', service: 'nimbus-api', time: <ISO> }` and the
global prefix `api` with `/health` excluded must be wired in `main.ts`. If either is absent, STOP —
this task has hard dependencies on both.

Confirm working branch is clean:

```powershell
git status
```

Expected: `nothing to commit, working tree clean`. If files are staged or modified, resolve before
starting.

### Baseline build / lint / test green

```powershell
npm run build
npm test
npm run lint
```

All three must exit 0. Any failure is a pre-existing regression — fix it before continuing so this
task's changes are not blamed.

### Files to open before starting

- `apps/api/src/app/app.module.ts` — will receive the `WeatherModule` import
- `apps/api/src/app/app.controller.ts` — `@Controller` / `@Get` / `@Query` decorator style to mirror
- `libs/shared-types/src/lib/weather.ts` — the exact response interfaces to return
- `libs/shared-types/src/index.ts` — barrel to import from (`@nimbus/shared-types`)
- `.env.example` — confirms `OPENWEATHER_API_KEY` (blank = mock) and `PORT=3000`

---

## Step 1 — Create the DI token file and `IWeatherService` interface

**File:** `apps/api/src/app/weather/weather.tokens.ts` (new)

Define the `WEATHER_SERVICE` provider token and the `IWeatherService` interface. Both `OpenWeatherService`
and `MockWeatherService` will implement the interface, so the controller injects the token and receives
whichever implementation is bound.

```ts
import {
  LocationSuggestion,
  UnitSystem,
  WeatherDashboard,
} from '@nimbus/shared-types';

export const WEATHER_SERVICE = Symbol('WEATHER_SERVICE');

export interface IWeatherService {
  getDashboard(
    location: string,
    unitSystem: UnitSystem,
    userId: string,
  ): Promise<WeatherDashboard>;
  searchLocations(query: string): Promise<LocationSuggestion[]>;
}
```

**Verify:** `npm run build` exits 0. The new file introduces no new runtime dependency — it imports
only from `@nimbus/shared-types`, which is already a workspace library.

---

## Step 2 — Create `MockWeatherService`

**File:** `apps/api/src/app/weather/mock-weather.service.ts` (new)

`MockWeatherService` is `@Injectable()` and implements `IWeatherService`. It returns fully-shaped,
deterministic mock data with **no** network call and **no** API key. Every cardinality constraint from
AC(2) and AC(3) must hold in the mock:

- `getDashboard`: returns a `WeatherDashboard` where `hourly.length === 7` and `hourly[0].label === 'Now'`; `daily.length === 5`; `previews.length === 3`; `metrics.length === 4` with keys `'humidity'`, `'wind'`, `'precipitation'`, `'visibility'` each carrying a non-empty `trend: number[]`; `temperatureUnit` / `windUnit` derived from the `unitSystem` argument (`'imperial'` → `'F'` / `'mph'`; `'metric'` → `'C'` / `'m/s'`); `current.backgroundImageUrl` is a non-empty Unsplash URL; `locations` is an empty array (search results, not saved rows); `unitSystem` echoes the argument.
- `searchLocations`: returns a `LocationSuggestion[]` of at least one entry with `latitude`/`longitude`
  as plain `number`, `isDefault: false`, `sortOrder: 0`, and `id` absent or `null`.

Structure the hourly array so index 0 always has `label: 'Now'` and the remaining six carry formatted
time strings (e.g. `'1 PM'`, `'2 PM'`, …). Use a fixed Unsplash URL for `backgroundImageUrl` (e.g.
`'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'`). All numeric fields should be
realistic-looking but hardcoded.

**Verify:** `npm run build` exits 0. No external imports — only `@nimbus/shared-types` and `@nestjs/common`.

---

## Step 3 — Create `OpenWeatherService` (primary)

**File:** `apps/api/src/app/weather/open-weather.service.ts` (new)

`OpenWeatherService` is `@Injectable()` and implements `IWeatherService`. It uses the native `fetch`
global (Node 22 — no import needed) and reads configuration from `ConfigService` (injected via
`@nestjs/config`).

### 3-A — Config injection

Inject `ConfigService` (from `@nestjs/config`) in the constructor. Read two values:

- `OPENWEATHER_API_KEY` — the API key; treat blank/absent as "no key" (the fallback path, AC(6)).
- `OPENWEATHER_BASE_URL` — base URL for the OpenWeather API; default to
  `'https://api.openweathermap.org'` if not set.

Do **not** read `process.env` directly in feature code.

### 3-B — ZIP detection

In `getDashboard` and `searchLocations`, before choosing a geocoding endpoint, classify the `location`
/ `query` string:

- **ZIP**: matches `/^\d{5}(-\d{4})?$/` (5-digit or 9-digit `#####-####`).
- **City / city-state**: everything else, including `"San Francisco"` and `"San Francisco, CA"`.

### 3-C — Geocoding

- **ZIP inputs:** `GET ${baseUrl}/geo/1.0/zip?zip=<query>&appid=<key>` — returns a single object with
  `lat`, `lon`, `name`, `country`. Wrap it as a `LocationSuggestion`.
- **City/city-state inputs:** `GET ${baseUrl}/geo/1.0/direct?q=<query>&limit=5&appid=<key>` — returns
  an array. US state abbreviations in the form `"city, CA"` are passed as-is (OpenWeather's `/direct`
  endpoint accepts them). Map each entry to a `LocationSuggestion` with `latitude: entry.lat`,
  `longitude: entry.lon`, `name: entry.name`, `region: entry.state ?? ''`, `country: entry.country`,
  `id: null`, `isDefault: false`, `sortOrder: 0`.

### 3-D — One-Call weather fetch

Once lat/lon are resolved, call:

```
GET ${baseUrl}/data/3.0/onecall?lat=<lat>&lon=<lon>&exclude=minutely&units=<units>&appid=<key>
```

Where `units` is `'imperial'` for `UnitSystem === 'imperial'` and `'metric'` for `'metric'`.

### 3-E — Unit mapping

Produce the `temperatureUnit` and `windUnit` strings from `unitSystem`:
- `'imperial'` → `temperatureUnit: 'F'`, `windUnit: 'mph'`
- `'metric'` → `temperatureUnit: 'C'`, `windUnit: 'm/s'`

### 3-F — Timezone-aware time conversion

The one-call response includes `timezone_offset` (seconds offset from UTC). Use it to convert Unix
timestamps to local-time strings. Do **not** import a timezone library — use plain arithmetic:
`new Date((unixSeconds + timezone_offset) * 1000).toISOString().slice(...)`. Produce:

- `current.observedAt`: from `current.dt + timezone_offset` → ISO string (e.g. `'2024-01-15T14:30:00.000Z'`).
- `current.sunrise` / `current.sunset`: same treatment of `current.sunrise` / `current.sunset` Unix
  values.
- `hourly[i].time`: `hourly[i].dt + timezone_offset` → ISO string.
- `hourly[0].label`: `'Now'`; `hourly[1..6].label`: format as `'1 PM'` / `'11 AM'` using
  `((utcHour + offsetHours) % 24)` with 12-hour AM/PM formatting. Slice to 7 entries from the one-call
  `hourly` array.

### 3-G — Shape the `WeatherDashboard`

From the one-call response produce:

- **`current`** (`CurrentWeather`): `location` from the geocoding result name, `condition` from
  `current.weather[0].main`, `summary` and `description` from `current.weather[0].main` /
  `current.weather[0].description`, `temperature: current.temp`, `feelsLike: current.feels_like`,
  `low: daily[0].temp.min`, `high: daily[0].temp.max`, `backgroundImageUrl` from the condition→Unsplash
  map (3-H).
- **`hourly`** (`HourlyForecast[]`, length 7): `label` (3-F), `time` (3-F), `condition:
  h.weather[0].main`, `temperature: h.temp`, `windSpeed: h.wind_speed`,
  `precipitationChance: (h.pop ?? 0) * 100`.
- **`daily`** (`DailyForecast[]`, length 5): from `daily[0..4]`, each: `day` as 3-letter weekday
  (derive from `d.dt + timezone_offset`), `date` as ISO date string, `condition: d.weather[0].main`,
  `high: d.temp.max`, `low: d.temp.min`, `precipitationChance: (d.pop ?? 0) * 100`.
- **`previews`** (`WeatherPreview[]`, length 3): from `daily[0..2]`, each: `condition`, `high`, `low`,
  `description: d.weather[0].description`.
- **`metrics`** (`WeatherMetric[]`, length 4, keys in order `'humidity'`, `'wind'`, `'precipitation'`,
  `'visibility'`):
  - `humidity`: `value: String(current.humidity)`, `unit: '%'`, `hint: 'Current humidity'`,
    `trend`: last 7 `hourly` `humidity` values as `number[]`.
  - `wind`: `value: String(Math.round(current.wind_speed))`, `unit: windUnit`, `hint: 'Current wind speed'`,
    `trend`: last 7 `hourly` `wind_speed` values.
  - `precipitation`: `value: String(Math.round((daily[0].pop ?? 0) * 100))`, `unit: '%'`,
    `hint: 'Chance of rain today'`, `trend`: 7 `hourly` `pop` values × 100.
  - `visibility`: `value: String(Math.round((current.visibility ?? 0) / 1000))`, `unit: 'km'`,
    `hint: 'Current visibility'`, `trend`: repeat `current.visibility / 1000` seven times (one-call
    does not give hourly visibility — a flat line is acceptable).
- **`locations`**: empty array `[]` (search results, not saved rows).
- **`unitSystem`**: echoes the argument.
- **`temperatureUnit`** / **`windUnit`**: from 3-E.

### 3-H — Condition→Unsplash background map

Implement a private `backgroundUrlForCondition(condition: string): string` method. Map the
`current.weather[0].main` string (OpenWeather main-condition labels) to Unsplash photo URLs. Minimum
set to cover:

| Condition | Unsplash URL |
|-----------|-------------|
| `'Thunderstorm'` | `'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28'` |
| `'Drizzle'` / `'Rain'` | `'https://images.unsplash.com/photo-1428592953211-077101b2021b'` |
| `'Snow'` | `'https://images.unsplash.com/photo-1491002052546-bf38f186af56'` |
| `'Clear'` | `'https://images.unsplash.com/photo-1601297183305-6df142704ea2'` |
| `'Clouds'` | `'https://images.unsplash.com/photo-1534088568595-a066f410bcda'` |
| `'Fog'` / `'Mist'` / `'Haze'` | `'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'` |
| default | `'https://images.unsplash.com/photo-1601297183305-6df142704ea2'` |

Use a `switch` or `Record<string, string>` lookup; the keys must match OpenWeather `main` values
exactly (title-case, e.g. `'Clear'` not `'clear'`).

### 3-I — `searchLocations` implementation

Call geocoding (3-C) and map the results to `LocationSuggestion[]`. Return the array. Uses the same
ZIP-detection logic (3-B). Default query `"San Francisco"` is the controller's responsibility, not the
service's.

**Verify:** `npm run build` exits 0. Confirm there are no `process.env` reads in the service body and
no new imports beyond `@nestjs/common`, `@nestjs/config`, and `@nimbus/shared-types`.

---

## Step 4 — Create `WeatherController`

**File:** `apps/api/src/app/weather/weather.controller.ts` (new)

Mirror the `@Controller` / `@Get` / `@Query` decorator style from `apps/api/src/app/app.controller.ts`.

```ts
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { LocationSuggestion, UnitSystem, WeatherDashboard } from '@nimbus/shared-types';
import { IWeatherService, WEATHER_SERVICE } from './weather.tokens';

@Controller('weather')
export class WeatherController {
  constructor(
    @Inject(WEATHER_SERVICE) private readonly weatherService: IWeatherService,
  ) {}

  @Get('dashboard')
  getDashboard(
    @Query('location') location: string,
    @Query('unitSystem') unitSystem: UnitSystem,
    @Query('userId') userId: string,
  ): Promise<WeatherDashboard> {
    return this.weatherService.getDashboard(location, unitSystem, userId);
  }

  @Get('locations')
  searchLocations(
    @Query('query') query = 'San Francisco',
  ): Promise<LocationSuggestion[]> {
    return this.weatherService.searchLocations(query);
  }
}
```

With the global prefix `api` (Task 3-2) and `@Controller('weather')`, the routes resolve as:
- `GET /api/weather/dashboard?location=...&unitSystem=...&userId=...`
- `GET /api/weather/locations?query=...`

**Verify:** `npm run build` exits 0.

---

## Step 5 — Create `WeatherModule` with fallback policy and caching

**File:** `apps/api/src/app/weather/weather.module.ts` (new)

The module wires three concerns:
1. `CacheModule` registration with in-memory store (Task 3-1 installed `@nestjs/cache-manager`).
2. A factory provider for `WEATHER_SERVICE` that tries `OpenWeatherService` and falls back to
   `MockWeatherService` when the key is absent — the factory wraps calls in try/catch so upstream
   failures also fall back.
3. Cache interception — dashboard responses cached 10 minutes keyed by `location + unitSystem`;
   geocoding cached 6 hours keyed by query.

### 5-A — `CacheModule` registration

```ts
import { CacheModule } from '@nestjs/cache-manager';

// Inside @Module imports:
CacheModule.register({ isGlobal: false }),
```

`isGlobal: false` is fine — `WeatherModule` owns its own cache store. The TTL is applied per-call via
`@CacheKey` / `@CacheTTL` decorators or a manual cache injection pattern (see 5-B).

### 5-B — Caching strategy

NestJS `@nestjs/cache-manager` provides `@UseInterceptors(CacheInterceptor)` with `@CacheKey` /
`@CacheTTL` decorators for controller-level caching. However, because the cache key for dashboard must
incorporate **two** query params (`location` + `unitSystem`) and the cache key for locations depends
on the `query` param, use the manual injection pattern inside the service wrapper rather than relying
on the URL-based default key.

Inject `Cache` (from `@nestjs/cache-manager`) into a thin `CachedWeatherService` wrapper class, or
apply the caching directly in the factory provider using `CACHE_MANAGER`. The simplest correct approach:

- Register `CacheModule.register()` in `WeatherModule`.
- In the `WeatherModule` factory provider for `WEATHER_SERVICE`, inject `CACHE_MANAGER` alongside
  `ConfigService`, `OpenWeatherService`, and `MockWeatherService`. Return a wrapper object whose
  `getDashboard` method:
  1. Checks the cache for key `dashboard:${location}:${unitSystem}` with TTL **600 s** (10 min).
  2. On miss: calls the real service, caches the result, returns it.
  3. On hit: returns the cached value.
  And whose `searchLocations` method:
  1. Checks the cache for key `locations:${query}` with TTL **21600 s** (6 hr).
  2. On miss: calls the real service, caches the result, returns it.
  3. On hit: returns the cached value.

```ts
import { Module } from '@nestjs/common';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { WeatherController } from './weather.controller';
import { OpenWeatherService } from './open-weather.service';
import { MockWeatherService } from './mock-weather.service';
import { WEATHER_SERVICE } from './weather.tokens';

@Module({
  imports: [CacheModule.register()],
  controllers: [WeatherController],
  providers: [
    OpenWeatherService,
    MockWeatherService,
    {
      provide: WEATHER_SERVICE,
      inject: [ConfigService, OpenWeatherService, MockWeatherService, CACHE_MANAGER],
      useFactory: (
        config: ConfigService,
        openWeather: OpenWeatherService,
        mock: MockWeatherService,
        cache: Cache,
      ) => {
        const hasKey = !!config.get<string>('OPENWEATHER_API_KEY');
        const primary = hasKey ? openWeather : mock;

        return {
          async getDashboard(location: string, unitSystem: string, userId: string) {
            const cacheKey = `dashboard:${location}:${unitSystem}`;
            const hit = await cache.get(cacheKey);
            if (hit) return hit;
            let result;
            try {
              result = await primary.getDashboard(location, unitSystem as any, userId);
            } catch {
              result = await mock.getDashboard(location, unitSystem as any, userId);
            }
            await cache.set(cacheKey, result, 600 * 1000); // 10 min in ms
            return result;
          },
          async searchLocations(query: string) {
            const cacheKey = `locations:${query}`;
            const hit = await cache.get(cacheKey);
            if (hit) return hit;
            let result;
            try {
              result = await primary.searchLocations(query);
            } catch {
              result = await mock.searchLocations(query);
            }
            await cache.set(cacheKey, result, 21600 * 1000); // 6 hr in ms
            return result;
          },
        };
      },
    },
  ],
})
export class WeatherModule {}
```

> **Note on TTL units:** `cache-manager` v5+ (the version installed by `@nestjs/cache-manager` for
> Nest 11) accepts TTL in **milliseconds**. Verify against the installed version by checking
> `node_modules/cache-manager/package.json` — if `version` starts with `4.x`, the unit is **seconds**
> instead. Adjust the `600` / `21600` constants accordingly. Do not install a different version.

> **STOP gate — no new dependency.** If the above pattern requires any import not already present from
> Task 3-1 (`@nestjs/cache-manager`, `cache-manager`), STOP and raise it — no silent additions.

**Verify:** `npm run build` exits 0. Confirm `WeatherModule` compiles without type errors and the
factory provider shape satisfies `IWeatherService`.

---

## Step 6 — Register `WeatherModule` in `AppModule`

**File:** `apps/api/src/app/app.module.ts` (modified)

Add `WeatherModule` to the `imports` array. The existing imports from Tasks 3-1 and 3-2
(`ConfigModule`, `PrismaModule`, `HealthController` registration) must be left untouched.

```ts
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    // ... existing imports from Tasks 3-1 and 3-2 ...
    WeatherModule,
  ],
  // ... rest unchanged ...
})
export class AppModule {}
```

**Verify:** `npm run build` exits 0. The module graph must resolve: `WeatherModule` imports `CacheModule`;
the `WEATHER_SERVICE` factory injects `ConfigService` (global from Task 3-1's `ConfigModule.forRoot`)
and both concrete services.

---

## Step 7 — Manual smoke test (key-less)

With no `OPENWEATHER_API_KEY` set (or blank in `.env`), start the API and verify the mock fallback
path:

```powershell
# Ensure OPENWEATHER_API_KEY is blank in .env
Get-Content .env | Select-String "OPENWEATHER_API_KEY"

# Start the API (pick whichever serve method is available):
npx nx serve api
# or: node dist/apps/api/main.js  (after npm run build)
```

In a second terminal:

```powershell
# Endpoint #2 — dashboard
$response = Invoke-RestMethod `
  "http://localhost:3000/api/weather/dashboard?location=San+Francisco%2C+CA&unitSystem=imperial&userId=anonymous"
$response | ConvertTo-Json -Depth 10
```

Verify the response against AC(2):
- `$response.hourly.Count -eq 7` → true
- `$response.hourly[0].label -eq 'Now'` → true
- `$response.daily.Count -eq 5` → true
- `$response.previews.Count -eq 3` → true
- `$response.metrics.Count -eq 4` → true
- `$response.metrics | ForEach-Object { $_.key }` → `humidity`, `wind`, `precipitation`, `visibility` (in order)
- Each metric's `trend` is a non-empty array
- `$response.temperatureUnit -eq 'F'` and `$response.windUnit -eq 'mph'` → true
- `$response.current.backgroundImageUrl` is a non-empty string

```powershell
# Endpoint #3 — locations
$locs = Invoke-RestMethod "http://localhost:3000/api/weather/locations"
$locs | ConvertTo-Json
```

Verify AC(3):
- Returns an array with at least one element
- `$locs[0].latitude` is a number (not a string, not `null`)
- `$locs[0].isDefault -eq $false`

```powershell
# Cache hit — call dashboard twice and confirm same object
$r1 = Invoke-RestMethod "http://localhost:3000/api/weather/dashboard?location=Chicago&unitSystem=imperial&userId=anonymous"
$r2 = Invoke-RestMethod "http://localhost:3000/api/weather/dashboard?location=Chicago&unitSystem=imperial&userId=anonymous"
# Confirm key values match (same mock payload)
$r1.current.location -eq $r2.current.location
```

Expected: `True`.

Stop the server (`Ctrl+C`) after verification.

**Verify:** All manual checks above pass. The app returns contract-shaped JSON for both endpoints with
no API key set and never returns a 5xx error.

---

## Step 8 — Full build / lint / test gate

```powershell
npm run build
```

Expected: exits 0 across the workspace (`apps/api`, `apps/web`, `libs/shared-types`).

```powershell
npm run lint
```

Expected: exits 0. No ESLint errors in the new weather files.

```powershell
npm test
```

Expected: exits 0. No new test files are added in this task (dedicated weather tests are Phase 6);
`passWithNoTests: true` keeps the `api` project green.

**Verify:** All three commands exit 0 on the post-implementation workspace.

---

## Step 9 — Diff check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new files (untracked → to be added):**

- `apps/api/src/app/weather/weather.tokens.ts`
- `apps/api/src/app/weather/mock-weather.service.ts`
- `apps/api/src/app/weather/open-weather.service.ts`
- `apps/api/src/app/weather/weather.controller.ts`
- `apps/api/src/app/weather/weather.module.ts`

**Expected modified file:**

- `apps/api/src/app/app.module.ts`

**Must NOT appear:**

- Any file in `libs/shared-types/` (read-only)
- Any file in `prisma/` (no schema change)
- `package.json` (no new dependency)
- `.env` (must remain gitignored)

If any unexpected file appears, investigate and revert before committing.

### Stage and commit

```powershell
git add apps/api/src/app/weather/ apps/api/src/app/app.module.ts
git status
```

Confirm the staged set matches the six files above and nothing else, then commit:

```powershell
git commit -m "feat(api): add WeatherModule with OpenWeather primary, mock fallback, caching

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
are Phase 6. build/lint/test green."
```

No `Co-Authored-By` trailer.

**Verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit above is at HEAD; the stat shows exactly the 6 files listed.

---

## Summary of gates

| Step | Gate |
|------|------|
| 0 | Tasks 3-1 and 3-2 committed; `git status` clean; `build` + `test` + `lint` green at baseline |
| 1 | `weather.tokens.ts` created; `npm run build` exits 0 |
| 2 | `mock-weather.service.ts` created; all mock cardinalities correct; `npm run build` exits 0 |
| 3 | `open-weather.service.ts` created; no `process.env` reads; `npm run build` exits 0 |
| 4 | `weather.controller.ts` created; routes resolve at `/api/weather/dashboard` and `/api/weather/locations`; `npm run build` exits 0 |
| 5 | `weather.module.ts` created; STOP if any new import is needed beyond Task 3-1 packages; `npm run build` exits 0 |
| 6 | `app.module.ts` updated with `WeatherModule`; `npm run build` exits 0 |
| 7 | Key-less smoke test passes both endpoints; cache-hit returns same payload; no 5xx errors |
| 8 | `npm run build` + `npm run lint` + `npm test` all exit 0 |
| 9 | Staged diff is exactly 6 files; commit message matches Tasks doc; no `Co-Authored-By` trailer |
