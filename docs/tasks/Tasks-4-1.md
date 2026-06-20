# Task 4-1 — WeatherApiService + HttpClient + env/proxy

## Surface
Frontend foundation in `apps/web` only — the `HttpClient`-based `WeatherApiService` (a direct port of
the source `weatherApi.ts`), the `provideHttpClient()` registration in `app.config.ts`, the
`environment.ts` env file, and the dev `proxy.conf.json` wired onto the `serve` target. No `WeatherStore`,
no components, no styles, no `lucide-angular` (those are Tasks 4-2 … 4-6).

## Why
Every later Phase 4 task that talks to the Phase 3 API needs a single typed HTTP seam first. This task
ports `weatherApi.ts` (one function per §0.2 endpoint) into an injectable Angular service, registers the
`HttpClient` provider it depends on, and stands up the dev proxy so the browser's same-origin `/api` +
`/health` requests reach the Nest API on `:3000` (Angular dev server runs on `:4200`). It uses **no new
dependency** — `HttpClient` ships in `@angular/common` and `rxjs` is already installed — so it can land
before the `lucide-angular` approval gate in Task 4-6.

## Depends on
- **Roadmap Phase 4 — Frontend (Angular)** (`docs/RoadMap.md`, "### Phase 4"): the "API service —
  `WeatherApiService`" and "Env / proxy" scope bullets, the `provideHttpClient` and env/proxy "Decisions
  needed", and the "frontend only" constraint. Enumerated task-split item **1**.
- **Phase 3 — Backend (NestJS) — Handoff** (`docs/handoffs/Phase-3-Handoff.md`): the contract is **locked
  and live** on `http://localhost:3000`; the global prefix is `api` with `/health` **outside** it; CORS
  already allows `http://localhost:4200`; mutating saved-location calls return **`204 No Content`** (no
  body).
- **Phase 1 — Shared types — Handoff** (`docs/handoffs/Phase-1-Handoff.md`): import contract types from
  `@nimbus/shared-types` directly; the alias is compile-verified from `apps/web`. Do not redeclare fields.
- No ADRs exist in `docs/decisions/` — the roadmap is the only locked source. Per the roadmap's Decisions
  note, the search-debounce wiring and `lucide-angular` choice are the natural ADR candidates; this task
  touches neither.

## Required reading
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\services\weatherApi.ts` —
  **Mirror:** the canonical source. `apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''`,
  `userId = 'anonymous'`, and the ten exported functions plus the implicit `/health`. Port each `fetch`
  call to the equivalent `HttpClient` call against the **same URL, method, and body**.
- `libs/shared-types/src/lib/weather.ts` + `libs/shared-types/src/lib/requests.ts` — **Mirror:** the
  response/request shapes (`WeatherDashboard`, `LocationSuggestion`, `UserPreferences`,
  `UpdatePreferencesRequest`, `SaveLocationRequest`, `ReorderSavedLocationsRequest`). Import via
  `@nimbus/shared-types`; do not redeclare.
- `apps/web/src/app/app.config.ts` — **Mirror:** current `providers: [provideBrowserGlobalErrorListeners()]`;
  add `provideHttpClient()` (from `@angular/common/http`) alongside it.
- `apps/web/project.json` — **Mirror:** the `serve` target uses `@angular/build:dev-server`; the
  `development` configuration is where `proxyConfig` is added (the `@angular/build` dev-server reads
  `proxyConfig` from the build/serve options).
- `docs/handoffs/Phase-3-Handoff.md` — **Mirror:** the live endpoint list, the `/health`-outside-`/api`
  rule, and the `204`-no-body mutating responses.

## Acceptance criteria
1. **`WeatherApiService` created** at `apps/web/src/app/core/weather-api.service.ts` (or
   `apps/web/src/app/services/weather-api.service.ts`): an `@Injectable({ providedIn: 'root' })` class
   that injects `HttpClient` (constructor or `inject()`) and exposes **one method per §0.2 endpoint
   (#1–#11)**, a 1:1 port of `weatherApi.ts`, each typed via `@nimbus/shared-types`. Methods return
   RxJS `Observable<T>` (not Promises — this is the Angular idiom; `WeatherStore` in Task 4-2 consumes
   them). Required methods and shapes:
   - `getWeatherDashboard(location: string, unitSystem: UnitSystem): Observable<WeatherDashboard>` →
     `GET /api/weather/dashboard` with query params `location`, `unitSystem`, `userId`.
   - `searchLocations(query: string): Observable<LocationSuggestion[]>` →
     `GET /api/weather/locations?query=…`.
   - `getPreferences(): Observable<UserPreferences>` → `GET /api/users/anonymous/preferences`.
   - `updatePreferences(unitSystem: UnitSystem): Observable<UserPreferences>` →
     `PUT /api/users/anonymous/preferences` body `{ unitSystem }`.
   - `getSavedLocations(): Observable<LocationSuggestion[]>` → `GET /api/users/anonymous/locations`.
   - `saveLocation(location: LocationSuggestion): Observable<void>` →
     `POST /api/users/anonymous/locations` body `{ ...location, isDefault: false }`.
   - `updateSavedLocation(location: LocationSuggestion): Observable<void>` →
     `PUT /api/users/anonymous/locations/{id}` body = the location (guard: throw if `!location.id`,
     matching the source).
   - `deleteSavedLocation(locationId: number): Observable<void>` →
     `DELETE /api/users/anonymous/locations/{id}`.
   - `reorderSavedLocations(locationIds: number[]): Observable<void>` →
     `PUT /api/users/anonymous/locations/reorder` body `{ locationIds }`.
   - `setDefaultLocation(locationId: number): Observable<void>` →
     `PUT /api/users/anonymous/locations/{id}/default` (no body).
   The mutating calls (`save`/`update`/`delete`/`reorder`/`setDefault`) are typed `Observable<void>` to
   match the API's `204 No Content` (no response body parsed).
2. **`userId` is the constant `'anonymous'`** held in one place in the service, matching the source. URLs
   are built from `apiBaseUrl` (see #4) — never hard-code an absolute origin.
3. **`provideHttpClient()` registered.** `apps/web/src/app/app.config.ts` adds `provideHttpClient()`
   (imported from `@angular/common/http`) to `providers`, keeping the existing
   `provideBrowserGlobalErrorListeners()`. **No interceptors** (`userId` is a route/param concern, not
   auth — the roadmap recommendation).
4. **`environment.ts` created** at `apps/web/src/environments/environment.ts` exporting an `environment`
   object with `apiBaseUrl: string` defaulting to `''` (so same-origin requests hit the dev proxy).
   `WeatherApiService` reads `apiBaseUrl` from this file (replacing the source's `import.meta.env`).
5. **`proxy.conf.json` created** at `apps/web/proxy.conf.json` forwarding **both** `/api` **and**
   `/health` to `http://localhost:3000` (`"target": "http://localhost:3000", "secure": false`), and
   wired via `proxyConfig` on the `serve` target's `development` configuration in `apps/web/project.json`.
   When `nx serve web` runs against `nx serve api`, a browser `GET /health` and `GET /api/weather/locations`
   both reach `:3000`.
6. **Build / lint / test stay green.** `npm run build`, `npm run lint`, and `npm test` all pass across the
   workspace. Each endpoint method must compile against the `@nimbus/shared-types` shapes (no `any`). Do
   not add component/service specs (testing is Phase 6); existing specs stay green.

## What NOT to modify
- **`WeatherStore` signals + RxJS search debounce** — **Task 4-2**. This task ships the service the store
  will call; it does **not** wire debounce, `onMounted` boot, or any signal state.
- **Any component (shell, topbar, dashboard, reusable), `styles.scss`, `index.html` title/favicon,
  `lucide-angular`** — Tasks **4-3 … 4-6**. The Nx-welcome `App` placeholder stays in place this task.
- **`libs/shared-types`** (Phase 1, read-only), **`prisma/schema.prisma`** (Phase 2), **`apps/api`**
  (Phase 3) — do not touch; consume the contract as served.
- No schema migration / no new dependency unless the roadmap says so — `HttpClient` (`@angular/common`)
  and `rxjs` are already installed, so **no install runs in this task**. If a step seems to need a new
  package, STOP and ask.

## Suggested commit
```
feat(web): add WeatherApiService, HttpClient provider, and dev proxy/env

Port the source weatherApi.ts into an injectable WeatherApiService
(providedIn: 'root') with one HttpClient method per §0.2 endpoint
(#1-#11), userId = 'anonymous', typed end-to-end via @nimbus/shared-types
and returning Observables. Mutating saved-location calls are typed void
to match the API's 204 No Content.

- Register provideHttpClient() in app.config.ts (no interceptors).
- Add environments/environment.ts exposing apiBaseUrl ('' = same-origin).
- Add proxy.conf.json forwarding /api and /health to :3000, wired via the
  serve target's proxyConfig (Angular 4200 -> Nest 3000).

No new dependency (HttpClient + rxjs already installed). build/lint/test
green; the WeatherStore and components consuming this service follow.
```
