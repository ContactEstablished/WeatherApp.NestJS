# Task 4-5 — Dashboard component tree

## Surface
Frontend components in `apps/web` only — the main content area: `DashboardComponent` and its children
`HeroWeatherComponent`, `PreviewRowComponent`, `HourlyPanelComponent`, `ForecastPanelComponent`,
`MetricStackComponent`, plus the loading/error panels. Binds to the Task 4-2 `WeatherStore`. Consumes the
reusable `WeatherIcon`/`MetricCard` from Task 4-6. No sidebar, no topbar, no global styles, no reusable
component internals (Tasks 4-3, 4-4, 4-6).

## Why
The dashboard is the payload of the clone — the hero card, condition previews, hourly strip, 5-day
forecast, and metric stack that render a loaded `WeatherDashboard`. Porting the `App.vue`
`<section class="dashboard-grid">` (and the loading/error states above it) into standalone components —
**with identical DOM and class names** — completes the §0.1 visible surface and exercises the store's
`dashboard`/`activeSavedLocation`/`saveActiveLocation` and the date/unit formatting from Task 4-2.

## Depends on
- **Roadmap Phase 4 — Frontend (Angular)** (`docs/RoadMap.md`, "### Phase 4"): the "Dashboard:" component
  decomposition bullet and the DOM/class-fidelity constraint. Enumerated task-split item **5**.
- **Task 4-2** (`docs/tasks/Tasks-4-2.md`): the store's `dashboard`, `loading`, `error`,
  `formattedObservedAt`, `formatTime`, `formatShortDate`, `activeSavedLocation`, `savingLocation`,
  `saveActiveLocation`, `loadDashboard`.
- **Task 4-6** (`docs/tasks/Tasks-4-6.md`): `WeatherIconComponent`, `MetricCardComponent`,
  `SparklineComponent`, `lucide-angular`, and the ported `styles.scss`. These are consumed here; if 4-6
  has not landed, they are forward dependencies — see "What NOT to modify".
- **Task 4-3 / 4-4**: the `.workspace` region this dashboard mounts into, below the topbar.
- No ADRs in `docs/decisions/`.

## Required reading
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` — **Mirror:** the
  loading/error panels (lines ~417–426) and the `<section class="dashboard-grid">` block (lines
  ~428–542). Reproduce **verbatim**: the `.hero-weather` article (with the `--hero-image` CSS var bound to
  `current.backgroundImageUrl`, `.hero-weather__location`, the `.save-location-button` with `is-saved`
  state, `.hero-weather__temp`, `.hero-weather__condition`, `.hero-weather__summary`, `.weather-facts`);
  the `.preview-row` with `.preview-card` per preview plus the three-dot `.carousel-dots`; the
  `.panel.hourly-panel` `.hourly-strip` with `.hour-card` (+ `is-now` when `label === 'Now'`); the
  `.panel.forecast-panel` `.daily-list` with `.daily-row` (`__date`/`__condition`/`__rain`/`__range`,
  including the inline width style `Math.max(22, Math.min(86, day.high * 1.1))`px on the range bar `<b>`);
  and the `.metric-stack` rendering one `MetricCard` per metric.
- `apps/web/src/app/core/weather.store.ts` (Task 4-2) — **Mirror:** the signals/computeds/handlers above.
- `apps/web/src/app/.../weather-icon.component.ts` + `metric-card.component.ts` (Task 4-6) — **Mirror:**
  the `WeatherIcon` `[condition]`/`[size]` inputs and `MetricCard` `[metric]` input.

## Acceptance criteria
1. **Standalone components created**:
   - `HeroWeatherComponent` → `<article class="hero-weather">` with `[style.--hero-image]` set to
     `url(<backgroundImageUrl>)`; the `.hero-weather__location` with the `.save-location-button` whose
     `is-saved` class, `disabled` (`savingLocation() || activeSavedLocation()`), `aria-label`, and
     `Star`-vs-`Plus` icon follow the source, calling `store.saveActiveLocation()` on click; the
     `formattedObservedAt` paragraph; `.hero-weather__temp` (`temperature` + `°{temperatureUnit}`);
     `.hero-weather__condition` (`WeatherIcon size="sm"` + `condition`); `.hero-weather__summary`
     (`summary` `<br>` `description`); and `.weather-facts` (feels-like, sunset via `formatTime`, sunrise
     via `formatTime`).
   - `PreviewRowComponent` → `<section class="preview-row">` with one `.preview-card` per
     `dashboard().previews` (`WeatherIcon size="xl"`, `condition`, `high° / low°`, `description`) and the
     static three-span `.carousel-dots` (first `is-active`).
   - `HourlyPanelComponent` → `<section class="panel hourly-panel">` with the `Hourly Forecast` header
     (`<h2>` + `View All` button) and a `.hourly-strip` of `.hour-card` (one per `dashboard().hourly`),
     `is-now` when `label === 'Now'`, showing label, `WeatherIcon size="md"`, `temperature°`, and
     `windSpeed {windUnit}`.
   - `ForecastPanelComponent` → `<section class="panel forecast-panel">` with the `5-Day Forecast` header
     and a `.daily-list` of `.daily-row` (one per `dashboard().daily`): `__date` (`day` + `formatShortDate`),
     `WeatherIcon size="sm"`, `__condition`, `__rain` (`Droplet` + `precipitationChance%`), and `__range`
     (`high°`, the range bar `<b>` with the inline clamped width, `low°`).
   - `MetricStackComponent` → `<section class="metric-stack">` rendering one `MetricCardComponent`
     (`[metric]`) per `dashboard().metrics`.
   - `DashboardComponent` → renders the `.loading-panel` while `store.loading()`, the
     `.loading-panel.loading-panel--error` (with a `Retry` button → `store.loadDashboard()`) while
     `store.error()`, else (when `store.dashboard()`) the `<section class="dashboard-grid">` composing the
     five panels in source order. Mounted into `.workspace` below the topbar.
2. **Correct counts on a loaded dashboard.** Against a `WeatherDashboard` from the API, the panels render
   exactly **7 hourly cards** (first `is-now`/`Now`), **5 daily rows**, **3 preview cards**, and **4
   metric cards** — matching the §0.2 contract and the Phase 3 handoff. The hero save button calls
   `store.saveActiveLocation()` and reflects `is-saved` when `activeSavedLocation()` is set.
3. **DOM/class fidelity.** Rendered markup reproduces the source `dashboard-grid` (and loading/error
   panel) DOM and class names **verbatim** — including the `--hero-image` style binding and the
   `.daily-row__range` inline width — so the Task 4-6 `styles.scss` applies unchanged. No class renames or
   structural reshaping.
4. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` pass across the
   workspace. No new specs (Phase 6).

## What NOT to modify
- **Sidebar** (Task 4-3), **topbar** (Task 4-4).
- **Reusable `WeatherIconComponent` / `MetricCardComponent` / `SparklineComponent` internals,
  `styles.scss`, `lucide-angular` install, favicon/title** — **Task 4-6**. Consume these components by
  their inputs; do not author or alter them here. If they have not landed, **do not install
  `lucide-angular`** (4-6 owns that approval-gated dependency) — sequence 4-6 first; STOP and ask if blocked.
- **`WeatherStore` / `WeatherApiService`** signatures — consume, do not change.
- **`libs/shared-types`** (Phase 1), **`apps/api`** (Phase 3). No schema migration / no new dependency
  unless the roadmap says so — if a task seems to need one, STOP and ask.

## Suggested commit
```
feat(web): add dashboard component tree (hero / previews / hourly / daily / metrics)

Port App.vue's <section class="dashboard-grid"> and the loading/error
panels into standalone components, reproducing the source DOM and class
names verbatim:

- HeroWeatherComponent (.hero-weather + --hero-image, save star/plus ->
  store.saveActiveLocation, weather-facts)
- PreviewRowComponent (.preview-row, 3 cards + carousel dots)
- HourlyPanelComponent (.hourly-panel, 7 hours, first is-now/Now)
- ForecastPanelComponent (.forecast-panel, 5 daily rows + clamped range bar)
- MetricStackComponent (.metric-stack, 4 MetricCards)
- DashboardComponent dispatches loading / error / loaded states.

A loaded WeatherDashboard renders 7/5/3/4 panels. build/lint/test green.
```
