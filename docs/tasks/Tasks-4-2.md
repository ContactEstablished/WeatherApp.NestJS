# Task 4-2 — WeatherStore signals state + RxJS search debounce

## Surface
Frontend state in `apps/web` only — the signals-based `WeatherStore` service that mirrors the source
`App.vue` `<script setup>` reactive state, computeds, handlers, boot sequence, and the RxJS debounced
search. Consumes the Task 4-1 `WeatherApiService`. No components, no templates, no styles (Tasks 4-3 … 4-6).

## Why
`App.vue` keeps all dashboard state and behavior in its script block; the Angular port lifts that into a
single injectable `WeatherStore` so every component in Tasks 4-3 … 4-5 binds to one source of truth via
signals. Porting the handlers and the `onMounted` boot sequence **exactly** preserves the §0.1
behaviors (debounced search, unit toggle persistence, save/reorder/default/delete) before any markup
exists, so the component tasks are pure presentation wiring. Uses **no new dependency** — Angular
`signal`/`computed`/`effect` and `rxjs` are already installed.

## Depends on
- **Roadmap Phase 4 — Frontend (Angular)** (`docs/RoadMap.md`, "### Phase 4"): the "State — `WeatherStore`
  service" and "Search debounce (RxJS)" scope bullets, and the search-wiring "Decisions needed".
  Enumerated task-split item **2**.
- **Task 4-1** (`docs/tasks/Tasks-4-1.md`): `WeatherApiService` exposes one `Observable` method per §0.2
  endpoint; the store subscribes to those.
- **Phase 1 — Shared types — Handoff** (`docs/handoffs/Phase-1-Handoff.md`): state is typed against
  `@nimbus/shared-types` (`WeatherDashboard`, `LocationSuggestion`, `UnitSystem`) — **no field
  redeclaration**.
- No ADRs in `docs/decisions/`. **Decision locked here (per the roadmap recommendation):** search wiring
  uses a dedicated RxJS `Subject<string>` → `debounceTime(250)` → `switchMap(searchLocations)` (keeps the
  2-char guard and in-flight cancellation explicit, matching `weatherApi.ts`). No new dependency either way.

## Required reading
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` — **Mirror:** the
  `<script setup>` block (lines ~43–258) is the canonical source. Port each `ref` → `signal`, each
  `computed` → `computed`, the `watch(search, …)` (250 ms / 2-char debounce) → RxJS pipe, and the
  `onMounted` boot sequence verbatim. Keep handler names and control flow identical.
- `apps/web/src/app/core/weather-api.service.ts` (from Task 4-1) — **Mirror:** the method signatures the
  store calls (`getWeatherDashboard`, `getPreferences`, `updatePreferences`, `getSavedLocations`,
  `searchLocations`, `saveLocation`, `deleteSavedLocation`, `setDefaultLocation`, `reorderSavedLocations`).
- `libs/shared-types/src/lib/weather.ts` — **Mirror:** the typed state shapes; import via
  `@nimbus/shared-types`.

## Acceptance criteria
1. **`WeatherStore` created** at `apps/web/src/app/core/weather.store.ts` (or
   `apps/web/src/app/state/weather.store.ts`): `@Injectable({ providedIn: 'root' })`, injecting
   `WeatherApiService`. State exposed as Angular **writable signals** (readable by components; the store
   owns the writes):
   - `dashboard = signal<WeatherDashboard | null>(null)`
   - `loading = signal(true)`
   - `error = signal('')`
   - `search = signal('San Francisco, CA')`
   - `unitSystem = signal<UnitSystem>('imperial')`
   - `suggestions = signal<LocationSuggestion[]>([])`
   - `savedLocations = signal<LocationSuggestion[]>([])`
   - `searchFocused = signal(false)`
   - `savingLocation = signal(false)`
   - `updatingLocationId = signal<number | null>(null)`
   Initial values match the source `ref(...)` defaults exactly.
2. **Computeds** (Angular `computed`):
   - `activeLocation` → `dashboard()?.locations[0] ?? null`.
   - `activeSavedLocation` → the saved location matching `activeLocation` by case-insensitive
     `name` **and** `region` (port `isSameLocation`), else `null`.
   - `showSuggestions` → `searchFocused() && suggestions().length > 0`.
   - `formattedObservedAt` → `Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric',
     hour:'numeric', minute:'2-digit' })` of `current.observedAt`, `''` when no dashboard.
   The date/label helpers `formatTime` (`{ hour:'numeric', minute:'2-digit' }`), `formatShortDate`
   (`{ month:'short', day:'numeric' }` of `` `${value}T12:00:00` ``), and `locationLabel`
   (`[name, region].filter(Boolean).join(', ')`) are ported verbatim (methods or computeds — same output).
3. **Handlers ported 1:1** (same names, same guards, same call order as `App.vue`):
   `loadDashboard` (sets `loading`/`error`, then `unitSystem` from the response), `loadPreferences`
   (falls back to `'imperial'` on error), `loadSavedLocations` (falls back to `[]`), `changeUnits`
   (early-return when unchanged → `updatePreferences` → `loadDashboard`), `chooseLocation`
   (sets `search` to the label, clears focus + suggestions, reloads), `saveActiveLocation`
   (guards on `activeLocation`/`activeSavedLocation`/`savingLocation`, toggles `savingLocation`),
   `removeSavedLocation`, `makeDefaultLocation` (guards `isDefault`), and `moveSavedLocation(location,
   index, direction: -1 | 1)` (bounds-check, optimistic swap, `reorderSavedLocations` of the filtered
   numeric ids, reload). Each guards on `updatingLocationId` exactly as the source does.
4. **Boot sequence** — an `init()` method (called from the shell component's constructor/`ngOnInit` in a
   later task, or self-invoked) runs the `onMounted` order **verbatim**: `loadPreferences()` →
   `loadSavedLocations()` → pick `savedLocations().find(l => l.isDefault) ?? savedLocations()[0]` and set
   `search` to its label if present → `loadDashboard()`. Promise/Observable sequencing must preserve this
   strict order (await/`concatMap`/`firstValueFrom` — not parallel).
5. **Debounced search (RxJS).** A dedicated `Subject<string>` (the store exposes an `onSearchInput(value:
   string)` that updates the `search` signal **and** `next()`s the subject) piped through
   `debounceTime(250)` → `filter(v => v.trim().length >= 2)` → `switchMap(v => searchLocations(v))`,
   updating `suggestions` on emit and falling back to `[]` on error. For a query `< 2` chars, `suggestions`
   is cleared and no request is sent. For rapid input, **at most one request fires per 250 ms idle window**
   and an in-flight request is cancelled by the next (`switchMap`). The subscription is cleaned up
   (`takeUntilDestroyed`/`DestroyRef`) — no leak.
6. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` pass across the
   workspace; state typed against `@nimbus/shared-types` with no `any`. No new specs (Phase 6).

## What NOT to modify
- **`WeatherApiService` / `provideHttpClient` / proxy / env** — **Task 4-1** (already landed); consume it,
  do not change its signatures.
- **Any component or template, `styles.scss`, `index.html`, `lucide-angular`** — Tasks **4-3 … 4-6**. This
  task ships no markup; the Nx-welcome `App` placeholder stays.
- **`libs/shared-types`** (Phase 1, read-only), **`apps/api`** (Phase 3). Do not add types to the shared lib.
- No schema migration / no new dependency unless the roadmap says so — `signal`/`computed` (Angular) and
  `rxjs` are already installed. If a step seems to need a new package, STOP and ask.

## Suggested commit
```
feat(web): add signals-based WeatherStore with debounced RxJS search

Port the App.vue <script setup> state into an injectable WeatherStore
(providedIn: 'root'): the ten writable signals (dashboard, loading,
error, search, unitSystem, suggestions, savedLocations, searchFocused,
savingLocation, updatingLocationId), the computeds (activeLocation,
activeSavedLocation, showSuggestions, formattedObservedAt) and the
date/label helpers, all typed via @nimbus/shared-types.

Handlers (loadDashboard / loadPreferences / loadSavedLocations /
changeUnits / chooseLocation / saveActiveLocation / removeSavedLocation /
makeDefaultLocation / moveSavedLocation) and the onMounted boot sequence
(prefs -> saved -> default/first -> dashboard) are ported 1:1.

Search wiring: a Subject -> debounceTime(250) -> filter(>=2 chars) ->
switchMap(searchLocations), emitting at most one request per 250 ms idle
window and cancelling in-flight requests. No new dependency. build/lint/
test green.
```
