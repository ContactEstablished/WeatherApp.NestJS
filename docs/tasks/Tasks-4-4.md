# Task 4-4 — Topbar component tree

## Surface
Frontend components in `apps/web` only — the workspace header: `TopbarComponent` and its children
`SearchBoxComponent`, `UnitSwitchComponent`, `ProfileClusterComponent`. Binds to the Task 4-2
`WeatherStore` (debounced search, suggestions, unit toggle). No sidebar, no dashboard panels, no reusable
icons/sparkline, no global styles (Tasks 4-3, 4-5, 4-6).

## Why
The topbar is the second vertical slice and the primary input surface: it drives the debounced search
(suggestions dropdown) and the °F/°C toggle that round-trips preferences. Porting `<header class=
"topbar">` from `App.vue` into standalone components — **with identical DOM and class names** — wires the
store's `onSearchInput`/`showSuggestions`/`chooseLocation` and `changeUnits` to real controls so the §0.1
search-and-units behaviors are exercisable in the browser. The profile cluster is static per §0.1.

## Depends on
- **Roadmap Phase 4 — Frontend (Angular)** (`docs/RoadMap.md`, "### Phase 4"): the "Topbar:" component
  decomposition bullet and the DOM/class-fidelity constraint. Enumerated task-split item **4**.
- **Task 4-2** (`docs/tasks/Tasks-4-2.md`): the store's `search`/`onSearchInput`, `suggestions`,
  `showSuggestions`, `searchFocused`, `chooseLocation`, `unitSystem`, `changeUnits`, and `loadDashboard`.
- **Task 4-3** (`docs/tasks/Tasks-4-3.md`): the `.app-shell`/`.workspace` shell that hosts the topbar.
- **Task 4-6** (`docs/tasks/Tasks-4-6.md`): `lucide-angular` (the `Search`, `Bell`, `ChevronDown`,
  `MapPin` icons) and the ported `styles.scss`. If 4-6 has not landed, icons are a forward dependency —
  see "What NOT to modify".
- No ADRs in `docs/decisions/`.

## Required reading
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` — **Mirror:** the
  `<header class="topbar">` block (lines ~366–415). Reproduce **verbatim**: `<form class="search-box"
  @submit.prevent>` with the `Search` icon, the `<input>` (placeholder `"Search for a city, state, or
  ZIP..."`, focus/escape handlers), `<kbd>Ctrl K</kbd>`, and the `.search-suggestions` dropdown
  (rendered only when `showSuggestions`) whose buttons use `@mousedown.prevent` and show
  `<strong>{name}</strong><em>{region} {country}</em>`; the `.unit-switch` with two buttons (`°F`/`°C`,
  `is-active` on the current unit); and the `.profile-cluster` with the `.icon-button` notifications
  `Bell` (+ trailing `<span>` dot) and the static `.profile` (avatar `<img>`, `Alex Morgan` / `Premium`,
  `ChevronDown`).
- `apps/web/src/app/core/weather.store.ts` (Task 4-2) — **Mirror:** the signals/handlers above; the
  search input updates the store (signal + debounce subject) via `onSearchInput`.
- `apps/web/src/app/app.html` / the shell from Task 4-3 — **Mirror:** mount `<app-topbar>` as the first
  child of `<section class="workspace">`.

## Acceptance criteria
1. **Standalone components created**:
   - `SearchBoxComponent` → `<form class="search-box">` with the `Search` icon, an `<input>` whose value
     is bound to `store.search()` and whose input event calls `store.onSearchInput($event)`, with
     `focus` → `searchFocused = true` and `Escape` → `searchFocused = false` (matching the source
     `@focus`/`@keydown.escape`), the `<kbd>Ctrl K</kbd>`, and the `.search-suggestions` dropdown rendered
     **only when** `store.showSuggestions()`. Each suggestion button uses a `mousedown` handler that
     prevents default and calls `store.chooseLocation(location)` (mousedown, not click, so the option is
     selected before the input blurs — matching `@mousedown.prevent`). Submitting the form calls
     `store.loadDashboard()` (source `@submit.prevent="loadDashboard"`).
   - `UnitSwitchComponent` → `<div class="unit-switch" aria-label="Temperature units">` with two buttons;
     the `°F` button gets `is-active` when `store.unitSystem() === 'imperial'` and calls
     `store.changeUnits('imperial')`; the `°C` button mirrors for `'metric'`. (`changeUnits` round-trips
     `PUT /preferences` then reloads the dashboard — §0.1 persistence.)
   - `ProfileClusterComponent` → `<div class="profile-cluster">` with the `.icon-button` notifications
     button (`Bell` + the trailing `<span></span>` dot) and the **static** `.profile` block (the source
     avatar `<img>` URL + alt `Alex Morgan`, `<strong>Alex Morgan</strong><em>Premium</em>`,
     `ChevronDown`). No dynamic behavior (§0.1).
   - `TopbarComponent` → `<header class="topbar">` composing the three children in source order.
2. **Store bindings verified by behavior.** Typing ≥2 chars in the search input surfaces the
   `.search-suggestions` dropdown (after the 250 ms debounce from Task 4-2) and selecting an option calls
   `store.chooseLocation`, which sets `search` to the label and reloads the dashboard. The unit switch
   reflects `store.unitSystem()` and toggling it calls `store.changeUnits(...)`.
3. **DOM/class fidelity.** Rendered markup reproduces the source `App.vue` topbar DOM and class names
   **verbatim** (`.topbar`, `.search-box`, `.search-suggestions`, `.unit-switch`, `is-active`,
   `.profile-cluster`, `.icon-button`, `.profile`) so the Task 4-6 `styles.scss` applies unchanged. No
   class renames or structural reshaping.
4. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` pass across the
   workspace. No new specs (Phase 6).

## What NOT to modify
- **Sidebar** (Task 4-3), **dashboard panels** (Task 4-5), **reusable `WeatherIcon`/`Sparkline`/
  `MetricCard`, `styles.scss`, `lucide-angular` install, favicon/title** (Task 4-6).
- If the topbar needs lucide icons before 4-6 lands, **do not install `lucide-angular` here** (it is the
  approval-gated dependency owned by 4-6) — sequence 4-6 first or coordinate under its gate; STOP and ask
  if blocked.
- **`WeatherStore` / `WeatherApiService`** signatures — consume, do not change.
- **`libs/shared-types`** (Phase 1), **`apps/api`** (Phase 3). No schema migration / no new dependency
  unless the roadmap says so — if a task seems to need one, STOP and ask.

## Suggested commit
```
feat(web): add topbar component tree (search / units / profile)

Port App.vue's <header class="topbar"> into standalone components,
reproducing the source DOM and class names verbatim:

- SearchBoxComponent (.search-box + .search-suggestions) bound to the
  store's debounced search: input -> onSearchInput, focus/escape -> 
  searchFocused, suggestion mousedown -> chooseLocation, submit ->
  loadDashboard.
- UnitSwitchComponent (.unit-switch) reflecting store.unitSystem() and
  calling changeUnits('imperial' | 'metric') (round-trips preferences).
- ProfileClusterComponent (.profile-cluster) — static Bell + Alex Morgan /
  Premium + ChevronDown per §0.1.

Mounted as the first child of .workspace. build/lint/test green.
```
