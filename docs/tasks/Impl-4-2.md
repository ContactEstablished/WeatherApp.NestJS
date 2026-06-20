# Impl 4-2 — WeatherStore signals state + RxJS search debounce

**Acceptance contract:** `docs/tasks/Tasks-4-2.md`
**Decision lock:** No ADRs in `docs/decisions/`. Locked by `docs/RoadMap.md` Phase 4 ("State —
`WeatherStore` service" and "Search debounce (RxJS)" scope bullets; "Search wiring — RxJS `Subject`"
decision). Search wiring uses a dedicated `Subject<string>` → `debounceTime(250)` → `filter(≥2 chars)`
→ `switchMap(searchLocations)`, cleaned up with `takeUntilDestroyed`/`DestroyRef`. No ADR filing
needed — decision is locked in the Tasks doc itself.
**Scope:** `apps/web/src/app/core/weather.store.ts` (new file) only — signals, computeds, handlers,
boot sequence, and RxJS search pipe. No component, no template, no style, no schema change, no new
dependency. Task 4-1's `WeatherApiService` is consumed read-only.

---

## Step 0 — Pre-flight

**Task 4-1 must be landed on `main` before any edit is made. If it is absent, STOP.**

### 0-A — Branch / precondition check

```powershell
git log --oneline -8
git status
```

Expected: working tree clean on `main`; the recent history includes the Task 4-1 commit
(`feat(web): add WeatherApiService, HttpClient provider, and dev proxy/env`). If it is absent,
STOP — this task consumes the `WeatherApiService` that Task 4-1 creates.

### 0-B — Baseline build / lint / test green

```powershell
npm run build
npm test
npm run lint
```

All three must exit 0 before any file is touched. A pre-existing failure here is a regression
from a prior task — resolve it before continuing.

### 0-C — Files to open before starting

Verify these files exist and read them in full before writing any code:

| File | Purpose |
|------|---------|
| `apps/web/src/app/core/weather-api.service.ts` | The service whose methods the store calls — method names and return types are the contract |
| `libs/shared-types/src/lib/weather.ts` | `WeatherDashboard`, `LocationSuggestion`, `UnitSystem`, `UserPreferences` — typed state shapes |
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` lines 43–258 | Canonical source for every signal default, handler name, guard, and boot sequence |

**STOP if `apps/web/src/app/core/weather-api.service.ts` does not exist** — Task 4-1 is not yet
landed.

---

## Step 1 — Create `apps/web/src/app/core/` directory (if absent)

**File:** directory `apps/web/src/app/core/`

Task 4-1 creates `weather-api.service.ts` inside `apps/web/src/app/core/`. If the directory
already exists (it will, because Task 4-1 landed), no action is needed. Confirm:

```powershell
Test-Path apps\web\src\app\core\weather-api.service.ts
```

Expected: `True`. If `False`, Task 4-1 is not landed — STOP.

**Verify:** `apps/web/src/app/core/weather-api.service.ts` exists and the directory is present.

---

## Step 2 — Create `weather.store.ts` — skeleton + signals

**File:** `apps/web/src/app/core/weather.store.ts` (new file)

Create the store shell: the `@Injectable({ providedIn: 'root' })` decorator, `DestroyRef`
injection, `WeatherApiService` injection, the ten writable signals with their exact initial
values from `App.vue` lines 43–52, and the `Subject<string>` that backs the debounced search.
No methods yet — they are added in later steps so each step has a standalone build gate.

Exact initial values (must match `App.vue` `ref(...)` defaults verbatim):

| Signal | Type | Initial value |
|--------|------|---------------|
| `dashboard` | `signal<WeatherDashboard \| null>` | `null` |
| `loading` | `signal<boolean>` | `true` |
| `error` | `signal<string>` | `''` |
| `search` | `signal<string>` | `'San Francisco, CA'` |
| `unitSystem` | `signal<UnitSystem>` | `'imperial'` |
| `suggestions` | `signal<LocationSuggestion[]>` | `[]` |
| `savedLocations` | `signal<LocationSuggestion[]>` | `[]` |
| `searchFocused` | `signal<boolean>` | `false` |
| `savingLocation` | `signal<boolean>` | `false` |
| `updatingLocationId` | `signal<number \| null>` | `null` |

```typescript
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import type {
  LocationSuggestion,
  UnitSystem,
  WeatherDashboard,
} from '@nimbus/shared-types';
import { WeatherApiService } from './weather-api.service';

@Injectable({ providedIn: 'root' })
export class WeatherStore {
  private readonly api = inject(WeatherApiService);
  private readonly destroyRef = inject(DestroyRef);

  // --- Writable signals ---
  readonly dashboard = signal<WeatherDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('San Francisco, CA');
  readonly unitSystem = signal<UnitSystem>('imperial');
  readonly suggestions = signal<LocationSuggestion[]>([]);
  readonly savedLocations = signal<LocationSuggestion[]>([]);
  readonly searchFocused = signal(false);
  readonly savingLocation = signal(false);
  readonly updatingLocationId = signal<number | null>(null);

  // Subject that feeds the debounced search pipe (wired in constructor — Step 6)
  private readonly searchInput$ = new Subject<string>();
}
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The new file must compile with no type errors.

---

## Step 3 — Add computed signals and date/label helpers

**File:** `apps/web/src/app/core/weather.store.ts` (modify — append inside the class body)

Port the four `computed` values and the three helper functions from `App.vue` lines 65–91 and
222–228 verbatim.

`isSameLocation` is a private helper used only by `activeSavedLocation`; the three formatters
(`formatTime`, `formatShortDate`, `locationLabel`) are public methods so components can call them
directly without duplicating formatting logic.

```typescript
  // --- Helpers ---
  locationLabel(location: LocationSuggestion): string {
    return [location.name, location.region].filter(Boolean).join(', ');
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  formatShortDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  }

  private isSameLocation(first: LocationSuggestion, second: LocationSuggestion): boolean {
    return (
      first.name.toLowerCase() === second.name.toLowerCase() &&
      first.region.toLowerCase() === second.region.toLowerCase()
    );
  }

  // --- Computeds ---
  readonly activeLocation = computed(() => this.dashboard()?.locations[0] ?? null);

  readonly activeSavedLocation = computed(() => {
    const active = this.activeLocation();
    if (!active) {
      return null;
    }
    return this.savedLocations().find((loc) => this.isSameLocation(loc, active)) ?? null;
  });

  readonly showSuggestions = computed(
    () => this.searchFocused() && this.suggestions().length > 0,
  );

  readonly formattedObservedAt = computed(() => {
    if (!this.dashboard()) {
      return '';
    }
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(this.dashboard()!.current.observedAt));
  });
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. Confirm `activeLocation`, `activeSavedLocation`, `showSuggestions`, and
`formattedObservedAt` all type-check without `any`.

---

## Step 4 — Add read handlers: `loadDashboard`, `loadPreferences`, `loadSavedLocations`

**File:** `apps/web/src/app/core/weather.store.ts` (modify — append inside the class body)

Port the three async load handlers from `App.vue` lines 106–135. They call `WeatherApiService`
methods that return `Observable<T>`; use `firstValueFrom` (from `rxjs`) to await them in the
async methods, matching the `await getWeatherDashboard(...)` pattern in the source. Add
`firstValueFrom` to the `rxjs` import at the top.

Guard behavior to preserve exactly:
- `loadDashboard`: sets `loading(true)` and `error('')` before the call; on success sets
  `dashboard` **and** updates `unitSystem` from `response.unitSystem`; on error sets `error`
  to `err.message` or the fallback string; sets `loading(false)` in `finally`.
- `loadPreferences`: falls back to `unitSystem.set('imperial')` on any error.
- `loadSavedLocations`: falls back to `savedLocations.set([])` on any error.

```typescript
  async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(
        this.api.getWeatherDashboard(this.search(), this.unitSystem()),
      );
      this.dashboard.set(result);
      this.unitSystem.set(result.unitSystem);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Unable to load weather.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadPreferences(): Promise<void> {
    try {
      const prefs = await firstValueFrom(this.api.getPreferences());
      this.unitSystem.set(prefs.unitSystem);
    } catch {
      this.unitSystem.set('imperial');
    }
  }

  async loadSavedLocations(): Promise<void> {
    try {
      const locs = await firstValueFrom(this.api.getSavedLocations());
      this.savedLocations.set(locs);
    } catch {
      this.savedLocations.set([]);
    }
  }
```

Update the `rxjs` import line at the top to include `firstValueFrom`:

```typescript
import { firstValueFrom, Subject } from 'rxjs';
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 5 — Add write handlers: `changeUnits`, `chooseLocation`, `saveActiveLocation`, `removeSavedLocation`, `makeDefaultLocation`, `moveSavedLocation`

**File:** `apps/web/src/app/core/weather.store.ts` (modify — append inside the class body)

Port the six remaining handlers from `App.vue` lines 137–220. Guard conditions and call order
must match the source **exactly**.

Critical guards to preserve:
- `changeUnits`: early-return when `unitSystem() === nextUnitSystem` (before setting anything).
- `saveActiveLocation`: early-return when `!activeLocation() || !!activeSavedLocation() || savingLocation()`.
- `removeSavedLocation`: early-return when `!location.id || !!updatingLocationId()`.
- `makeDefaultLocation`: early-return when `!location.id || location.isDefault || !!updatingLocationId()`.
- `moveSavedLocation`: early-return when `!location.id || !!updatingLocationId()`, then bounds-check `targetIndex`.

`moveSavedLocation` performs an optimistic swap in `savedLocations` before the API call, then
reloads from the server in `finally` (matching `App.vue` lines 212–219 exactly — the optimistic
write precedes `updatingLocationId.set(location.id)`).

```typescript
  async changeUnits(nextUnitSystem: UnitSystem): Promise<void> {
    if (this.unitSystem() === nextUnitSystem) {
      return;
    }
    this.unitSystem.set(nextUnitSystem);
    await firstValueFrom(this.api.updatePreferences(nextUnitSystem));
    await this.loadDashboard();
  }

  async chooseLocation(location: LocationSuggestion): Promise<void> {
    this.search.set(this.locationLabel(location));
    this.searchFocused.set(false);
    this.suggestions.set([]);
    await this.loadDashboard();
  }

  async saveActiveLocation(): Promise<void> {
    if (!this.activeLocation() || this.activeSavedLocation() || this.savingLocation()) {
      return;
    }
    this.savingLocation.set(true);
    try {
      await firstValueFrom(this.api.saveLocation(this.activeLocation()!));
      await this.loadSavedLocations();
    } finally {
      this.savingLocation.set(false);
    }
  }

  async removeSavedLocation(location: LocationSuggestion): Promise<void> {
    if (!location.id || this.updatingLocationId()) {
      return;
    }
    this.updatingLocationId.set(location.id);
    try {
      await firstValueFrom(this.api.deleteSavedLocation(location.id));
      await this.loadSavedLocations();
    } finally {
      this.updatingLocationId.set(null);
    }
  }

  async makeDefaultLocation(location: LocationSuggestion): Promise<void> {
    if (!location.id || location.isDefault || this.updatingLocationId()) {
      return;
    }
    this.updatingLocationId.set(location.id);
    try {
      await firstValueFrom(this.api.setDefaultLocation(location.id));
      await this.loadSavedLocations();
    } finally {
      this.updatingLocationId.set(null);
    }
  }

  async moveSavedLocation(
    location: LocationSuggestion,
    index: number,
    direction: -1 | 1,
  ): Promise<void> {
    if (!location.id || this.updatingLocationId()) {
      return;
    }
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.savedLocations().length) {
      return;
    }
    const nextLocations = [...this.savedLocations()];
    [nextLocations[index], nextLocations[targetIndex]] = [
      nextLocations[targetIndex],
      nextLocations[index],
    ];
    const locationIds = nextLocations
      .map((loc) => loc.id)
      .filter((id): id is number => typeof id === 'number');

    this.updatingLocationId.set(location.id);
    this.savedLocations.set(nextLocations);
    try {
      await firstValueFrom(this.api.reorderSavedLocations(locationIds));
      await this.loadSavedLocations();
    } finally {
      this.updatingLocationId.set(null);
    }
  }
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. Check that `this.activeLocation()!` (non-null assertion in `saveActiveLocation`)
does not produce a lint error — the guard immediately above ensures `activeLocation()` is non-null
at that point. If the linter flags it, replace with `const loc = this.activeLocation(); if (!loc) return; await firstValueFrom(this.api.saveLocation(loc));`.

---

## Step 6 — Add `onSearchInput` + debounced search pipe wired in constructor

**File:** `apps/web/src/app/core/weather.store.ts` (modify — add `constructor` block and `onSearchInput` method)

Wire the RxJS debounced search pipe in the constructor. The pipe runs for the lifetime of the
service (destroyed when `destroyRef` fires). `onSearchInput` is the public entry point: it
updates the `search` signal (so the input field stays reactive) **and** `next()`s the subject
(so the debounce pipe sees every keystroke).

For values shorter than 2 trimmed characters, the `filter` operator blocks the `switchMap` from
firing, so the `Subject` `next()` is still called but no HTTP request is sent; the `suggestions`
signal is cleared immediately (synchronously) inside `onSearchInput` — this matches the source
`App.vue` lines 233–236.

Add the following imports to the `rxjs` import line:

```typescript
import { debounceTime, filter, firstValueFrom, Subject, switchMap } from 'rxjs';
```

Add the `catchError` import from `rxjs/operators`:

```typescript
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
```

Or combine all `rxjs` barrel imports in one line:

```typescript
import { catchError, debounceTime, filter, firstValueFrom, of, Subject, switchMap } from 'rxjs';
```

Constructor and method:

```typescript
  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(250),
        filter((v) => v.trim().length >= 2),
        switchMap((v) =>
          this.api.searchLocations(v).pipe(
            catchError(() => of([] as LocationSuggestion[])),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.suggestions.set(results);
      });
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    if (value.trim().length < 2) {
      this.suggestions.set([]);
    }
    this.searchInput$.next(value);
  }
```

Note on `takeUntilDestroyed`: when called inside a constructor (not in an injection context
outside the class), it must receive the `DestroyRef` token explicitly —
`takeUntilDestroyed(this.destroyRef)` — because the implicit injection context is no longer
active after the constructor completes. The `destroyRef` field was injected in Step 2.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The pipe must compile without `any`: `catchError(() => of([] as LocationSuggestion[]))` is the correct typing pattern.

---

## Step 7 — Add `init()` boot-sequence method

**File:** `apps/web/src/app/core/weather.store.ts` (modify — append inside the class body)

Port the `onMounted` block from `App.vue` lines 248–257 into a public `init()` method. The
strict sequential order is: `loadPreferences` → `loadSavedLocations` → pick default/first and
set `search` → `loadDashboard`. Use sequential `await` (no `Promise.all`) to preserve this
order exactly.

```typescript
  async init(): Promise<void> {
    await this.loadPreferences();
    await this.loadSavedLocations();

    const defaultLocation =
      this.savedLocations().find((loc) => loc.isDefault) ?? this.savedLocations()[0];
    if (defaultLocation) {
      this.search.set(this.locationLabel(defaultLocation));
    }

    await this.loadDashboard();
  }
```

`init()` is called from the shell component's constructor or `ngOnInit` in Task 4-3 — it is not
self-invoked here. Keeping it as an explicit method that the shell calls (rather than running in
the store's constructor) preserves the App.vue pattern and makes sequencing visible.

**Verify:**

```powershell
npm run build
npm run lint
```

Both must exit 0. At this point the file is complete. Lint especially for:
- No unused imports (e.g. a stray `takeUntilDestroyed` import path if it was imported from the
  wrong location — the correct import is `@angular/core/rxjs-interop`).
- No implicit `any` on signal reads (e.g. `this.dashboard()!` — verify the non-null assertion is
  only used after a guard).
- No `@typescript-eslint/no-floating-promises` violations on `init()` calls — because `init()` is
  `async`, callers that do not `await` it may trigger this rule. The store itself does not call
  `init()`, so this is the shell component's concern (Task 4-3).

---

## Step 8 — Full build / lint / test gate

```powershell
npm run build
```

Expected: exits 0 across the workspace. No type errors in `weather.store.ts` or any file that
imports it.

```powershell
npm run lint
```

Expected: exits 0. Verify:
- All `rxjs` operators are imported from `rxjs` (not `rxjs/operators` unless `catchError` requires
  it — in rxjs 7.x all operators are re-exported from the `rxjs` barrel; use the barrel).
- `takeUntilDestroyed` is imported from `@angular/core/rxjs-interop`, not from `@angular/core`.
- No `eslint-disable` comments added.

```powershell
npm test
```

Expected: exits 0. No new spec files are added in this task (dedicated store tests are Phase 6).
The existing `apps/web/src/app/app.spec.ts` must still pass — the store is `providedIn: 'root'`
and not directly instantiated in that spec, so no change is needed there.

**Verify:** all three commands exit 0.

---

## Step 9 — Diff sanity check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new file (untracked → staged):**

- `apps/web/src/app/core/weather.store.ts`

**Must NOT appear in the diff:**

- `apps/web/src/app/core/weather-api.service.ts` (Task 4-1; consume only)
- `apps/web/src/app/app.config.ts` (Task 4-1)
- `apps/web/proxy.conf.json` or `apps/web/project.json` (Task 4-1)
- `apps/web/src/environments/environment.ts` (Task 4-1)
- Any component, template, or style file (Tasks 4-3 … 4-6)
- `libs/shared-types/**` (Phase 1, read-only)
- `apps/api/**` (Phase 3, read-only)
- `package.json` (no new dependency)

If any unexpected file appears, investigate and revert before staging.

### Stage and commit

```powershell
git add apps/web/src/app/core/weather.store.ts
git status
```

Expected: exactly one new file staged.

```powershell
git commit -m "feat(web): add signals-based WeatherStore with debounced RxJS search

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
test green."
```

No `Co-Authored-By` trailer.

**Final verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit message above appears at HEAD; the stat shows exactly one file changed
(`apps/web/src/app/core/weather.store.ts`, new file).

---

## Summary of gates

| Step | Gate |
|------|------|
| 0-A | `git log` shows Task 4-1 commit; `git status` clean |
| 0-B | `npm run build` + `npm test` + `npm run lint` green at baseline |
| 0-C | `weather-api.service.ts`, `weather.ts` (shared-types), and `App.vue` lines 43–258 are readable |
| 1 | `apps/web/src/app/core/weather-api.service.ts` exists (`Test-Path` = True) |
| 2 | `weather.store.ts` skeleton created with ten signals + `Subject`; `npm run build` exits 0 |
| 3 | Four computeds + three helpers added; `npm run build` exits 0 |
| 4 | `loadDashboard` / `loadPreferences` / `loadSavedLocations` added; `npm run build` exits 0 |
| 5 | Six write handlers added (guards preserved); `npm run build` exits 0 |
| 6 | `onSearchInput` + debounced pipe wired in constructor; `npm run build` exits 0 |
| 7 | `init()` boot sequence added; `npm run build` + `npm run lint` exit 0 |
| 8 | `npm run build` + `npm run lint` + `npm test` green post-implementation |
| 9 | `git diff --stat` shows exactly one file (`weather.store.ts`); commit message matches Tasks doc |
