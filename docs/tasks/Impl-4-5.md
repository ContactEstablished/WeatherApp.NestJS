# Impl 4-5 — Dashboard component tree

**Acceptance contract:** `docs/tasks/Tasks-4-5.md`
**Decision lock:** No ADR. Locked by `docs/RoadMap.md` §0.1 (feature inventory), §0.2 (7/5/3/4
panel counts), §0.5 (DOM/class-fidelity constraint), and Phase 4 "DOM/class fidelity is
load-bearing" and "frontend only" constraints.
**Scope:** New standalone Angular components in `apps/web/src/app/dashboard/` only — six component
files (plus HTML templates), wired into the `.workspace` section that Task 4-3 left as a slot. No
schema change, no new dependency (lucide-angular is Task 4-6's approval gate), no store or API
service edits.

---

## Step 0 — Pre-flight

### 0-A — Sequence gate: Task 4-6 MUST land before this task is coded

Task 4-5 consumes `WeatherIconComponent` (`app-weather-icon`), `MetricCardComponent`
(`app-metric-card`), and the `lucide-angular` icons (`Zap`, `ShieldAlert`, `Star`, `Plus`,
`Thermometer`, `Sun`, `Moon`, `Droplet`). All of those are delivered by Task 4-6. They cannot be
imported until 4-6 has committed.

**STOP before writing any code if `apps/web/src/app/shared/` (or the equivalent 4-6 path) does
not contain `weather-icon.component.ts` and `metric-card.component.ts`, and if `lucide-angular`
does not appear in `package.json`.** Check:

```powershell
Get-Content C:\Projects\ContactEstablished\WeatherApp.NestJS\package.json | Select-String lucide-angular
```

If not present: coordinate the 4-6 install first (it is the approval-gated dependency), then
return here.

### 0-B — Precondition tasks 4-1 through 4-4 landed

```powershell
git log --oneline -12
git status
```

Expected: working tree clean on `main`; the log includes all four prerequisite commits:
- Task 4-1: `feat(web): add WeatherApiService …`
- Task 4-2: `feat(web): add signals-based WeatherStore …`
- Task 4-3: `feat(web): add shell + sidebar component tree …`
- Task 4-4: `feat(web): add topbar component tree …`

If any are absent, STOP — this task mounts inside the `.workspace` slot and reads the store those
tasks create.

### 0-C — Baseline build / test / lint green

```powershell
npm run build
npm test
npm run lint
```

All three must exit 0 before any file is touched.

### 0-D — Files to open before starting

Read each of the following in full before writing code. The steps below cite concrete symbols from
these files; reading them first prevents referencing symbols that do not exist.

| File | Purpose |
|------|---------|
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` lines 417–543 | The loading/error panels and `<section class="dashboard-grid">` to mirror verbatim |
| `apps/web/src/app/core/weather.store.ts` | Exact signal/computed/handler names consumed by this task |
| `apps/web/src/app/shared/weather-icon.component.ts` | `[condition]`, `[size]` input names (Task 4-6) |
| `apps/web/src/app/shared/metric-card.component.ts` | `[metric]` input name (Task 4-6) |
| `apps/web/src/app/app.html` | The `.workspace` slot left by Task 4-3 — where `<app-dashboard>` mounts |
| `apps/web/src/app/app.ts` | The shell component's `imports` array to update |

**STOP if the weather-icon and metric-card component files do not exist** — 4-6 has not landed.

---

## Step 1 — Create the dashboard feature folder

Create the directory `apps/web/src/app/dashboard/`. This step has no code; it is the structural
anchor all subsequent files land in.

**Verify:** the folder exists. No build check needed yet.

---

## Step 2 — `HeroWeatherComponent`

**File:** `apps/web/src/app/dashboard/hero-weather/hero-weather.component.ts` (new)
**File:** `apps/web/src/app/dashboard/hero-weather/hero-weather.component.html` (new)

Reproduce the `<article class="hero-weather">` block from `App.vue` lines 430–480 verbatim.

**hero-weather.component.ts**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherStore } from '../../core/weather.store';
import { WeatherIconComponent } from '../../shared/weather-icon.component';
import { LucideAngularModule } from 'lucide-angular';
import { Zap, Star, Plus, Thermometer, Sun, Moon } from 'lucide-angular';

@Component({
  selector: 'app-hero-weather',
  standalone: true,
  imports: [CommonModule, WeatherIconComponent, LucideAngularModule],
  templateUrl: './hero-weather.component.html',
})
export class HeroWeatherComponent {
  protected store = inject(WeatherStore);
  readonly Zap = Zap;
  readonly Star = Star;
  readonly Plus = Plus;
  readonly Thermometer = Thermometer;
  readonly Sun = Sun;
  readonly Moon = Moon;
}
```

**hero-weather.component.html**

Mirror the source article exactly. Key binding points:

- `[style.--hero-image]` → `"'url(' + store.dashboard()!.current.backgroundImageUrl + ')'"` — this
  sets the CSS custom property `--hero-image` on the element so the stylesheet's
  `background-image: var(--hero-image)` rule resolves.
- `.save-location-button` `[class.is-saved]` → `store.activeSavedLocation() !== null`
- `[disabled]` → `store.savingLocation() || !!store.activeSavedLocation()`
- `[attr.aria-label]` → `store.activeSavedLocation() ? 'Location already saved' : 'Save location'`
- `(click)` → `store.saveActiveLocation()`
- Icon in button: `<lucide-icon [img]="Star" *ngIf="store.activeSavedLocation()">` /
  `<lucide-icon [img]="Plus" *ngIf="!store.activeSavedLocation()">`
- `formattedObservedAt` paragraph: `{{ store.formattedObservedAt() }}`
- `.hero-weather__temp`: `{{ store.dashboard()!.current.temperature }}` + `°{{ store.dashboard()!.temperatureUnit }}`
- `.hero-weather__condition`: `<app-weather-icon [condition]="store.dashboard()!.current.condition" size="sm">` + `{{ store.dashboard()!.current.condition }}`
- `.hero-weather__summary`: `{{ store.dashboard()!.current.summary }}<br>{{ store.dashboard()!.current.description }}`
- `.weather-facts` three spans: `feelsLike°`, `formatTime(sunset)`, `formatTime(sunrise)` — Thermometer / Sun / Moon icons

Full template (reproduce DOM structure from App.vue lines 430–480):

```html
<article class="hero-weather"
  [style.--hero-image]="'url(' + store.dashboard()!.current.backgroundImageUrl + ')'">
  <div class="hero-weather__content">
    <div class="hero-weather__location">
      <span>
        <lucide-icon [img]="Zap" [strokeWidth]="1.8"></lucide-icon>
        {{ store.dashboard()!.current.location }}
      </span>
      <button
        class="save-location-button"
        type="button"
        [class.is-saved]="store.activeSavedLocation() !== null"
        [disabled]="store.savingLocation() || !!store.activeSavedLocation()"
        [attr.aria-label]="store.activeSavedLocation() ? 'Location already saved' : 'Save location'"
        (click)="store.saveActiveLocation()"
      >
        <lucide-icon *ngIf="store.activeSavedLocation()" [img]="Star" [strokeWidth]="1.8"></lucide-icon>
        <lucide-icon *ngIf="!store.activeSavedLocation()" [img]="Plus" [strokeWidth]="1.8"></lucide-icon>
      </button>
    </div>
    <p>{{ store.formattedObservedAt() }}</p>
    <div class="hero-weather__temp">
      <strong>{{ store.dashboard()!.current.temperature }}</strong>
      <span>&deg;{{ store.dashboard()!.temperatureUnit }}</span>
    </div>
    <div class="hero-weather__condition">
      <app-weather-icon [condition]="store.dashboard()!.current.condition" size="sm"></app-weather-icon>
      <strong>{{ store.dashboard()!.current.condition }}</strong>
    </div>
    <p class="hero-weather__summary">
      {{ store.dashboard()!.current.summary }}<br />
      {{ store.dashboard()!.current.description }}
    </p>
    <div class="weather-facts">
      <span>
        <lucide-icon [img]="Thermometer" [strokeWidth]="1.8"></lucide-icon>
        <small>Feels like</small>
        <strong>{{ store.dashboard()!.current.feelsLike }}&deg;</strong>
      </span>
      <span>
        <lucide-icon [img]="Sun" [strokeWidth]="1.8"></lucide-icon>
        <small>Sunset</small>
        <strong>{{ store.formatTime(store.dashboard()!.current.sunset) }}</strong>
      </span>
      <span>
        <lucide-icon [img]="Moon" [strokeWidth]="1.8"></lucide-icon>
        <small>Sunrise</small>
        <strong>{{ store.formatTime(store.dashboard()!.current.sunrise) }}</strong>
      </span>
    </div>
  </div>
</article>
```

**Implementation note on `[style.--hero-image]`:** Angular's `[style.--custom-prop]` binding works
for CSS custom properties in Angular 16+. If the workspace uses an older Angular version that does
not support CSS custom property binding this way, fall back to
`[ngStyle]="{ '--hero-image': 'url(' + store.dashboard()!.current.backgroundImageUrl + ')' }"` —
confirm from the `@angular/core` version in `package.json` before choosing.

**Implementation note on `*ngIf`:** if the template is using the Angular control-flow syntax
(`@if`) introduced in Angular 17, replace `*ngIf="..."` with `@if (...) { ... }` blocks. Mirror
whatever control-flow syntax the Task 4-3/4-4 templates already use.

**Implementation note on `formatTime`:** verify whether `WeatherStore.formatTime` is a method or a
computed. The Task 4-2 spec says "methods or computeds — same output". Call it as `store.formatTime(value)`
if it is a method, or as `store.formatTime()(value)` if it is a signal-returning computed. Read the
actual store file before coding this line.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. Template binding against `store.dashboard()!` (non-null assertion) is safe here
because the component is only rendered when `store.dashboard()` is truthy (guarded by the parent
`DashboardComponent` — Step 8). The build must not report type errors on `--hero-image` style
binding or the lucide icon refs.

---

## Step 3 — `PreviewRowComponent`

**File:** `apps/web/src/app/dashboard/preview-row/preview-row.component.ts` (new)
**File:** `apps/web/src/app/dashboard/preview-row/preview-row.component.html` (new)

Reproduce the `<section class="preview-row">` block from App.vue lines 482–494.

**preview-row.component.ts**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherStore } from '../../core/weather.store';
import { WeatherIconComponent } from '../../shared/weather-icon.component';

@Component({
  selector: 'app-preview-row',
  standalone: true,
  imports: [CommonModule, WeatherIconComponent],
  templateUrl: './preview-row.component.html',
})
export class PreviewRowComponent {
  protected store = inject(WeatherStore);
}
```

**preview-row.component.html**

```html
<section class="preview-row" aria-label="Condition previews">
  <article
    *ngFor="let preview of store.dashboard()!.previews"
    class="preview-card"
  >
    <app-weather-icon [condition]="preview.condition" size="xl"></app-weather-icon>
    <strong>{{ preview.condition }}</strong>
    <span>{{ preview.high }}&deg; / {{ preview.low }}&deg;</span>
    <p>{{ preview.description }}</p>
  </article>
  <div class="carousel-dots" aria-hidden="true">
    <span class="is-active"></span>
    <span></span>
    <span></span>
  </div>
</section>
```

The three-dot `.carousel-dots` are static (first `is-active`) exactly as in the source.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The `previews` array must render exactly 3 items against a real dashboard
(acceptance criterion 2 — verified visually later; the build gate confirms the template compiles).

---

## Step 4 — `HourlyPanelComponent`

**File:** `apps/web/src/app/dashboard/hourly-panel/hourly-panel.component.ts` (new)
**File:** `apps/web/src/app/dashboard/hourly-panel/hourly-panel.component.html` (new)

Reproduce the `<section class="panel hourly-panel">` block from App.vue lines 496–509.

**hourly-panel.component.ts**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherStore } from '../../core/weather.store';
import { WeatherIconComponent } from '../../shared/weather-icon.component';

@Component({
  selector: 'app-hourly-panel',
  standalone: true,
  imports: [CommonModule, WeatherIconComponent],
  templateUrl: './hourly-panel.component.html',
})
export class HourlyPanelComponent {
  protected store = inject(WeatherStore);
}
```

**hourly-panel.component.html**

```html
<section class="panel hourly-panel">
  <header>
    <h2>Hourly Forecast</h2>
    <button type="button">View All</button>
  </header>
  <div class="hourly-strip">
    <article
      *ngFor="let hour of store.dashboard()!.hourly"
      class="hour-card"
      [class.is-now]="hour.label === 'Now'"
    >
      <span>{{ hour.label }}</span>
      <app-weather-icon [condition]="hour.condition" size="md"></app-weather-icon>
      <strong>{{ hour.temperature }}&deg;</strong>
      <small>{{ hour.windSpeed }} {{ store.dashboard()!.windUnit }}</small>
    </article>
  </div>
</section>
```

The `is-now` class is applied when `hour.label === 'Now'` — exactly as the source `v-for` + `:class`
binding. The first hourly entry from the Phase 3 API will always be labeled `'Now'`.

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 5 — `ForecastPanelComponent`

**File:** `apps/web/src/app/dashboard/forecast-panel/forecast-panel.component.ts` (new)
**File:** `apps/web/src/app/dashboard/forecast-panel/forecast-panel.component.html` (new)

Reproduce the `<section class="panel forecast-panel">` block from App.vue lines 511–537. The range
bar inline width formula is load-bearing: `Math.max(22, Math.min(86, day.high * 1.1))` px.

**forecast-panel.component.ts**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherStore } from '../../core/weather.store';
import { WeatherIconComponent } from '../../shared/weather-icon.component';
import { LucideAngularModule, Droplet } from 'lucide-angular';

@Component({
  selector: 'app-forecast-panel',
  standalone: true,
  imports: [CommonModule, WeatherIconComponent, LucideAngularModule],
  templateUrl: './forecast-panel.component.html',
})
export class ForecastPanelComponent {
  protected store = inject(WeatherStore);
  readonly Droplet = Droplet;

  rangeBarWidth(high: number): string {
    return `${Math.max(22, Math.min(86, high * 1.1))}px`;
  }
}
```

The `rangeBarWidth` helper is a plain component method so the template expression stays readable
and the formula is easy to test independently.

**forecast-panel.component.html**

```html
<section class="panel forecast-panel">
  <header>
    <h2>5-Day Forecast</h2>
    <button type="button">View All</button>
  </header>
  <div class="daily-list">
    <article
      *ngFor="let day of store.dashboard()!.daily"
      class="daily-row"
    >
      <span class="daily-row__date">
        <strong>{{ day.day }}</strong>
        <small>{{ store.formatShortDate(day.date) }}</small>
      </span>
      <app-weather-icon [condition]="day.condition" size="sm"></app-weather-icon>
      <span class="daily-row__condition">{{ day.condition }}</span>
      <span class="daily-row__rain">
        <lucide-icon [img]="Droplet" [strokeWidth]="1.8"></lucide-icon>
        {{ day.precipitationChance }}%
      </span>
      <span class="daily-row__range">
        <strong>{{ day.high }}&deg;</strong>
        <i>
          <b [style.width]="rangeBarWidth(day.high)"></b>
        </i>
        <em>{{ day.low }}&deg;</em>
      </span>
    </article>
  </div>
</section>
```

The inline width on `<b>` must use `[style.width]="rangeBarWidth(day.high)"` — not `[ngStyle]` —
so it emits exactly `width: <Npx>` in the style attribute, matching the source.

**Implementation note on `formatShortDate`:** read the actual `WeatherStore` for whether
`formatShortDate` is a method or computed. The Task 4-2 spec permits either form.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. Confirm the `rangeBarWidth` method is reachable from the template (it is a
`protected`-accessible class member — the template access works even for `protected` in Angular
templates when the field is on `this`).

---

## Step 6 — `MetricStackComponent`

**File:** `apps/web/src/app/dashboard/metric-stack/metric-stack.component.ts` (new)
**File:** `apps/web/src/app/dashboard/metric-stack/metric-stack.component.html` (new)

Reproduce the `<section class="metric-stack">` block from App.vue lines 539–541.

**metric-stack.component.ts**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherStore } from '../../core/weather.store';
import { MetricCardComponent } from '../../shared/metric-card.component';

@Component({
  selector: 'app-metric-stack',
  standalone: true,
  imports: [CommonModule, MetricCardComponent],
  templateUrl: './metric-stack.component.html',
})
export class MetricStackComponent {
  protected store = inject(WeatherStore);
}
```

**metric-stack.component.html**

```html
<section class="metric-stack" aria-label="Weather metrics">
  <app-metric-card
    *ngFor="let metric of store.dashboard()!.metrics"
    [metric]="metric"
  ></app-metric-card>
</section>
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The `[metric]` binding must match `MetricCardComponent`'s `@Input() metric`
name exactly — confirm by reading `metric-card.component.ts` from Task 4-6 before coding.

---

## Step 7 — `DashboardComponent`

**File:** `apps/web/src/app/dashboard/dashboard.component.ts` (new)
**File:** `apps/web/src/app/dashboard/dashboard.component.html` (new)

This is the orchestrating component. It owns the loading/error panels (App.vue lines 417–426) and
renders the `<section class="dashboard-grid">` (App.vue lines 428–542) only when
`store.dashboard()` is truthy.

**dashboard.component.ts**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherStore } from '../core/weather.store';
import { HeroWeatherComponent } from './hero-weather/hero-weather.component';
import { PreviewRowComponent } from './preview-row/preview-row.component';
import { HourlyPanelComponent } from './hourly-panel/hourly-panel.component';
import { ForecastPanelComponent } from './forecast-panel/forecast-panel.component';
import { MetricStackComponent } from './metric-stack/metric-stack.component';
import { LucideAngularModule, Zap, ShieldAlert } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HeroWeatherComponent,
    PreviewRowComponent,
    HourlyPanelComponent,
    ForecastPanelComponent,
    MetricStackComponent,
    LucideAngularModule,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  protected store = inject(WeatherStore);
  readonly Zap = Zap;
  readonly ShieldAlert = ShieldAlert;
}
```

**dashboard.component.html**

Reproduces App.vue lines 417–543: loading panel → error panel → dashboard-grid, in that priority
order.

```html
<section *ngIf="store.loading()" class="loading-panel">
  <lucide-icon [img]="Zap" [strokeWidth]="1.8"></lucide-icon>
  <span>Loading live dashboard...</span>
</section>

<section *ngIf="!store.loading() && store.error()" class="loading-panel loading-panel--error">
  <lucide-icon [img]="ShieldAlert" [strokeWidth]="1.8"></lucide-icon>
  <span>{{ store.error() }}</span>
  <button type="button" (click)="store.loadDashboard()">Retry</button>
</section>

<ng-container *ngIf="!store.loading() && !store.error() && store.dashboard()">
  <section class="dashboard-grid">
    <app-hero-weather></app-hero-weather>
    <app-preview-row></app-preview-row>
    <app-hourly-panel></app-hourly-panel>
    <app-forecast-panel></app-forecast-panel>
    <app-metric-stack></app-metric-stack>
  </section>
</ng-container>
```

The `<ng-container>` wrapper is structural only — it emits no DOM element, so the
`<section class="dashboard-grid">` remains the direct child of whatever the parent renders,
preserving CSS selector fidelity. The five child panels appear in the same source order as
`App.vue` lines 430–541.

**If the workspace is on Angular 17+ with the new control-flow syntax**, replace the `*ngIf`
directives with `@if` blocks (matching whatever control-flow style Tasks 4-3/4-4 already use):

```html
@if (store.loading()) {
  <section class="loading-panel">
    <lucide-icon [img]="Zap" [strokeWidth]="1.8"></lucide-icon>
    <span>Loading live dashboard...</span>
  </section>
}
@if (!store.loading() && store.error()) {
  <section class="loading-panel loading-panel--error">
    <lucide-icon [img]="ShieldAlert" [strokeWidth]="1.8"></lucide-icon>
    <span>{{ store.error() }}</span>
    <button type="button" (click)="store.loadDashboard()">Retry</button>
  </section>
}
@if (!store.loading() && !store.error() && store.dashboard()) {
  <section class="dashboard-grid">
    <app-hero-weather></app-hero-weather>
    <app-preview-row></app-preview-row>
    <app-hourly-panel></app-hourly-panel>
    <app-forecast-panel></app-forecast-panel>
    <app-metric-stack></app-metric-stack>
  </section>
}
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. All five child component selectors must resolve — if any is not found, confirm
the corresponding component's `selector` matches exactly (`app-hero-weather`, `app-preview-row`,
`app-hourly-panel`, `app-forecast-panel`, `app-metric-stack`).

---

## Step 8 — Wire `DashboardComponent` into the shell

**File:** `apps/web/src/app/app.ts` (modify)
**File:** `apps/web/src/app/app.html` (modify)

Task 4-3 left a `<section class="workspace">` containing `<app-topbar>` as its first child and a
placeholder for the dashboard below it. Task 4-4 added `<app-topbar>`. Now add `<app-dashboard>`:

In `app.ts`, add `DashboardComponent` to the `imports` array alongside the existing topbar import:

```typescript
import { DashboardComponent } from './dashboard/dashboard.component';

// In @Component imports array:
imports: [..., DashboardComponent],
```

In `app.html`, add `<app-dashboard>` immediately after `<app-topbar>` inside the `.workspace`
section:

```html
<section class="workspace">
  <app-topbar></app-topbar>
  <app-dashboard></app-dashboard>
</section>
```

Do not modify any other part of `app.html` or `app.ts` (the `.app-shell`, `<app-sidebar>`, and
all other existing bindings remain unchanged).

**Verify:**

```powershell
npm run build
npm run lint
```

Both must exit 0. The workspace build will now include all six new component files. Lint must not
flag unused imports in `app.ts`.

---

## Step 9 — Acceptance count check (manual / serve)

This is an optional but strongly recommended visual gate before the final build sweep. Start the
API and the Angular dev server:

```powershell
# Terminal 1 — API
npx nx serve api

# Terminal 2 — Angular dev server
npx nx serve web
```

Open `http://localhost:4200`. Against a loaded `WeatherDashboard`:

1. Count `.hour-card` elements in the hourly strip → expect **7**; the first should carry the
   `is-now` class (label `Now`).
2. Count `.daily-row` elements → expect **5**.
3. Count `.preview-card` elements → expect **3**.
4. Count `app-metric-card` elements → expect **4**.
5. Confirm the hero `<article class="hero-weather">` has `--hero-image` set in its `style`
   attribute to a `url(...)` value.
6. Confirm the save button has `class="save-location-button"` (no `is-saved` when unsaved) and
   clicking it calls the store (watch for `savingLocation` state change in DevTools or the button
   becoming `is-saved` on reload if already saved).
7. Inspect one `.daily-row__range > i > b` — the `style` attribute should contain
   `width: <Npx>` where N is in the range 22–86 (the clamped formula).

If the API or dev server is not yet runnable (Phase 3 or 4-1/4-2 not wired for serve), skip this
step and proceed — it is advisory only; the binding-count contract is enforced by the data the
Phase 3 API returns (7 hourly / 5 daily / 3 previews / 4 metrics from the mock).

---

## Step 10 — Full build / lint / test gate

```powershell
npm run build
```

Expected: exits 0 across the workspace. No type errors in any of the six new component files or
in the modified `app.ts`.

```powershell
npm run lint
```

Expected: exits 0. Check especially:
- No unused imports in any new `.ts` file.
- The `LucideAngularModule` import is present in every component that uses a `<lucide-icon>`.
- No `@typescript-eslint/no-explicit-any` violations (all store accesses are signal-typed).
- `rangeBarWidth` in `ForecastPanelComponent` has an explicit `number` parameter type.

```powershell
npm test
```

Expected: exits 0. No new spec files are added in this task (dedicated component tests are Phase
6 — acceptance criterion 4). The existing `app.spec.ts` must still pass; if it references the old
`NxWelcome` placeholder, it may need updating to match the current shell (check whether Task 4-3
already addressed this — if `app.spec.ts` is already adapted, leave it untouched).

**Verify:** all three commands exit 0.

---

## Step 11 — Diff sanity check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new files:**

- `apps/web/src/app/dashboard/hero-weather/hero-weather.component.ts`
- `apps/web/src/app/dashboard/hero-weather/hero-weather.component.html`
- `apps/web/src/app/dashboard/preview-row/preview-row.component.ts`
- `apps/web/src/app/dashboard/preview-row/preview-row.component.html`
- `apps/web/src/app/dashboard/hourly-panel/hourly-panel.component.ts`
- `apps/web/src/app/dashboard/hourly-panel/hourly-panel.component.html`
- `apps/web/src/app/dashboard/forecast-panel/forecast-panel.component.ts`
- `apps/web/src/app/dashboard/forecast-panel/forecast-panel.component.html`
- `apps/web/src/app/dashboard/metric-stack/metric-stack.component.ts`
- `apps/web/src/app/dashboard/metric-stack/metric-stack.component.html`
- `apps/web/src/app/dashboard/dashboard.component.ts`
- `apps/web/src/app/dashboard/dashboard.component.html`

**Expected modified files:**

- `apps/web/src/app/app.ts` (add `DashboardComponent` to `imports`)
- `apps/web/src/app/app.html` (add `<app-dashboard>` to `.workspace`)

**Must NOT appear in the diff:**

- `apps/web/src/app/core/weather.store.ts` (store is consumed, not changed)
- `apps/web/src/app/core/weather-api.service.ts` (service is consumed, not changed)
- `apps/web/src/app/app.config.ts` (no new providers)
- `package.json` (no new dependency — lucide-angular was installed by 4-6)
- `libs/shared-types/**` (no contract changes)
- `apps/api/**` (backend untouched)
- `prisma/**` (no schema change)
- Any file outside `apps/web/src/app/dashboard/`, `apps/web/src/app/app.ts`,
  and `apps/web/src/app/app.html`

If any unexpected file appears, investigate and revert before staging.

### Stage and commit

```powershell
git add apps/web/src/app/dashboard/
git add apps/web/src/app/app.ts
git add apps/web/src/app/app.html
```

Confirm staged set:

```powershell
git status
```

Expected: exactly the fourteen files listed above (twelve new, two modified).

```powershell
git commit -m "feat(web): add dashboard component tree (hero / previews / hourly / daily / metrics)

Port App.vue's <section class=\"dashboard-grid\"> and the loading/error
panels into standalone components, reproducing the source DOM and class
names verbatim:

- HeroWeatherComponent (.hero-weather + --hero-image, save star/plus ->
  store.saveActiveLocation, weather-facts)
- PreviewRowComponent (.preview-row, 3 cards + carousel dots)
- HourlyPanelComponent (.hourly-panel, 7 hours, first is-now/Now)
- ForecastPanelComponent (.forecast-panel, 5 daily rows + clamped range bar)
- MetricStackComponent (.metric-stack, 4 MetricCards)
- DashboardComponent dispatches loading / error / loaded states.

A loaded WeatherDashboard renders 7/5/3/4 panels. build/lint/test green."
```

No `Co-Authored-By` trailer.

**Final verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit message above appears at HEAD; the stat shows exactly fourteen files changed
(twelve new, two modified) — twelve within `apps/web/src/app/dashboard/`, two in
`apps/web/src/app/`.

---

## Summary of gates

| Step | Gate |
|------|------|
| 0-A | `lucide-angular` in `package.json`; `weather-icon.component.ts` and `metric-card.component.ts` exist (Task 4-6 landed) |
| 0-B | `git log` shows Tasks 4-1 through 4-4 commits; `git status` clean |
| 0-C | `npm run build` + `npm test` + `npm run lint` green at baseline |
| 0-D | All six required reading files exist and are read in full |
| 1 | `apps/web/src/app/dashboard/` folder created |
| 2 | `HeroWeatherComponent` created; `npm run build` exits 0 |
| 3 | `PreviewRowComponent` created; `npm run build` exits 0 |
| 4 | `HourlyPanelComponent` created; `npm run build` exits 0 |
| 5 | `ForecastPanelComponent` created with `rangeBarWidth` helper; `npm run build` exits 0 |
| 6 | `MetricStackComponent` created; `npm run build` exits 0 |
| 7 | `DashboardComponent` created composing all five panels + loading/error panels; `npm run build` exits 0 |
| 8 | `app.ts` / `app.html` updated to mount `<app-dashboard>` in `.workspace`; `npm run build` + `npm run lint` exit 0 |
| 9 | (Advisory) Serve check: 7 hourly / 5 daily / 3 previews / 4 metrics; `--hero-image` bound; range bar width clamped 22–86 px |
| 10 | `npm run build` + `npm run lint` + `npm test` green post-implementation |
| 11 | `git diff --stat` shows exactly 14 files in `dashboard/` + `app.ts`/`app.html`; commit message matches Tasks doc |
