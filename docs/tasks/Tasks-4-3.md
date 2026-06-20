# Task 4-3 — Shell / sidebar component tree

## Surface
Frontend components in `apps/web` only — the left sidebar: `SidebarComponent` and its children
`BrandComponent`, `NavListComponent`, `SavedLocationsComponent`, `PremiumCardComponent`,
`ThemeToggleComponent`. Replaces the Nx-welcome `App` placeholder with the real `.app-shell` grid
(sidebar + a workspace slot that Tasks 4-4 / 4-5 fill). Binds to the Task 4-2 `WeatherStore`. No topbar,
no dashboard panels, no reusable `WeatherIcon`/`Sparkline`, no global styles (Tasks 4-4 … 4-6).

## Why
The sidebar is the first vertical slice of the cloned UI and the natural home for the `.app-shell` grid
the whole layout hangs off. Porting `<aside class="sidebar">` from `App.vue` into standalone components
— **with identical DOM structure and class names** — lets the lifted `styles.css` (Task 4-6) apply
unchanged. The saved-locations list is the most behavior-rich part (select / move up·down / set-default
/ delete), so wiring it to the store's handlers here proves the store contract end-to-end.

## Depends on
- **Roadmap Phase 4 — Frontend (Angular)** (`docs/RoadMap.md`, "### Phase 4"): the "Shell:" component
  decomposition bullet and the **DOM/class-fidelity** constraint ("reproducing the source DOM structure
  and class names verbatim … renaming classes or restructuring markup … is out of bounds"). Enumerated
  task-split item **3**.
- **Task 4-2** (`docs/tasks/Tasks-4-2.md`): the `WeatherStore` signals (`savedLocations`,
  `updatingLocationId`) and handlers (`chooseLocation`, `moveSavedLocation`, `makeDefaultLocation`,
  `removeSavedLocation`) the saved-location rows bind to.
- **Task 4-6** (`docs/tasks/Tasks-4-6.md`): provides `lucide-angular` (the icon components used here —
  `CloudLightning`, `Home`, `MapPin`, `Star`, `Trash2`, `ArrowUp`, `ArrowDown`, `Gem`, `Navigation`,
  `Moon`, etc.) and the ported `styles.scss`. **If 4-6 has not landed when 4-3 is implemented, icons are
  a forward dependency** — see "What NOT to modify".
- No ADRs in `docs/decisions/`.

## Required reading
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` — **Mirror:** the
  `<aside class="sidebar" aria-label="Primary">` block (lines ~263–363). Reproduce its DOM and class
  names **verbatim**: `.brand` / `.brand__mark`, `.nav-list` / `.nav-list__item` (+ `is-active`),
  `.saved-locations` (with `<header><span>Saved</span></header>`), `.saved-location-row` (+ `is-default`)
  with `.saved-location-row__main` and four `.saved-location-row__icon` buttons (up / down / star / trash,
  each with the source's `:disabled` guards and `aria-label`s), `.premium-card` / `.premium-card__gem`,
  and `.theme-toggle` (`<input type="checkbox" checked>` + `<i aria-hidden="true">`).
- `apps/web/src/app/app.ts` + `apps/web/src/app/app.html` — **Mirror:** the standalone-component shape
  (`@Component({ selector: 'app-root', imports: [...] })`). Remove `NxWelcome`; render `<main class=
  "app-shell">` with the sidebar and a placeholder/slot for the workspace.
- `apps/web/src/app/core/weather.store.ts` (Task 4-2) — **Mirror:** inject the store; read `savedLocations()`
  and `updatingLocationId()`; call the handlers from the row buttons.

## Acceptance criteria
1. **Standalone components created** (Angular standalone, `selector: 'app-…'`, `inlineStyleLanguage: scss`
   workspace default; templates as `.html`, no per-component styles needed since CSS is global):
   - `BrandComponent` → renders `<a class="brand" href="#">` with `.brand__mark` wrapping the
     `CloudLightning` icon and `<strong>Nimbus</strong><em>Weather</em>`.
   - `NavListComponent` → renders `<nav class="nav-list">` with one `.nav-list__item` per nav entry; the
     seven entries (`Overview`*active*, `Forecast`, `Maps`, `Radar`, `Locations`, `Alerts`, `Settings`)
     and their icons match the source `navItems`; the active item gets `is-active`.
   - `SavedLocationsComponent` → renders `<section class="saved-locations">` **only when**
     `savedLocations().length > 0` (source `v-if`), one `.saved-location-row` per location (keyed by
     `name-region`), with `is-default` on the default row, the `.saved-location-row__main` select button,
     and the four `.saved-location-row__icon` action buttons with the exact `:disabled` conditions and
     `aria-label`s from the source.
   - `PremiumCardComponent` → renders `<section class="premium-card">` with `.premium-card__gem`,
     `<strong>Go Premium</strong>`, the blurb `<p>`, and the `Upgrade Now` button (+ `Navigation` icon).
   - `ThemeToggleComponent` → renders `<label class="theme-toggle">` with the `Moon` icon + "Dark Mode",
     a **cosmetic** `<input type="checkbox" checked>` and `<i aria-hidden="true">`. Per §0.1 it is
     dark-only/decorative — no theme switching logic.
   - `SidebarComponent` → `<aside class="sidebar" aria-label="Primary">` composing the five children in
     source order.
2. **Store bindings.** `SavedLocationsComponent` reads `store.savedLocations()` and
   `store.updatingLocationId()`; its row actions call `store.chooseLocation(location)` (main),
   `store.moveSavedLocation(location, index, -1)` (up), `store.moveSavedLocation(location, index, 1)`
   (down), `store.makeDefaultLocation(location)` (star), `store.removeSavedLocation(location)` (trash).
   The first row's up button and the last row's down button are `disabled` (source bounds), and every
   action button is `disabled` while `updatingLocationId() === location.id`.
3. **Shell wired.** `App` (`app-root`) renders `<main class="app-shell">` containing `<app-sidebar>` and a
   workspace region (`<section class="workspace">`) left as a slot/placeholder for Tasks 4-4 (topbar) and
   4-5 (dashboard). The `NxWelcome` import and `nx-welcome.ts` usage are removed; `title` placeholder no
   longer drives the template. The store's boot sequence (Task 4-2 `init()`) is triggered from the shell.
4. **DOM/class fidelity.** Rendered markup reproduces the source `App.vue` sidebar DOM and class names
   **verbatim** so the Task 4-6 `styles.scss` applies unchanged. No class renames, no structural
   reshaping, no extra wrapper elements that would change CSS selectors.
5. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` pass across the
   workspace. No new specs (Phase 6).

## What NOT to modify
- **Topbar** (`TopbarComponent`/`SearchBox`/`UnitSwitch`/`ProfileCluster`) — **Task 4-4**.
- **Dashboard panels** (`Dashboard`/`HeroWeather`/`PreviewRow`/`HourlyPanel`/`ForecastPanel`/
  `MetricStack`) — **Task 4-5**.
- **Reusable `MetricCard`/`WeatherIcon`/`Sparkline`, the ported `styles.scss`, `lucide-angular` install,
  favicon/title** — **Task 4-6**. If the sidebar needs lucide icons before 4-6 lands, **do not install
  `lucide-angular` here** (it is the approval-gated dependency owned by 4-6) — sequence 4-6 first or
  coordinate the install under 4-6's gate, and STOP and ask if blocked.
- **`WeatherStore` / `WeatherApiService`** signatures — Tasks 4-2 / 4-1; consume, do not change.
- **`libs/shared-types`** (Phase 1), **`apps/api`** (Phase 3). No schema migration / no new dependency
  unless the roadmap says so — if a task seems to need one, STOP and ask.

## Suggested commit
```
feat(web): add shell + sidebar component tree bound to WeatherStore

Replace the Nx-welcome placeholder with the real .app-shell grid and port
App.vue's <aside class="sidebar"> into standalone components, reproducing
the source DOM and class names verbatim so the lifted CSS applies
unchanged:

- BrandComponent (.brand / .brand__mark)
- NavListComponent (.nav-list / .nav-list__item, seven entries)
- SavedLocationsComponent (.saved-location-row select/up/down/star/trash
  bound to store.chooseLocation / moveSavedLocation / makeDefaultLocation /
  removeSavedLocation, with the source's disabled guards and aria-labels)
- PremiumCardComponent (.premium-card)
- ThemeToggleComponent (.theme-toggle, cosmetic dark-only)

Sidebar reads store.savedLocations() / updatingLocationId() and triggers
the store boot sequence. build/lint/test green.
```
