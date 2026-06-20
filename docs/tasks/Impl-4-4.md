# Impl 4-4 — Topbar component tree (search / units / profile)

**Acceptance contract:** `docs/tasks/Tasks-4-4.md`
**Decision lock:** No ADR. Locked by `docs/RoadMap.md` §0.5 (DOM/class-fidelity constraint),
Phase 4 "Constraint — DOM/class fidelity is load-bearing", and Phase 4 enumerated task-split
item 4. `lucide-angular` install is owned by Task 4-6 — do not install it here.
**Scope:** `apps/web` only — four new standalone components under
`apps/web/src/app/features/topbar/` plus a one-line mount in `app.html`. No schema change, no
new dependency, no `WeatherStore` or `WeatherApiService` signature changes.

---

## Step 0 — Pre-flight

**Tasks 4-1, 4-2, and 4-3 must be committed to `main` before any edit is made.
`lucide-angular` must also be installed (Task 4-6 gate) or icon placeholders must be used
until it lands. STOP and resolve if either precondition is missing.**

### 0-A — Branch / precondition check

```powershell
git log --oneline -10
git status
```

Expected: working tree clean on `main`; recent history includes all three of:
- Task 4-3 commit (`feat(web): add shell + sidebar component tree bound to WeatherStore`)
- Task 4-2 commit (`feat(web): add signals-based WeatherStore with debounced RxJS search`)
- Task 4-1 commit (`feat(web): add WeatherApiService + HttpClient + env/proxy`)

If any of the above commits are absent, STOP — this task mounts into the `.workspace` slot that
Task 4-3 created and binds to the store that Task 4-2 created.

**lucide-angular gate check:**

```powershell
npm list lucide-angular
```

If `lucide-angular` is not listed, do NOT install it here. Either sequence Task 4-6 first or use
empty placeholder `<span>` elements in place of icon components and note them for follow-up. STOP
and ask the implementer which approach to take before writing any icon-dependent markup.

### 0-B — Baseline build / test / lint green

```powershell
npm run build
npm test
npm run lint
```

All three must exit 0 before any file is touched. A pre-existing failure is a regression from a
prior task — resolve it before continuing.

### 0-C — Files to open before starting

Verify these files exist and read them in full:

| File | Purpose |
|------|---------|
| `apps/web/src/app/core/weather.store.ts` | Store signals/handlers this task binds to: `search`, `onSearchInput`, `showSuggestions`, `searchFocused`, `suggestions`, `chooseLocation`, `unitSystem`, `changeUnits`, `loadDashboard` |
| `apps/web/src/app/app.html` | The `.workspace` section where `<app-topbar>` mounts as first child |
| `apps/web/src/app/app.ts` | Root component imports list to extend with `TopbarComponent` |
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` lines 366–415 | The verbatim DOM source for the topbar block |

**STOP if `apps/web/src/app/core/weather.store.ts` does not exist** — Task 4-2 has not landed.
**STOP if `apps/web/src/app/app.html` does not contain `class="workspace"`** — Task 4-3 has not landed.

Confirm the exact signal and handler names from the store file before writing any template
bindings. The required names are:

- **Signals (readable):** `search`, `showSuggestions`, `suggestions`, `searchFocused`, `unitSystem`
- **Writable signal setter:** `searchFocused` (set via `store.searchFocused.set(...)`)
- **Methods:** `onSearchInput(value: string)`, `chooseLocation(location)`, `changeUnits('imperial' | 'metric')`, `loadDashboard()`

If any name differs in the actual store file, use the actual name and note the discrepancy.

---

## Step 1 — Create the `topbar` feature directory

Create the directory `apps/web/src/app/features/topbar/`. All four new component files live here.

If a `features/` directory does not yet exist (Task 4-3 may have used a different convention),
mirror whatever directory structure Task 4-3 used for the sidebar components. The path below
assumes a `features/` layout — adjust if the sidebar components live elsewhere.

**Verify:** the directory exists (no build step required for an empty directory).

---

## Step 2 — Create `SearchBoxComponent`

**File:** `apps/web/src/app/features/topbar/search-box.component.ts` (new)
**File:** `apps/web/src/app/features/topbar/search-box.component.html` (new)

This component renders `<form class="search-box">` and its dropdown. It injects `WeatherStore`
and binds every event exactly as the source `App.vue` does.

**`search-box.component.ts`:**

```typescript
import { Component, inject } from '@angular/core';
import { WeatherStore } from '../../core/weather.store';

@Component({
  selector: 'app-search-box',
  standalone: true,
  templateUrl: './search-box.component.html',
})
export class SearchBoxComponent {
  protected store = inject(WeatherStore);
}
```

**`search-box.component.html`** — reproduce the source DOM verbatim. The icon elements are
forward-declared as `<!-- Search icon -->` and `<!-- MapPin icon -->` placeholders if
`lucide-angular` has not yet landed; replace with the real icon components once Task 4-6
installs the library.

```html
<form class="search-box" (submit)="$event.preventDefault(); store.loadDashboard()">
  <!-- Search icon: <lucide-icon name="search" [strokeWidth]="1.9" /> or placeholder -->
  <input
    [value]="store.search()"
    placeholder="Search for a city, state, or ZIP..."
    (input)="store.onSearchInput($any($event.target).value)"
    (focus)="store.searchFocused.set(true)"
    (keydown.escape)="store.searchFocused.set(false)"
  />
  <kbd>Ctrl K</kbd>
  @if (store.showSuggestions()) {
    <div class="search-suggestions">
      @for (location of store.suggestions(); track location.name + '-' + location.region + '-' + location.latitude) {
        <button
          type="button"
          (mousedown)="$event.preventDefault(); store.chooseLocation(location)"
        >
          <!-- MapPin icon: <lucide-icon name="map-pin" [strokeWidth]="1.7" /> or placeholder -->
          <span>
            <strong>{{ location.name }}</strong>
            <em>{{ location.region }} {{ location.country }}</em>
          </span>
        </button>
      }
    </div>
  }
</form>
```

**Implementation notes:**

- `(submit)` with `$event.preventDefault()` mirrors `@submit.prevent="loadDashboard"`. In
  Angular, the idiomatic form is `(ngSubmit)` on a `<form>`, but since the form has no
  `FormGroup`, a plain `(submit)` with `$event.preventDefault()` is equivalent and avoids
  importing `FormsModule`.
- `[value]="store.search()"` is a one-way binding; the signal is updated via `onSearchInput`.
  Do **not** use `[(ngModel)]` (requires `FormsModule`) — the unidirectional bind + input event
  mirrors the source's `v-model` + `@input` separation through the store's `onSearchInput`.
- `(mousedown)="$event.preventDefault(); store.chooseLocation(location)"` mirrors
  `@mousedown.prevent="chooseLocation(location)"`. `mousedown` fires before `blur` on the input,
  so the suggestion is chosen before the dropdown closes — this is the load-bearing reason the
  source uses `mousedown` instead of `click`.
- `store.searchFocused.set(true/false)` is the Angular signal-write equivalent of Vue's
  `searchFocused = true/false`. If the store exposes `searchFocused` as a writable signal
  (`WritableSignal<boolean>`), call `.set()` on it directly. If the store instead exposes a
  dedicated setter method, use that instead — check the actual store file in Step 0-C.
- Icon placeholders: if `lucide-angular` is installed, import `LucideAngularModule` (or the
  specific icon components) into `SearchBoxComponent.imports` and replace the comment
  placeholders with the real elements. If not installed, leave comment placeholders and add a
  `TODO(4-6)` comment so Task 4-6 can complete the wiring.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The component must compile with no type errors against the store's signal
and method types.

---

## Step 3 — Create `UnitSwitchComponent`

**File:** `apps/web/src/app/features/topbar/unit-switch.component.ts` (new)
**File:** `apps/web/src/app/features/topbar/unit-switch.component.html` (new)

**`unit-switch.component.ts`:**

```typescript
import { Component, inject } from '@angular/core';
import { WeatherStore } from '../../core/weather.store';

@Component({
  selector: 'app-unit-switch',
  standalone: true,
  templateUrl: './unit-switch.component.html',
})
export class UnitSwitchComponent {
  protected store = inject(WeatherStore);
}
```

**`unit-switch.component.html`** — reproduce the source DOM verbatim including the
`aria-label`:

```html
<div class="unit-switch" aria-label="Temperature units">
  <button
    type="button"
    [class.is-active]="store.unitSystem() === 'imperial'"
    (click)="store.changeUnits('imperial')"
  >
    &deg;F
  </button>
  <button
    type="button"
    [class.is-active]="store.unitSystem() === 'metric'"
    (click)="store.changeUnits('metric')"
  >
    &deg;C
  </button>
</div>
```

**Implementation note:** `[class.is-active]` is the Angular equivalent of Vue's
`:class="{ 'is-active': ... }"`. The class name `is-active` must match exactly — it is the
CSS selector from the lifted `styles.scss`.

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 4 — Create `ProfileClusterComponent`

**File:** `apps/web/src/app/features/topbar/profile-cluster.component.ts` (new)
**File:** `apps/web/src/app/features/topbar/profile-cluster.component.html` (new)

This component is entirely static per §0.1. No store injection is needed.

**`profile-cluster.component.ts`:**

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-profile-cluster',
  standalone: true,
  templateUrl: './profile-cluster.component.html',
})
export class ProfileClusterComponent {}
```

**`profile-cluster.component.html`** — reproduce the source DOM verbatim, including the exact
Unsplash avatar URL and the trailing `<span></span>` dot on the notifications button:

```html
<div class="profile-cluster">
  <button class="icon-button" type="button" aria-label="Notifications">
    <!-- Bell icon: <lucide-icon name="bell" [strokeWidth]="1.8" /> or placeholder -->
    <span></span>
  </button>
  <div class="profile">
    <img
      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80"
      alt="Alex Morgan"
    />
    <span>
      <strong>Alex Morgan</strong>
      <em>Premium</em>
    </span>
    <!-- ChevronDown icon: <lucide-icon name="chevron-down" [strokeWidth]="1.8" /> or placeholder -->
  </div>
</div>
```

**Implementation note:** the trailing `<span></span>` after the Bell icon is the notification dot
rendered by CSS — it must be present even though it has no text content.

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 5 — Create `TopbarComponent`

**File:** `apps/web/src/app/features/topbar/topbar.component.ts` (new)
**File:** `apps/web/src/app/features/topbar/topbar.component.html` (new)

`TopbarComponent` is the compositor. It imports the three child components and renders them
inside `<header class="topbar">` in the exact source order: search box, unit switch, profile
cluster.

**`topbar.component.ts`:**

```typescript
import { Component } from '@angular/core';
import { SearchBoxComponent } from './search-box.component';
import { UnitSwitchComponent } from './unit-switch.component';
import { ProfileClusterComponent } from './profile-cluster.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [SearchBoxComponent, UnitSwitchComponent, ProfileClusterComponent],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {}
```

**`topbar.component.html`:**

```html
<header class="topbar">
  <app-search-box />
  <app-unit-switch />
  <app-profile-cluster />
</header>
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. All three child selectors must resolve.

---

## Step 6 — Mount `<app-topbar>` as first child of `.workspace`

**File:** `apps/web/src/app/app.html` (modify)
**File:** `apps/web/src/app/app.ts` (modify)

### 6-A — Update `app.html`

Locate the `<section class="workspace">` block that Task 4-3 left as a placeholder. Add
`<app-topbar />` as its **first child**, before any existing workspace content (loading panel,
error panel, or dashboard slot).

The resulting workspace block must look like:

```html
<section class="workspace">
  <app-topbar />
  <!-- remaining workspace content from Task 4-3 placeholder -->
</section>
```

Do not move or remove any sibling content Task 4-3 placed in the workspace section.

### 6-B — Update `app.ts`

Add `TopbarComponent` to the root `App` component's `imports` array:

```typescript
import { TopbarComponent } from './features/topbar/topbar.component';

// In @Component:
imports: [SidebarComponent, TopbarComponent],
```

Mirror the import path pattern that Task 4-3 used for `SidebarComponent`.

**Verify:**

```powershell
npm run build
npm run lint
```

Both must exit 0. The `<app-topbar>` element must resolve without an "unknown element" warning.

---

## Step 7 — Full build / lint / test gate

```powershell
npm run build
```

Expected: exits 0 across the workspace. No type errors in the four new component files or in
`app.ts` / `app.html`.

```powershell
npm run lint
```

Expected: exits 0. Check:
- No unused imports in any edited file.
- No `any` escapes beyond the intentional `$any($event.target).value` cast in the search input
  (which is the idiomatic Angular way to read `HTMLInputElement.value` without importing
  `FormsModule`).
- `ProfileClusterComponent` has no injected dependencies (it is fully static).

```powershell
npm test
```

Expected: exits 0. No new test files are authored in this task (component tests are Phase 6).

**Verify:** all three commands exit 0.

---

## Step 8 — DOM fidelity checklist

Before committing, read back each template and confirm against the source `App.vue` lines
366–415:

| Requirement | Check |
|-------------|-------|
| Outer element: `<header class="topbar">` composed in `topbar.component.html` | |
| Search form: `<form class="search-box">` — not `<div>` | |
| Input placeholder exactly `"Search for a city, state, or ZIP..."` | |
| `(focus)` → `searchFocused` true; `(keydown.escape)` → `searchFocused` false | |
| Dropdown class exactly `.search-suggestions` | |
| Suggestion button uses `(mousedown)` not `(click)` | |
| Suggestion inner: `<strong>name</strong>` and `<em>region country</em>` inside a `<span>` | |
| `<kbd>Ctrl K</kbd>` present inside the form | |
| Unit switch: `<div class="unit-switch" aria-label="Temperature units">` — not `<nav>` | |
| `is-active` class on the matching unit button | |
| Profile cluster: `<div class="profile-cluster">` | |
| Notifications: `<button class="icon-button" …>` with trailing `<span></span>` | |
| Profile: `<div class="profile">` with avatar `<img>`, `<strong>Alex Morgan</strong>`, `<em>Premium</em>` | |
| Source order in `<header>`: search → units → profile | |
| `<app-topbar />` is the **first child** of `<section class="workspace">` | |

Correct any discrepancy before staging.

---

## Step 9 — Diff sanity check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new files:**

- `apps/web/src/app/features/topbar/search-box.component.ts`
- `apps/web/src/app/features/topbar/search-box.component.html`
- `apps/web/src/app/features/topbar/unit-switch.component.ts`
- `apps/web/src/app/features/topbar/unit-switch.component.html`
- `apps/web/src/app/features/topbar/profile-cluster.component.ts`
- `apps/web/src/app/features/topbar/profile-cluster.component.html`
- `apps/web/src/app/features/topbar/topbar.component.ts`
- `apps/web/src/app/features/topbar/topbar.component.html`

**Expected modified files:**

- `apps/web/src/app/app.html`
- `apps/web/src/app/app.ts`

**Must NOT appear in the diff:**

- `apps/web/src/app/core/weather.store.ts` (consume only, do not change)
- `apps/web/src/app/core/weather-api.service.ts` (consume only, do not change)
- `apps/web/src/styles.scss` (Task 4-6)
- `apps/web/src/index.html` (Task 4-6)
- `package.json` / `package-lock.json` (no new dependency)
- `apps/api/**` (backend, Task 4 is frontend only)
- `libs/shared-types/**` (Phase 1, read-only)
- `prisma/**` (Phase 2, no schema edit)

If any unexpected file appears, investigate and revert before staging.

### Stage and commit

```powershell
git add apps/web/src/app/features/topbar/search-box.component.ts
git add apps/web/src/app/features/topbar/search-box.component.html
git add apps/web/src/app/features/topbar/unit-switch.component.ts
git add apps/web/src/app/features/topbar/unit-switch.component.html
git add apps/web/src/app/features/topbar/profile-cluster.component.ts
git add apps/web/src/app/features/topbar/profile-cluster.component.html
git add apps/web/src/app/features/topbar/topbar.component.ts
git add apps/web/src/app/features/topbar/topbar.component.html
git add apps/web/src/app/app.html
git add apps/web/src/app/app.ts
```

Confirm staged set:

```powershell
git status
```

Expected: exactly the ten files above staged, nothing else.

```powershell
git commit -m "feat(web): add topbar component tree (search / units / profile)

Port App.vue's <header class=\"topbar\"> into standalone components,
reproducing the source DOM and class names verbatim:

- SearchBoxComponent (.search-box + .search-suggestions) bound to the
  store's debounced search: input -> onSearchInput, focus/escape ->
  searchFocused, suggestion mousedown -> chooseLocation, submit ->
  loadDashboard.
- UnitSwitchComponent (.unit-switch) reflecting store.unitSystem() and
  calling changeUnits('imperial' | 'metric') (round-trips preferences).
- ProfileClusterComponent (.profile-cluster) — static Bell + Alex Morgan /
  Premium + ChevronDown per §0.1.

Mounted as the first child of .workspace. build/lint/test green."
```

No `Co-Authored-By` trailer.

**Final verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit message above appears at HEAD; the stat shows ten files (eight new, two
modified) — all within `apps/web/src/app/features/topbar/` or `apps/web/src/app/app.*`.

---

## Summary of gates

| Step | Gate |
|------|------|
| 0-A | `git log` shows Task 4-1/4-2/4-3 commits; `git status` clean; `lucide-angular` gate resolved |
| 0-B | `npm run build` + `npm test` + `npm run lint` green at baseline |
| 0-C | `weather.store.ts` and `app.html` (with `.workspace`) exist; signal/method names confirmed |
| 1 | `features/topbar/` directory created |
| 2 | `search-box.component.*` created; `npm run build` exits 0 |
| 3 | `unit-switch.component.*` created; `npm run build` exits 0 |
| 4 | `profile-cluster.component.*` created; `npm run build` exits 0 |
| 5 | `topbar.component.*` created; `npm run build` exits 0; all child selectors resolve |
| 6 | `app.html` updated (`<app-topbar />` first in `.workspace`); `app.ts` imports `TopbarComponent`; `npm run build` + `npm run lint` exit 0 |
| 7 | `npm run build` + `npm run lint` + `npm test` green post-implementation |
| 8 | DOM fidelity checklist passes (15 items) |
| 9 | `git diff --stat` shows exactly 10 files; commit message matches Tasks doc; no trailer |
