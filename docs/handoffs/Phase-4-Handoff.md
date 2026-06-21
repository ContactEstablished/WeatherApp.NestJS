# Phase 4 — Frontend (Angular) — Handoff

**Status:** Complete. Six tasks committed on `main`:

| Task | Commit | Summary |
|------|--------|---------|
| 4-1 | `f09f5ae` | `WeatherApiService` + `HttpClient` provider + `environment.ts` + dev proxy |
| 4-2 | `a4f1d32` | Signals-based `WeatherStore` with debounced RxJS search and boot sequence |
| 4-6 | `67039c7` | `WeatherIconComponent`, `SparklineComponent`, `MetricCardComponent` + global styles/assets |
| 4-3 | `c91a25e` | Shell + sidebar component tree (`Brand`, `NavList`, `SavedLocations`, `PremiumCard`, `ThemeToggle`) |
| 4-4 | `af962dd` | Topbar component tree (`SearchBox`, `UnitSwitch`, `ProfileCluster`) |
| 4-5 | `7a54140` | Dashboard component tree (`HeroWeather`, `PreviewRow`, `HourlyPanel`, `ForecastPanel`, `MetricStack`) |

`npm run build` / `npm run lint` / `npm test` are **green across the workspace** (web, api, shared-types).

> **Task ordering note:** Task 4-6 (shared components + `lucide-angular`) was sequenced before
> 4-3/4-4/4-5 per the prompt's recommended Option A so real icon components were available for
> the sidebar/topbar/dashboard builds.

---

## What was delivered

The complete Angular 21 Nimbus Weather frontend in `apps/web`, reproducing the source Vue app's
DOM structure and class names verbatim across five functional layers:

**Foundation (Task 4-1):**
- `apps/web/src/environments/environment.ts` — `apiBaseUrl: ''` (dev proxy routes to `:3000`).
- `apps/web/src/app/core/weather-api.service.ts` — `@Injectable({ providedIn: 'root' })`; 10
  methods over `HttpClient` covering all 11 §0.2 endpoints. Mutating calls typed `Observable<void>`
  for 204 No Content responses. `updateSavedLocation` guards on missing `id` with `throwError`.
- `apps/web/proxy.conf.json` — `/api` and `/health` forwarded to `http://localhost:3000`.
- `apps/web/project.json` — `proxyConfig` wired to `serve.configurations.development`.
- `apps/web/src/app/app.config.ts` — `provideHttpClient()` registered.

**State (Task 4-2):**
- `apps/web/src/app/core/weather.store.ts` — `@Injectable({ providedIn: 'root' })`; 10 writable
  signals (`dashboard`, `loading`, `error`, `search`, `unitSystem`, `suggestions`,
  `savedLocations`, `searchFocused`, `savingLocation`, `updatingLocationId`); 4 computeds
  (`activeLocation`, `activeSavedLocation`, `showSuggestions`, `formattedObservedAt`); 8 async
  handlers ported verbatim from App.vue; `onSearchInput` driving a `Subject` →
  `debounceTime(250)` → `filter(≥2 chars)` → `switchMap` RxJS pipeline with
  `takeUntilDestroyed`; `init()` boot sequence (prefs → saved locations → search seed →
  dashboard).

**Shared components (Task 4-6):**
- `WeatherIconComponent` (`app-weather-icon`) — `condition` + `size` signal inputs; `computed`
  maps condition string → lucide icon (CloudRain / CloudSun / Cloud / Moon / Sun); renders
  `<lucide-icon>` inside `<span class="weather-icon weather-icon--{size} weather-icon--{kebab}>`.
- `SparklineComponent` (`app-sparkline`) — 132×46 SVG with `line` (M/L path) and `bars`
  variants; math ports `step`, `y`, `x`, `height` formulas verbatim from App.vue.
- `MetricCardComponent` (`app-metric-card`) — `metric = input.required<WeatherMetric>()`;
  key→icon map (Droplet/Wind/Umbrella/Eye); `sparklineVariant` (`bars` for precipitation, else
  `line`).
- `apps/web/src/styles.scss` — 1,148-line verbatim port of source `styles.css`; includes
  dark-only `:root`, 292px sidebar grid, all component classes, 3-breakpoint responsive rules.
- `apps/web/src/index.html` — title `Nimbus Weather`, SVG favicon.
- `apps/web/public/favicon.svg` — CloudLightning glyph, `#66b8ff` stroke.
- `lucide-angular` v1.0.0 installed (approval-gated; user pre-approved before the session).

**Sidebar (Task 4-3):**
- `apps/web/src/app/sidebar/` — 5 leaf components (`BrandComponent`, `NavListComponent`,
  `SavedLocationsComponent`, `PremiumCardComponent`, `ThemeToggleComponent`) composed into
  `SidebarComponent`. All class names match source verbatim (`.brand`, `.brand__mark`,
  `.nav-list`, `.nav-list__item.is-active`, `.saved-location-row`, `.premium-card`,
  `.theme-toggle`).
- `App` (root) calls `store.init()` in `ngOnInit`; renders `.app-shell` grid.
- `@for`/`@if` Angular 17+ built-in control flow used throughout to satisfy `prefer-control-flow`
  lint rule.

**Topbar (Task 4-4):**
- `apps/web/src/app/features/topbar/` — `SearchBoxComponent`, `UnitSwitchComponent`,
  `ProfileClusterComponent` composed into `TopbarComponent`.
- Search: `[value]` one-way + `(input)` → `onSearchInput`; `(focus)`/`(keydown.escape)` →
  `searchFocused.set`; `(mousedown)` on suggestion → `chooseLocation` (mousedown fires before
  blur so dropdown stays open until item is selected).
- Unit switch: `[class.is-active]` on matching button; calls `changeUnits('imperial'|'metric')`.
- Profile cluster: fully static (Bell + Alex Morgan / Premium + ChevronDown).

**Dashboard (Task 4-5):**
- `apps/web/src/app/dashboard/` — 5 panel components composed into `DashboardComponent`.
  - `HeroWeatherComponent` — `[style.--hero-image]` CSS custom-property binding; save button
    (`is-saved`, `savingLocation` disabled guard, `saveActiveLocation`); `@if` star/plus icon
    swap; weather-facts row (Thermometer/Sun/Moon).
  - `PreviewRowComponent` — `@for` over `previews`; 3 static carousel dots.
  - `HourlyPanelComponent` — `@for` over `hourly`; `[class.is-now]` on `label === 'Now'`.
  - `ForecastPanelComponent` — `@for` over `daily`; `rangeBarWidth(high)` helper clamps
    `Math.max(22, Math.min(86, high * 1.1))px`; `[style.width]` on range bar `<b>`.
  - `MetricStackComponent` — `@for` over `metrics`, `[metric]` binding to `MetricCardComponent`.
  - `DashboardComponent` — `@if` loading/error/loaded guards; loading panel, error panel with
    retry button, dashboard-grid with all five panels.

---

## Verification (performed in-phase)

- `npm run build` / `npm run lint` / `npm test` green after every task commit.
- Build artefact: `dist/apps/web/` produced at each gate (~200 kB initial chunk, 15 kB CSS).
- Lint: 0 errors; 2 pre-existing `no-non-null-assertion` warnings in `weather.store.ts` (lines
  98/159, carried from Task 4-2, not regressions).
- Tests: 1 suite (`app.spec.ts`) — 1 passing test (`should create the app`) at every gate.
- `prefer-control-flow` lint rule caught `*ngIf`/`*ngFor` usages in Task 4-3 templates;
  converted to `@if`/`@for` before commit.

Visual/runtime verification against a live API was not performed in this session (the dev server
was not started). All structural contracts (7 hourly / 5 daily / 3 previews / 4 metrics) are
enforced by the Phase 3 mock and types from `@nimbus/shared-types`.

---

## Deviations / notes for Phase 5

1. **Task sequencing:** 4-6 completed before 4-3/4-4/4-5 (Option A). Commits appear out of
   numerical order in `git log` but all land on `main` clean.
2. **`nx-welcome` component retained.** `apps/web/src/app/nx-welcome.ts` is still present and
   causes a budget warning in build output (`exceeded budget by 3.03 kB`). It is unreferenced
   by the app but its spec is no longer wired. Safe to delete in a cleanup pass.
3. **`replaceAll` ES2021 compat fix.** `tsconfig.base.json` targets `es2020`; `WeatherIconComponent`
   uses `.split(' ').join('-')` instead of `.replaceAll(' ', '-')` for condition kebab-casing.
4. **`NgClass` retained in sidebar.** `NavListComponent` and `SavedLocationsComponent` still
   import `NgClass` from `@angular/common` for `[ngClass]` bindings (it is not covered by the
   `prefer-control-flow` rule — only structural directives are).
5. **No `takeUntilDestroyed` import issue:** `DestroyRef` is injected in `WeatherStore`
   constructor and passed to `takeUntilDestroyed` — fully compatible with `providedIn: 'root'`
   singletons in Angular 16+.
6. **Dev proxy not tested at runtime.** The `proxy.conf.json` wiring is structurally correct but
   was not exercised via `nx serve web`. Phase 5 (dev workflow) should confirm the proxy routes
   `/api` and `/health` to `:3000` end-to-end.

---

## For downstream phases

- **Phase 5 (Dev workflow):** Angular dev server (`npx nx serve web`) runs on port `4200` and
  proxies `/api` + `/health` to `http://localhost:3000` via `proxy.conf.json`. The full stack
  boots with `npx nx serve api` (port 3000) + `npx nx serve web` (port 4200). Phase 5 should
  wire a single `dev` script or Docker Compose service for this pair.
- **Phase 6 (Testing):** High-value Angular test targets: `WeatherStore` signal transitions
  (loading/error/success), debounce pipeline, `chooseLocation`/`saveActiveLocation`/
  `moveSavedLocation` guards; `WeatherApiService` HTTP interactions (mock `HttpClient`);
  `WeatherIconComponent` condition→icon mapping; `SparklineComponent` path math; `ForecastPanel`
  `rangeBarWidth` clamping. No specs were added in Phase 4.
