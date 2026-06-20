# Impl 4-3 — Shell / sidebar component tree

**Acceptance contract:** `docs/tasks/Tasks-4-3.md`
**Decision lock:** No ADR. Locked by `docs/RoadMap.md` §0.5 ("reproduce the same DOM structure and class names in Angular templates"), Phase 4 "DOM/class fidelity is load-bearing" constraint, and Phase 4 "Component decomposition (identical DOM + class names) — Shell" bullet. Task 4-2 (`WeatherStore`) is a direct dependency; Task 4-6 (`lucide-angular`) is a forward dependency.
**Scope:** `apps/web/src/app/` only — six new standalone component files plus edits to `app.ts` and `app.html`. No schema change, no new dependency.

---

## Step 0 — Pre-flight

### 0-A — Dependency gate: lucide-angular (Task 4-6)

**STOP and read this before any code is written.**

`BrandComponent`, `NavListComponent`, `SavedLocationsComponent`, `PremiumCardComponent`, and `ThemeToggleComponent` all import lucide icon components (`CloudLightning`, `Home`, `CalendarDays`, `Map`, `LocateFixed`, `MapPin`, `Bell`, `Settings`, `ArrowUp`, `ArrowDown`, `Star`, `Trash2`, `Gem`, `Navigation`, `Moon`). These are provided by `lucide-angular`, which is **not yet installed** — it is the approval-gated dependency owned by Task 4-6.

Sequence decision (choose one before proceeding):

- **Option A (recommended):** Complete Task 4-6 first (approval gate → `npm install lucide-angular` → barrel export wired). Then proceed with Task 4-3 using real lucide imports.
- **Option B:** Proceed with Task 4-3 now using icon placeholder elements (`<span>` or nothing) and mark every icon usage with a `// TODO(4-6): replace with lucide icon` comment. Wire the real imports in a follow-up pass once 4-6 lands. `npm run build` and `npm run lint` must still be green with the placeholders.

**If Option B is chosen, DO NOT install `lucide-angular` in this task.** That install is approval-gated to Task 4-6. Raise the approval gate before installing.

This Impl doc is written assuming **Option A** (lucide-angular already installed from Task 4-6). If 4-6 has not landed when this task executes, apply Option B substitutions at every icon usage site and revisit after 4-6 lands.

### 0-B — Precondition task check

```powershell
git log --oneline -10
git status
```

Expected: working tree clean on `main`; recent history includes:
- Task 4-1 commit: `feat(web): add WeatherApiService, HttpClient, env/proxy`
- Task 4-2 commit: `feat(web): add signals-based WeatherStore with debounced RxJS search`

If either is absent from the log, **STOP** — this task injects `WeatherStore` and those must be landed first.

### 0-C — Baseline build / test / lint green

```powershell
npm run build
npm test
npm run lint
```

All three must exit 0 before any file is touched.

### 0-D — Files to open before starting

Verify every file below exists and read it in full before writing code:

| File | Purpose |
|------|---------|
| `apps/web/src/app/app.ts` | Current `App` component (NxWelcome placeholder) to replace |
| `apps/web/src/app/app.html` | Current template (`<app-nx-welcome>`) to replace |
| `apps/web/src/app/app.config.ts` | App configuration (must not be modified) |
| `apps/web/src/app/core/weather.store.ts` | WeatherStore (Task 4-2) — inject in SavedLocationsComponent and App |
| `apps/web/src/app/core/weather-api.service.ts` | WeatherApiService (Task 4-1) — not modified here, for reference |
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` lines 263–363 | Canonical sidebar DOM — reproduce verbatim |
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` lines 55–63 | `navItems` definition — reproduce exact labels, icon names, and `active` entry |

**STOP if `apps/web/src/app/core/weather.store.ts` does not exist** — Task 4-2 has not landed.

---

## Step 1 — Create `BrandComponent`

**Files (new):**
- `apps/web/src/app/sidebar/brand.component.ts`
- `apps/web/src/app/sidebar/brand.component.html`

The component renders the `<a class="brand">` anchor from the source `App.vue` line 264. No inputs, no store injection.

`brand.component.ts`:

```typescript
import { Component } from '@angular/core';
import { CloudLightning } from 'lucide-angular';

@Component({
  selector: 'app-brand',
  imports: [CloudLightning],
  templateUrl: './brand.component.html',
})
export class BrandComponent {}
```

`brand.component.html` — reproduce the source DOM verbatim (App.vue lines 264–272):

```html
<a class="brand" href="#">
  <span class="brand__mark">
    <lucide-icon [img]="CloudLightning" [size]="20"></lucide-icon>
  </span>
  <span>
    <strong>Nimbus</strong>
    <em>Weather</em>
  </span>
</a>
```

> Note on icon rendering: follow the `lucide-angular` usage pattern established by Task 4-6's wiring (the icon is imported as a class reference and passed via `[img]`). If Task 4-6 uses a different binding convention — e.g. `<lucide-angular name="cloud-lightning">` or `<i-lucide name="cloud-lightning">` — match that pattern exactly. Read the Task 4-6 barrel before writing this template.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. `BrandComponent` must compile with no type errors.

---

## Step 2 — Create `NavListComponent`

**Files (new):**
- `apps/web/src/app/sidebar/nav-list.component.ts`
- `apps/web/src/app/sidebar/nav-list.component.html`

The component renders `<nav class="nav-list">` with one `<a class="nav-list__item">` per entry. The seven nav entries mirror the source `navItems` array (App.vue lines 55–63). The `is-active` class is applied only to the Overview entry (the only one with `active: true` in the source).

Because `navItems` is static and owned by this component, no inputs are needed. The icon set for nav entries: `Home` (Overview), `CalendarDays` (Forecast), `Map` (Maps), `LocateFixed` (Radar), `MapPin` (Locations), `Bell` (Alerts), `Settings` (Settings).

`nav-list.component.ts`:

```typescript
import { Component } from '@angular/core';
import { NgClass, NgFor } from '@angular/common';
import {
  Bell,
  CalendarDays,
  Home,
  LocateFixed,
  LucideAngularModule,
  Map,
  MapPin,
  Settings,
} from 'lucide-angular';

@Component({
  selector: 'app-nav-list',
  imports: [NgFor, NgClass, LucideAngularModule],
  templateUrl: './nav-list.component.html',
})
export class NavListComponent {
  readonly navItems = [
    { label: 'Overview', icon: Home, active: true },
    { label: 'Forecast', icon: CalendarDays },
    { label: 'Maps', icon: Map },
    { label: 'Radar', icon: LocateFixed },
    { label: 'Locations', icon: MapPin },
    { label: 'Alerts', icon: Bell },
    { label: 'Settings', icon: Settings },
  ];
}
```

`nav-list.component.html` — reproduce App.vue lines 274–285 verbatim:

```html
<nav class="nav-list">
  <a
    *ngFor="let item of navItems"
    href="#"
    class="nav-list__item"
    [ngClass]="{ 'is-active': item.active }"
  >
    <lucide-icon [img]="item.icon" [size]="18"></lucide-icon>
    <span>{{ item.label }}</span>
  </a>
</nav>
```

> Adjust lucide binding to match the Task 4-6 icon-usage convention. If Task 4-6 establishes `LucideAngularModule` as the import vehicle (providing the `<lucide-icon>` element), keep that. If it uses individual named components, import each individually and use the component element directly. Read the Task 4-6 Impl before finalizing.

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 3 — Create `SavedLocationsComponent`

**Files (new):**
- `apps/web/src/app/sidebar/saved-locations.component.ts`
- `apps/web/src/app/sidebar/saved-locations.component.html`

This is the most behavior-rich component. It injects `WeatherStore`, reads `store.savedLocations()` and `store.updatingLocationId()`, and calls the four store handler methods from the action buttons.

**Exact DOM structure (App.vue lines 287–341):** `<section class="saved-locations" aria-label="Saved locations">` containing a `<header><span>Saved</span></header>` followed by one `<article class="saved-location-row">` per location.

**Disabled conditions (port verbatim from App.vue):**
- Up button: `index === 0 || updatingLocationId() === location.id`
- Down button: `index === savedLocations().length - 1 || updatingLocationId() === location.id`
- Star button: `location.isDefault || updatingLocationId() === location.id`
- Trash button: `updatingLocationId() === location.id`

**Track expression:** `location.name + '-' + location.region` (mirrors `\`${location.name}-${location.region}\`` from the Vue `:key`).

`saved-locations.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { NgFor, NgClass, NgIf } from '@angular/common';
import {
  ArrowDown,
  ArrowUp,
  LucideAngularModule,
  MapPin,
  Star,
  Trash2,
} from 'lucide-angular';
import { WeatherStore } from '../core/weather.store';

@Component({
  selector: 'app-saved-locations',
  imports: [NgIf, NgFor, NgClass, LucideAngularModule],
  templateUrl: './saved-locations.component.html',
})
export class SavedLocationsComponent {
  readonly store = inject(WeatherStore);
  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;
  readonly MapPin = MapPin;
  readonly Star = Star;
  readonly Trash2 = Trash2;
}
```

`saved-locations.component.html` — reproduce App.vue lines 287–341 verbatim:

```html
<section
  *ngIf="store.savedLocations().length > 0"
  class="saved-locations"
  aria-label="Saved locations"
>
  <header>
    <span>Saved</span>
  </header>
  <article
    *ngFor="let location of store.savedLocations(); let i = index; trackBy: trackLocation"
    class="saved-location-row"
    [ngClass]="{ 'is-default': location.isDefault }"
  >
    <button
      type="button"
      class="saved-location-row__main"
      (click)="store.chooseLocation(location)"
    >
      <lucide-icon [img]="MapPin" [size]="16"></lucide-icon>
      <span>
        <strong>{{ location.name }}</strong>
        <em>{{ location.region }}</em>
      </span>
    </button>
    <button
      type="button"
      class="saved-location-row__icon"
      [disabled]="i === 0 || store.updatingLocationId() === location.id"
      [attr.aria-label]="'Move ' + location.name + ' up'"
      (click)="store.moveSavedLocation(location, i, -1)"
    >
      <lucide-icon [img]="ArrowUp" [size]="14"></lucide-icon>
    </button>
    <button
      type="button"
      class="saved-location-row__icon"
      [disabled]="i === store.savedLocations().length - 1 || store.updatingLocationId() === location.id"
      [attr.aria-label]="'Move ' + location.name + ' down'"
      (click)="store.moveSavedLocation(location, i, 1)"
    >
      <lucide-icon [img]="ArrowDown" [size]="14"></lucide-icon>
    </button>
    <button
      type="button"
      class="saved-location-row__icon"
      [disabled]="location.isDefault || store.updatingLocationId() === location.id"
      [attr.aria-label]="'Make ' + location.name + ' default'"
      (click)="store.makeDefaultLocation(location)"
    >
      <lucide-icon [img]="Star" [size]="14"></lucide-icon>
    </button>
    <button
      type="button"
      class="saved-location-row__icon"
      [disabled]="store.updatingLocationId() === location.id"
      [attr.aria-label]="'Remove ' + location.name"
      (click)="store.removeSavedLocation(location)"
    >
      <lucide-icon [img]="Trash2" [size]="14"></lucide-icon>
    </button>
  </article>
</section>
```

Add the `trackLocation` method to the component class:

```typescript
trackLocation(_: number, location: { name: string; region: string }): string {
  return `${location.name}-${location.region}`;
}
```

> `NgIf` / `NgFor` / `NgClass` are used instead of Angular 17+ control-flow blocks (`@if` / `@for`) because the project's `apps/web` scaffold may or may not have the newer template syntax enabled. If `@if` / `@for` are already used in existing templates in the workspace, prefer those; otherwise use `*ngIf` / `*ngFor` as shown and import `NgIf`, `NgFor`, `NgClass` from `@angular/common`. Consistency with the existing codebase takes precedence.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. Confirm the `WeatherStore` import path resolves (`apps/web/src/app/core/weather.store.ts` from Task 4-2).

---

## Step 4 — Create `PremiumCardComponent`

**Files (new):**
- `apps/web/src/app/sidebar/premium-card.component.ts`
- `apps/web/src/app/sidebar/premium-card.component.html`

No inputs, no store. Reproduces App.vue lines 343–353 verbatim.

`premium-card.component.ts`:

```typescript
import { Component } from '@angular/core';
import { Gem, LucideAngularModule, Navigation } from 'lucide-angular';

@Component({
  selector: 'app-premium-card',
  imports: [LucideAngularModule],
  templateUrl: './premium-card.component.html',
})
export class PremiumCardComponent {
  readonly Gem = Gem;
  readonly Navigation = Navigation;
}
```

`premium-card.component.html`:

```html
<section class="premium-card" aria-label="Premium upgrade">
  <div class="premium-card__gem">
    <lucide-icon [img]="Gem" [size]="24"></lucide-icon>
  </div>
  <strong>Go Premium</strong>
  <p>Unlock advanced features and an ad-free experience.</p>
  <button type="button">
    <span>Upgrade Now</span>
    <lucide-icon [img]="Navigation" [size]="16"></lucide-icon>
  </button>
</section>
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 5 — Create `ThemeToggleComponent`

**Files (new):**
- `apps/web/src/app/sidebar/theme-toggle.component.ts`
- `apps/web/src/app/sidebar/theme-toggle.component.html`

Cosmetic component — dark-only, no theme-switching logic (per Roadmap §0.1 "dark-mode toggle UI present but cosmetic"). Reproduces App.vue lines 355–362 verbatim.

`theme-toggle.component.ts`:

```typescript
import { Component } from '@angular/core';
import { LucideAngularModule, Moon } from 'lucide-angular';

@Component({
  selector: 'app-theme-toggle',
  imports: [LucideAngularModule],
  templateUrl: './theme-toggle.component.html',
})
export class ThemeToggleComponent {
  readonly Moon = Moon;
}
```

`theme-toggle.component.html`:

```html
<label class="theme-toggle">
  <span>
    <lucide-icon [img]="Moon" [size]="16"></lucide-icon>
    Dark Mode
  </span>
  <input type="checkbox" checked />
  <i aria-hidden="true"></i>
</label>
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 6 — Create `SidebarComponent`

**Files (new):**
- `apps/web/src/app/sidebar/sidebar.component.ts`
- `apps/web/src/app/sidebar/sidebar.component.html`

Composes the five child components in source order (App.vue lines 263–363): Brand → NavList → SavedLocations → PremiumCard → ThemeToggle. No store injection here; `SavedLocationsComponent` handles its own store injection.

`sidebar.component.ts`:

```typescript
import { Component } from '@angular/core';
import { BrandComponent } from './brand.component';
import { NavListComponent } from './nav-list.component';
import { SavedLocationsComponent } from './saved-locations.component';
import { PremiumCardComponent } from './premium-card.component';
import { ThemeToggleComponent } from './theme-toggle.component';

@Component({
  selector: 'app-sidebar',
  imports: [
    BrandComponent,
    NavListComponent,
    SavedLocationsComponent,
    PremiumCardComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {}
```

`sidebar.component.html` — reproduces the `<aside>` wrapper from App.vue line 263:

```html
<aside class="sidebar" aria-label="Primary">
  <app-brand></app-brand>
  <app-nav-list></app-nav-list>
  <app-saved-locations></app-saved-locations>
  <app-premium-card></app-premium-card>
  <app-theme-toggle></app-theme-toggle>
</aside>
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. All five child selectors must resolve.

---

## Step 7 — Wire the shell: replace `App` placeholder with `.app-shell`

**Files (modify):**
- `apps/web/src/app/app.ts`
- `apps/web/src/app/app.html`

**`app.ts`** — remove `NxWelcome` and `title = 'web'`; inject `WeatherStore`; add `ngOnInit` that calls `store.init()` (the Task 4-2 boot sequence); import `SidebarComponent`:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { WeatherStore } from './core/weather.store';

@Component({
  selector: 'app-root',
  imports: [SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly store = inject(WeatherStore);

  ngOnInit(): void {
    this.store.init();
  }
}
```

> The `NxWelcome` import and `nx-welcome.ts` usage are removed. The `title` property is removed. The `app.scss` file reference is retained unchanged (it is an empty placeholder; do not delete it — other tasks may use it).

**`app.html`** — replace `<app-nx-welcome>` with the `.app-shell` grid containing the sidebar and the workspace placeholder:

```html
<main class="app-shell">
  <app-sidebar></app-sidebar>
  <section class="workspace">
    <!-- Topbar (Task 4-4) and dashboard panels (Task 4-5) go here -->
  </section>
</main>
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The `NxWelcome` import must be gone. No reference to `nx-welcome` may remain in `app.ts` or `app.html`.

Check that `apps/web/src/app/nx-welcome.ts` is **not deleted** — it may be referenced by `app.spec.ts`. Verify:

```powershell
# Confirm nx-welcome.ts still exists (do not delete it; the spec may reference it)
Test-Path apps/web/src/app/nx-welcome.ts
```

If `app.spec.ts` imports or references `NxWelcome`, update the spec to remove those references so `npm test` stays green. Do not delete `nx-welcome.ts` itself unless confirmed safe.

---

## Step 8 — Update `app.spec.ts` if needed

**File (modify if needed):** `apps/web/src/app/app.spec.ts`

Read the current spec. If it imports `NxWelcome` or asserts on the `title` property or the `nx-welcome` component, update it:
- Remove the `NxWelcome` import.
- Replace any `title` fixture assertion with a check that `<main class="app-shell">` is present in the rendered output, or simply remove the stale assertion and replace with a smoke test confirming the component renders without error.
- Keep `TestBed.createComponent(App)` in place — do not delete the spec file.

**Verify:**

```powershell
npm test
```

Expected: exits 0. The updated spec must pass.

---

## Step 9 — Full gate: build / lint / test

```powershell
npm run build
```

Expected: exits 0 across the entire workspace. No type errors in any new component or in the modified `app.ts`.

```powershell
npm run lint
```

Expected: exits 0. Check that:
- No unused imports remain in any new `.ts` file.
- Every lucide icon class imported in a component is actually used in the template.
- `SavedLocationsComponent` has no `@typescript-eslint/no-explicit-any` violations (all store calls are typed through `WeatherStore`'s signal/method signatures).
- The `trackLocation` method is not flagged as unused (it is referenced by `trackBy` in the template).

```powershell
npm test
```

Expected: exits 0. No new test files are added in this task (dedicated component specs are Phase 6, per acceptance criterion 5 / Tasks doc "No new specs").

**Verify:** all three commands exit 0.

---

## Step 10 — Diff sanity check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new files:**

- `apps/web/src/app/sidebar/brand.component.ts`
- `apps/web/src/app/sidebar/brand.component.html`
- `apps/web/src/app/sidebar/nav-list.component.ts`
- `apps/web/src/app/sidebar/nav-list.component.html`
- `apps/web/src/app/sidebar/saved-locations.component.ts`
- `apps/web/src/app/sidebar/saved-locations.component.html`
- `apps/web/src/app/sidebar/premium-card.component.ts`
- `apps/web/src/app/sidebar/premium-card.component.html`
- `apps/web/src/app/sidebar/theme-toggle.component.ts`
- `apps/web/src/app/sidebar/theme-toggle.component.html`
- `apps/web/src/app/sidebar/sidebar.component.ts`
- `apps/web/src/app/sidebar/sidebar.component.html`

**Expected modified files:**

- `apps/web/src/app/app.ts`
- `apps/web/src/app/app.html`
- `apps/web/src/app/app.spec.ts` (only if it referenced `NxWelcome` or `title`)

**Must NOT appear in the diff:**

- `apps/web/src/app/nx-welcome.ts` (not deleted)
- `apps/web/src/app/core/weather.store.ts` (Task 4-2, consume only)
- `apps/web/src/app/core/weather-api.service.ts` (Task 4-1, consume only)
- `apps/web/src/app/app.config.ts` (not modified)
- `package.json` or `package-lock.json` (no new dependency)
- `apps/api/**` (backend is out of scope)
- `libs/shared-types/**` (read-only)
- `prisma/**` (no schema change)

If any unexpected file appears, investigate and revert before staging.

### Stage and commit

```powershell
git add apps/web/src/app/sidebar/
git add apps/web/src/app/app.ts
git add apps/web/src/app/app.html
# If app.spec.ts was modified:
git add apps/web/src/app/app.spec.ts
```

Confirm staged set:

```powershell
git status
```

Expected: exactly the sidebar directory (12 files) plus `app.ts` / `app.html` (and optionally `app.spec.ts`) staged. Nothing else.

```powershell
git commit -m "feat(web): add shell + sidebar component tree bound to WeatherStore

Replace the Nx-welcome placeholder with the real .app-shell grid and port
App.vue's <aside class=\"sidebar\"> into standalone components, reproducing
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
the store boot sequence. build/lint/test green."
```

No `Co-Authored-By` trailer.

**Final verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit message above at HEAD; the stat shows the 12 sidebar files (new) plus `app.ts` / `app.html` (and optionally `app.spec.ts`) — all within `apps/web/src/app/`.

---

## Summary of gates

| Step | Gate |
|------|------|
| 0-A | lucide-angular dependency decision made (Option A or B); if Option B, no `npm install` runs |
| 0-B | `git log` shows Task 4-1 and 4-2 commits; `git status` clean |
| 0-C | `npm run build` + `npm test` + `npm run lint` green at baseline |
| 0-D | `weather.store.ts` exists; all required files readable |
| 1 | `brand.component.ts/.html` created; `npm run build` exits 0 |
| 2 | `nav-list.component.ts/.html` created; `npm run build` exits 0 |
| 3 | `saved-locations.component.ts/.html` created; `npm run build` exits 0 |
| 4 | `premium-card.component.ts/.html` created; `npm run build` exits 0 |
| 5 | `theme-toggle.component.ts/.html` created; `npm run build` exits 0 |
| 6 | `sidebar.component.ts/.html` created; all five child selectors resolve; `npm run build` exits 0 |
| 7 | `app.ts` / `app.html` updated; `NxWelcome` removed; `store.init()` called; `npm run build` exits 0 |
| 8 | `app.spec.ts` updated if needed; `npm test` exits 0 |
| 9 | `npm run build` + `npm run lint` + `npm test` all green post-implementation |
| 10 | `git diff --stat` shows only sidebar files + `app.ts`/`app.html`; commit message matches Tasks doc |
