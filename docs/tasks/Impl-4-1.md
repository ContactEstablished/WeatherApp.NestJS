# Impl 4-1 — WeatherApiService + HttpClient + env/proxy

**Acceptance contract:** `docs/tasks/Tasks-4-1.md`
**Decision lock:** No ADRs in `docs/decisions/`. Locked by `docs/RoadMap.md` Phase 4 (scope
bullet 1: "API service — `WeatherApiService`" and "Env / proxy"; "no new dependency" constraint
since `HttpClient` ships in `@angular/common` and `rxjs ~7.8.0` are already installed). Phase 3
backend contract is locked and live per `docs/handoffs/Phase-3-Handoff.md` (global prefix `api`,
`/health` outside it, CORS allows `http://localhost:4200`, mutating saved-location calls return
`204 No Content`).
**Scope:** Frontend foundation in `apps/web` only — four file changes (one new service file,
one modified `app.config.ts`, one new `environment.ts`, one new `proxy.conf.json`) plus one
`project.json` edit to wire `proxyConfig`. No schema change, no new npm dependency, no
`apps/api` or `libs/shared-types` changes.

---

## Step 0 — Pre-flight

### 0-A — Branch / working-tree check

```powershell
git log --oneline -5
git status
```

Expected: working tree clean on `main`; recent history includes the Phase 3 backend commits
(the last one being `feat(api): add saved-location CRUD, reorder, and set-default
(endpoints #6-#11)`). If the tree is dirty, stash or commit before continuing.

### 0-B — Baseline build / lint / test green

```powershell
npm run build
npm run lint
npm test
```

All three must exit 0 before any file is touched. A pre-existing failure is a regression from
a prior task — resolve it before continuing.

### 0-C — Files to open before starting

Verify these files exist and read them in full before writing any code:

| File | Purpose |
|------|---------|
| `apps/web/src/app/app.config.ts` | Current `providers: [provideBrowserGlobalErrorListeners()]` — `provideHttpClient()` is added here |
| `apps/web/project.json` | `serve` target's `development` configuration — `proxyConfig` is added here |
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\services\weatherApi.ts` | Canonical source: ten `fetch`-based functions plus the `userId = 'anonymous'` constant to port 1:1 |
| `libs/shared-types/src/lib/weather.ts` | Response types: `WeatherDashboard`, `LocationSuggestion`, `UserPreferences`, `UnitSystem` |
| `libs/shared-types/src/lib/requests.ts` | Request types: `UpdatePreferencesRequest`, `SaveLocationRequest`, `ReorderSavedLocationsRequest` |
| `libs/shared-types/src/index.ts` | Barrel — confirms everything is exported via `@nimbus/shared-types` |

**STOP if any of the above files do not exist** — a precondition phase has not been completed.

**Confirm no `WeatherApiService` already exists:**

```powershell
Test-Path apps/web/src/app/core/weather-api.service.ts
Test-Path apps/web/src/app/services/weather-api.service.ts
```

Both must return `False`. If either exists, investigate before proceeding.

**Confirm no `environment.ts` already exists:**

```powershell
Test-Path apps/web/src/environments/environment.ts
```

Must return `False`.

---

## Step 1 — Create `apps/web/src/environments/environment.ts`

**File:** `apps/web/src/environments/environment.ts` (new file — create the `environments/`
directory first)

This file replaces the source's `import.meta.env.VITE_API_BASE_URL`. The default value of `''`
means all `/api` and `/health` requests are same-origin, which the dev proxy (Step 3) then
forwards to `:3000`. In a production build the value can be overridden by environment-specific
files (future Phase 7 concern — do not add those files now).

```typescript
export const environment = {
  apiBaseUrl: '',
};
```

**Checklist before saving:**

- The export name is exactly `environment` (the `WeatherApiService` in Step 2 imports it by
  this name).
- `apiBaseUrl` defaults to `''` (empty string = same-origin, proxy handles the forward).
- No Angular-specific imports or decorators — this is a plain TypeScript module.
- No `environment.development.ts` or `environment.production.ts` — those are Phase 7.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The new file is a standalone module with no imports; it cannot introduce
build errors on its own. Confirm no TypeScript errors appear for the `apps/web` project.

---

## Step 2 — Create `WeatherApiService`

**File:** `apps/web/src/app/core/weather-api.service.ts` (new file — create the `core/`
directory first)

This is a direct port of `weatherApi.ts`. Replace every `fetch` call with the equivalent
`HttpClient` call, replace `import.meta.env.VITE_API_BASE_URL ?? ''` with the `environment.ts`
import, and replace `Promise<T>` return types with `Observable<T>`. The `userId` constant
remains a single string literal in one place. The ten source functions become ten methods on
the class.

Key translation rules from source → Angular:
- `fetch(url)` → `this.http.get<T>(url)`
- `fetch(url, { method: 'PUT', body: JSON.stringify(x) })` → `this.http.put<T>(url, x)`
- `fetch(url, { method: 'POST', body: JSON.stringify(x) })` → `this.http.post<T>(url, x)`
- `fetch(url, { method: 'DELETE' })` → `this.http.delete<T>(url)`
- 204 No Content responses: type the return as `Observable<void>` and use
  `this.http.put<void>(url, body)` / `this.http.post<void>(url, body)` /
  `this.http.delete<void>(url)`. `HttpClient` emits `void` for 204 responses with no body.
- Query params: use `HttpParams` (from `@angular/common/http`) instead of `URLSearchParams`.
- The error-throwing `if (!response.ok)` guards from the source are omitted — `HttpClient`
  throws `HttpErrorResponse` automatically on non-2xx status codes.
- The `updateSavedLocation` id-guard (`if (!location.id) throw ...`) **is** preserved, matching
  the source exactly.

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import type {
  LocationSuggestion,
  ReorderSavedLocationsRequest,
  UnitSystem,
  UserPreferences,
  WeatherDashboard,
} from '@nimbus/shared-types';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class WeatherApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly userId = 'anonymous';

  // #2 — GET /api/weather/dashboard
  getWeatherDashboard(location: string, unitSystem: UnitSystem): Observable<WeatherDashboard> {
    const params = new HttpParams()
      .set('location', location)
      .set('unitSystem', unitSystem)
      .set('userId', this.userId);
    return this.http.get<WeatherDashboard>(`${this.apiBaseUrl}/api/weather/dashboard`, { params });
  }

  // #3 — GET /api/weather/locations
  searchLocations(query: string): Observable<LocationSuggestion[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<LocationSuggestion[]>(`${this.apiBaseUrl}/api/weather/locations`, { params });
  }

  // #4 — GET /api/users/anonymous/preferences
  getPreferences(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`${this.apiBaseUrl}/api/users/${this.userId}/preferences`);
  }

  // #5 — PUT /api/users/anonymous/preferences
  updatePreferences(unitSystem: UnitSystem): Observable<UserPreferences> {
    const body: Pick<UserPreferences, 'unitSystem'> = { unitSystem };
    return this.http.put<UserPreferences>(
      `${this.apiBaseUrl}/api/users/${this.userId}/preferences`,
      body,
    );
  }

  // #6 — GET /api/users/anonymous/locations
  getSavedLocations(): Observable<LocationSuggestion[]> {
    return this.http.get<LocationSuggestion[]>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations`,
    );
  }

  // #7 — POST /api/users/anonymous/locations  (204 No Content)
  saveLocation(location: LocationSuggestion): Observable<void> {
    return this.http.post<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations`,
      { ...location, isDefault: false },
    );
  }

  // #8 — PUT /api/users/anonymous/locations/{id}  (204 No Content)
  updateSavedLocation(location: LocationSuggestion): Observable<void> {
    if (!location.id) {
      return throwError(() => new Error('Cannot update a location without an id.'));
    }
    return this.http.put<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations/${location.id}`,
      location,
    );
  }

  // #9 — DELETE /api/users/anonymous/locations/{id}  (204 No Content)
  deleteSavedLocation(locationId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations/${locationId}`,
    );
  }

  // #11 — PUT /api/users/anonymous/locations/reorder  (204 No Content)
  reorderSavedLocations(locationIds: number[]): Observable<void> {
    const body: ReorderSavedLocationsRequest = { locationIds };
    return this.http.put<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations/reorder`,
      body,
    );
  }

  // #10 — PUT /api/users/anonymous/locations/{id}/default  (204 No Content)
  setDefaultLocation(locationId: number): Observable<void> {
    return this.http.put<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations/${locationId}/default`,
      null,
    );
  }
}
```

**Implementation notes:**

- `providedIn: 'root'` — the service is tree-shaken into the root injector; no module
  registration is needed beyond the `provideHttpClient()` in Step 3.
- `userId = 'anonymous'` is a `private readonly` field on the class — one place, matching the
  source's single-constant pattern.
- `setDefaultLocation` sends `null` as the body — the Phase 3 API accepts the `PUT` with no
  body (the endpoint ignores it). `HttpClient.put` requires a body argument; `null` is the
  correct way to express "no body" for Angular's `HttpClient`.
- All ten source functions are present; `/health` (#1) is intentionally omitted from the
  service — the roadmap's task description lists #1–#11 but `getWeatherDashboard` is #2 and
  the source `weatherApi.ts` does not export a `getHealth` function. Do not add one.
- Import path for `environment`: `'../environments/environment'` — relative from
  `apps/web/src/app/core/` to `apps/web/src/environments/`.
- No `any` anywhere — every method is typed against `@nimbus/shared-types` interfaces.

**Verify:**

```powershell
npm run build
```

Expected: exits 0 with no type errors in `apps/web`. Confirm the `@nimbus/shared-types`
imports resolve and the `HttpParams` / `HttpClient` imports resolve from `@angular/common/http`.

---

## Step 3 — Register `provideHttpClient()` in `app.config.ts`

**File:** `apps/web/src/app/app.config.ts` (modify)

Add `provideHttpClient()` to the `providers` array alongside the existing
`provideBrowserGlobalErrorListeners()`. Import `provideHttpClient` from
`@angular/common/http`.

The final file must read:

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
  ]
};
```

**Checklist before saving:**

- `provideBrowserGlobalErrorListeners()` is **kept** — do not remove the existing provider.
- `provideHttpClient()` is called with **no arguments** — no interceptors (acceptance
  criterion 3: "userId is a route/param concern, not auth").
- `provideHttpClient` is imported from `@angular/common/http`, not from `@angular/common`.
- No other providers are added or removed.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The `WeatherApiService` (created in Step 2) depends on `HttpClient`; if
`provideHttpClient()` is missing the build will fail with a missing-provider error at runtime
but the compile step may still pass. A subsequent `npm test` will catch DI errors if any
spec bootstraps the app — the baseline specs do not, so compile green is the gate here.

---

## Step 4 — Create `proxy.conf.json`

**File:** `apps/web/proxy.conf.json` (new file at the `apps/web/` root, not inside `src/`)

This file tells the Angular dev server (`@angular/build:dev-server`) to forward requests
with the `/api` and `/health` path prefixes to the NestJS API process on port 3000. It
replaces the Vite `proxy` configuration in the source app.

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  },
  "/health": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

**Checklist before saving:**

- Both `/api` and `/health` are listed — `/health` is outside the `api` global prefix on
  the NestJS side, so it needs its own proxy entry (acceptance criterion 5).
- `"target": "http://localhost:3000"` — Nest runs on 3000 in dev; the Angular dev server
  runs on 4200.
- `"secure": false` — no TLS in local dev.
- `"changeOrigin": true` — rewrites the `Host` header to `localhost:3000` so Nest accepts
  the forwarded request.
- File location is `apps/web/proxy.conf.json` (project root, not `src/`) — the build system
  reads it from the path specified in `project.json` (Step 5).

**Verify:**

```powershell
npm run build
```

Expected: exits 0. A JSON-only file cannot introduce build errors; this step is a pre-check
before the `project.json` wiring in Step 5.

---

## Step 5 — Wire `proxyConfig` in `apps/web/project.json`

**File:** `apps/web/project.json` (modify)

Add `"proxyConfig": "apps/web/proxy.conf.json"` to the `serve` target's `development`
configuration. The `@angular/build:dev-server` executor reads this option and applies the
proxy rules when `nx serve web` is run in development mode.

Current `serve.configurations.development` block (before edit):

```json
"development": {
  "buildTarget": "web:build:development"
}
```

After edit:

```json
"development": {
  "buildTarget": "web:build:development",
  "proxyConfig": "apps/web/proxy.conf.json"
}
```

**Checklist before saving:**

- Only the `development` configuration is modified — the `production` configuration is
  unchanged (proxy is a dev-only concern; production uses nginx per Phase 7).
- `"proxyConfig"` value is the project-root-relative path `"apps/web/proxy.conf.json"` —
  the path the `@angular/build:dev-server` executor resolves relative to the Nx workspace
  root.
- The `serve` target's `executor`, `continuous`, and `defaultConfiguration` fields are
  unchanged.
- No other targets (`build`, `lint`, `test`, `serve-static`) are modified.

**Verify:**

```powershell
npm run build
npm run lint
```

Both must exit 0. `project.json` is schema-validated by Nx; a malformed JSON or an
unrecognized field will surface as a build error.

---

## Step 6 — Full build / lint / test gate

Run all three commands:

```powershell
npm run build
```

Expected: exits 0 across the entire workspace (`apps/api`, `apps/web`, `libs/shared-types`).
The TypeScript compiler must find no `any` violations in `weather-api.service.ts` and all
`@nimbus/shared-types` imports must resolve.

```powershell
npm run lint
```

Expected: exits 0. Check especially:
- No unused imports in `weather-api.service.ts` (all imported types are referenced in
  method signatures).
- `@angular/common/http` imports in both `weather-api.service.ts` and `app.config.ts` are
  recognized by the ESLint import resolver.
- `environment` import path is correct (relative, not an alias).

```powershell
npm test
```

Expected: exits 0. No new spec files are added in this task (component/service tests are
Phase 6). The existing workspace specs (Nx-welcome component, etc.) must remain green —
the addition of `provideHttpClient()` to `app.config.ts` does not affect the existing
`app.spec.ts` if it does not bootstrap via `appConfig`. If the existing spec does use
`appConfig` and fails, inspect the `app.spec.ts` to see if it needs `provideHttpClient()`
added to its `TestBed` providers — add it there if required to keep the existing test green,
but do not write new test logic.

**Verify:** all three commands exit 0.

---

## Step 7 — Smoke-check: dev proxy routes both prefixes (optional but recommended)

This step requires both the Angular dev server and the NestJS API to be running simultaneously.
Skip this step if the Phase 3 API is not yet locally runnable — the build/lint/test gate in
Step 6 is the mandatory gate; this is a confidence check.

In one PowerShell terminal:

```powershell
npx nx serve api
```

In a second terminal, once the API is up:

```powershell
npx nx serve web
```

In a third terminal, once the Angular dev server is up (port 4200):

```powershell
# Confirm /health forwards through the proxy to :3000
Invoke-WebRequest -Uri http://localhost:4200/health -UseBasicParsing | Select-Object StatusCode, Content

# Confirm /api forwards through the proxy to :3000
Invoke-WebRequest -Uri "http://localhost:4200/api/weather/locations?query=London" -UseBasicParsing | Select-Object StatusCode, Content
```

Expected:
- `/health` returns HTTP 200 with `{ "status": "ok", "service": "nimbus-api", ... }`.
- `/api/weather/locations` returns HTTP 200 with a JSON array.

Stop both servers after confirming. If either request returns a 404 or connection refused,
check that `proxy.conf.json` paths and `project.json` `proxyConfig` value both use the same
spelling.

---

## Step 8 — Diff sanity check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new files (untracked → staged):**

- `apps/web/src/environments/environment.ts`
- `apps/web/src/app/core/weather-api.service.ts`
- `apps/web/proxy.conf.json`

**Expected modified files:**

- `apps/web/src/app/app.config.ts`
- `apps/web/project.json`

**Must NOT appear in the diff:**

- `libs/shared-types/**` — no shared-types edits (Phase 1, read-only)
- `prisma/schema.prisma` or `prisma/migrations/` — no schema edits
- `apps/api/**` — no backend edits (Phase 3, read-only)
- `package.json` or `package-lock.json` — no new dependency (HttpClient + rxjs already
  installed; if these appear, investigate and revert)
- Any component file, `styles.scss`, `index.html`, `app.ts`, or `nx-welcome` files — those
  are Tasks 4-2 through 4-6

If any unexpected file appears, investigate and revert before staging.

### Stage and commit

```powershell
git add apps/web/src/environments/environment.ts
git add apps/web/src/app/core/weather-api.service.ts
git add apps/web/proxy.conf.json
git add apps/web/src/app/app.config.ts
git add apps/web/project.json
```

Confirm staged set:

```powershell
git status
```

Expected: exactly the five files above staged, nothing else.

```powershell
git commit -m "feat(web): add WeatherApiService, HttpClient provider, and dev proxy/env

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
green; the WeatherStore and components consuming this service follow."
```

No `Co-Authored-By` trailer.

**Final verify after commit:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: commit message above appears at HEAD; stat shows exactly five files changed (three
new, two modified) — all within `apps/web/`.

---

## Summary of gates

| Step | Gate |
|------|------|
| 0-A | `git status` clean; recent history includes Phase 3 commits |
| 0-B | `npm run build` + `npm run lint` + `npm test` green at baseline |
| 0-C | All six required files exist; no pre-existing `WeatherApiService` or `environment.ts` |
| 1 | `environment.ts` created; `npm run build` exits 0 |
| 2 | `weather-api.service.ts` created with all ten methods, typed via `@nimbus/shared-types`; `npm run build` exits 0 |
| 3 | `app.config.ts` updated with `provideHttpClient()`; `npm run build` exits 0 |
| 4 | `proxy.conf.json` created with `/api` and `/health` entries; `npm run build` exits 0 |
| 5 | `project.json` `serve.development` updated with `proxyConfig`; `npm run build` + `npm run lint` exit 0 |
| 6 | `npm run build` + `npm run lint` + `npm test` all exit 0 post-implementation |
| 7 | (optional) Proxy smoke-check: `/health` and `/api/weather/locations` both return 200 through the Angular dev server |
| 8 | `git diff --stat` shows exactly 5 files in `apps/web/`; commit message matches Tasks doc; no co-author trailer |
