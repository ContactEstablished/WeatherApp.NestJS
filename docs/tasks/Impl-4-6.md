# Impl 4-6 — Reusable components + global styles/assets

**Acceptance contract:** `docs/tasks/Tasks-4-6.md`
**Decision lock:** No ADRs in `docs/decisions/`. Locked by `docs/RoadMap.md` Phase 4 (scope
bullets: "Reusable:" component tree, "Styling + assets", "Add the `lucide-angular` icon
dependency — new dependency, approval required before install") and the DOM/class-fidelity
constraint ("do not rename source class names or restructure markup"). The condition→icon map,
Sparkline math, and MetricCard key→icon/variant wiring are verbatim from the Vue source files.
**Scope:** `apps/web` only — three new standalone components under `apps/web/src/app/shared/`,
global `apps/web/src/styles.scss` ported from the Vue `styles.css`, `apps/web/public/favicon.svg`
added, `apps/web/src/index.html` updated. No schema change, no shared-types edit, no `apps/api`
change, no new dependency beyond `lucide-angular`.

---

## Step 0 — Pre-flight

Before touching any file, confirm all gates are green.

**Branch and working tree**

```powershell
git status
```

Expected: `nothing to commit, working tree clean` on `main`. If there are uncommitted changes,
stash or commit them before continuing.

**Baseline build / lint / test green**

```powershell
npm run build
npm run lint
npm test
```

All three must exit 0. If any fails, that is a pre-existing regression — resolve it before
starting this task.

**Files to open before starting**

| File | What to confirm |
|---|---|
| `apps/web/src/styles.scss` | Contains only the placeholder comment `/* You can add global styles to this file, and also import other style files */` — no real CSS yet. |
| `apps/web/src/index.html` | `<title>web</title>` and `href="favicon.ico"` — both must be updated in Step 6. |
| `apps/web/project.json` | `build.options.styles` contains `"apps/web/src/styles.scss"` (already wired); `build.options.assets` copies `apps/web/public/**/*` (confirms `favicon.svg` destination). |
| `package.json` (root) | `lucide-angular` is **not** present in `dependencies` — confirm before Step 1. |
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\components\WeatherIcon.vue` | Source condition→icon map to mirror verbatim. |
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\components\Sparkline.vue` | Source 132×46 SVG math to mirror verbatim. |
| `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\components\MetricCard.vue` | Source key→icon map and sparkline variant logic to mirror verbatim. |

**STOP if any of the following are true:**

- `lucide-angular` already appears in `package.json` `dependencies`.
- `apps/web/src/app/shared/` already contains `weather-icon/`, `sparkline/`, or `metric-card/`.
- `npm run build`, `npm run lint`, or `npm test` fails.

---

## Step 1 — APPROVAL GATE: present `lucide-angular` and STOP for human sign-off

**This step produces no file changes.** It exists solely to satisfy the roadmap's mandatory
"new dependency requires approval before install" constraint.

Present the following to the human and **STOP**. Do not run `npm install` until explicit approval
is received.

---

**Proposed new dependency**

| Package | Proposed version | Why |
|---|---|---|
| `lucide-angular` | `^0.523.0` | The Angular-native equivalent of the source `lucide-vue-next` (§3 concept map, Phase 4 roadmap). Provides the same SVG icon set (`CloudRain`, `CloudSun`, `Cloud`, `Moon`, `Sun`, `Droplet`, `Wind`, `Umbrella`, `Eye`, `CloudLightning`) with standalone component or `provideIcons`/`LucideAngularModule` wiring. Satisfies Angular 20 / Nx peer range. |

**No other new dependency is needed.** `@angular/common`, `@angular/core`, and `rxjs` are already
present. The components, styles, and favicon/title changes require no further packages.

**Peer range check:** Before approving, verify that `lucide-angular@^0.523.0` lists
`@angular/core >= 17` (or the specific Angular version in this workspace) in its `peerDependencies`.
Run `npm info lucide-angular peerDependencies` to confirm. If a different version satisfies the
peer range better, note the corrected version in the approval reply.

**STOP — await human sign-off before proceeding to Step 2.**

---

## Step 2 — Install `lucide-angular`

Perform this step only after receiving explicit approval from Step 1.

```powershell
npm install lucide-angular
```

Confirm the install completes with no peer-dependency warnings or errors. The package must appear
in `package.json` `dependencies` (not `devDependencies`).

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The install must not introduce peer-dependency conflicts. If peer errors appear,
stop and resolve (typically by adjusting the version to one within the peer range) before continuing.

---

## Step 3 — Create `WeatherIconComponent`

**Directory to create:** `apps/web/src/app/shared/weather-icon/`
**Files to create:** `weather-icon.component.ts`, `weather-icon.component.html`

The condition→icon map is ported **verbatim** from
`WeatherApp.VUE/src/WeatherApp.Client/src/components/WeatherIcon.vue`. The evaluation order is:
1. `includes('rain')` → `CloudRain`
2. `includes('cloud') && includes('partly')` → `CloudSun`
3. `includes('cloud')` → `Cloud`
4. `includes('night') || includes('clear')` → `Moon`
5. default → `Sun`

All checks run against `condition.toLowerCase()`.

The kebab condition class (`weather-icon--{condition-kebab}`) mirrors the Vue template:
`condition.toLowerCase().replaceAll(' ', '-')`.

**`weather-icon.component.ts`**

```typescript
import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, Cloud, CloudRain, CloudSun, Moon, Sun } from 'lucide-angular';

@Component({
  selector: 'app-weather-icon',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './weather-icon.component.html',
})
export class WeatherIconComponent {
  condition = input.required<string>();
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  readonly Cloud = Cloud;
  readonly CloudRain = CloudRain;
  readonly CloudSun = CloudSun;
  readonly Moon = Moon;
  readonly Sun = Sun;

  icon = computed(() => {
    const c = this.condition().toLowerCase();
    if (c.includes('rain')) return CloudRain;
    if (c.includes('cloud') && c.includes('partly')) return CloudSun;
    if (c.includes('cloud')) return Cloud;
    if (c.includes('night') || c.includes('clear')) return Moon;
    return Sun;
  });

  conditionKebab = computed(() =>
    this.condition().toLowerCase().replaceAll(' ', '-')
  );
}
```

**Implementation note on `lucide-angular` API:** `lucide-angular` exports a `LucideAngularModule`
and a `lucide-angular` icon component (`<lucide-icon>`). Confirm the exact import path after
install by checking `node_modules/lucide-angular/index.d.ts`. If the module is named differently
(e.g. `LucideAngularModule` is not exported at the root), import from the correct sub-path. The
icon data objects (`CloudRain`, etc.) are the same named exports in all recent `lucide-angular`
versions.

**`weather-icon.component.html`**

```html
<span
  class="weather-icon"
  [class]="'weather-icon--' + size() + ' weather-icon--' + conditionKebab()"
>
  <lucide-icon [img]="icon()" [strokeWidth]="1.8" />
</span>
```

**Implementation note on template binding:** `lucide-angular` uses `[img]` to accept an icon data
object and renders the SVG inline. If the installed version uses a different input name (e.g.
`[name]` with a string, or `[icon]`), check the package's README and adjust the binding
accordingly — the rendered output must be an inline SVG with `stroke-width="1.8"`.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The component must compile with no type errors. In particular, the `computed`
signal returning the icon object must satisfy the type expected by the `lucide-icon` template
binding.

---

## Step 4 — Create `SparklineComponent`

**Directory to create:** `apps/web/src/app/shared/sparkline/`
**Files to create:** `sparkline.component.ts`, `sparkline.component.html`

All math is ported **verbatim** from
`WeatherApp.VUE/src/WeatherApp.Client/src/components/Sparkline.vue`.

Constants: `width = 132`, `height = 46`.

Line path math (`linePath`):
- `min = Math.min(...values)`, `max = Math.max(...values)`, `span = Math.max(max - min, 1)`
- `step = width / Math.max(values.length - 1, 1)`
- For each value at `index`: `x = index * step`, `y = height - ((value - min) / span) * (height - 10) - 5`
- Point string: `` `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}` ``
- Empty `values` returns `''` (no error).

Bars rect math (one `<rect>` per value):
- `x = index * 14`
- `y = height - value * 2.2 - 2`
- `width = 6`
- `height = Math.max(value * 2.2, 4)`
- `rx = 2`

**`sparkline.component.ts`**

```typescript
import { Component, computed, input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './sparkline.component.html',
})
export class SparklineComponent {
  values = input<number[]>([]);
  variant = input<'line' | 'bars'>('line');

  private readonly width = 132;
  private readonly height = 46;

  linePath = computed((): string => {
    const vals = this.values();
    if (vals.length === 0) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(max - min, 1);
    const step = this.width / Math.max(vals.length - 1, 1);
    return vals
      .map((value, index) => {
        const x = index * step;
        const y = this.height - ((value - min) / span) * (this.height - 10) - 5;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  });

  bars = computed(() =>
    this.values().map((value, index) => ({
      x: index * 14,
      y: this.height - value * 2.2 - 2,
      width: 6,
      height: Math.max(value * 2.2, 4),
      rx: 2,
    }))
  );
}
```

**`sparkline.component.html`**

```html
<svg class="sparkline" viewBox="0 0 132 46" role="img" aria-label="metric trend">
  @if (variant() === 'bars') {
    <g class="sparkline-bars">
      @for (bar of bars(); track $index) {
        <rect
          [attr.x]="bar.x"
          [attr.y]="bar.y"
          [attr.width]="bar.width"
          [attr.height]="bar.height"
          [attr.rx]="bar.rx"
        />
      }
    </g>
  } @else {
    <path [attr.d]="linePath()" />
  }
</svg>
```

**Implementation note:** Use Angular 17+ control flow syntax (`@if` / `@for`) rather than
`*ngIf` / `*ngFor`, which avoids needing `NgFor` / `NgIf` imports. If the workspace Angular
version predates 17, fall back to the structural directive form and keep the `NgFor`/`NgIf`
imports in the component. Check `package.json` for `@angular/core` version before choosing.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The computed `linePath` and `bars` signals must compile without type errors.
Confirm the `viewBox` attribute is hardcoded as `"0 0 132 46"` (not bound) in the rendered HTML —
the source Vue template uses the static values.

---

## Step 5 — Create `MetricCardComponent`

**Directory to create:** `apps/web/src/app/shared/metric-card/`
**Files to create:** `metric-card.component.ts`, `metric-card.component.html`

The key→icon map and sparkline variant are ported **verbatim** from
`WeatherApp.VUE/src/WeatherApp.Client/src/components/MetricCard.vue`:

| `metric.key` | Icon |
|---|---|
| `'humidity'` | `Droplet` |
| `'wind'` | `Wind` |
| `'precipitation'` | `Umbrella` |
| default | `Eye` |

Sparkline variant: `'bars'` when `metric.key === 'precipitation'`, else `'line'`.

The markup mirrors the Vue template exactly: `<article class="metric-card">` wrapping
`.metric-card__icon`, `.metric-card__body`, and the `<app-sparkline>`.

**`metric-card.component.ts`**

```typescript
import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, Droplet, Eye, Umbrella, Wind } from 'lucide-angular';
import type { WeatherMetric } from '@nimbus/shared-types';
import { SparklineComponent } from '../sparkline/sparkline.component';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [LucideAngularModule, SparklineComponent],
  templateUrl: './metric-card.component.html',
})
export class MetricCardComponent {
  metric = input.required<WeatherMetric>();

  readonly Droplet = Droplet;
  readonly Eye = Eye;
  readonly Umbrella = Umbrella;
  readonly Wind = Wind;

  icon = computed(() => {
    switch (this.metric().key) {
      case 'humidity':     return Droplet;
      case 'wind':         return Wind;
      case 'precipitation': return Umbrella;
      default:             return Eye;
    }
  });

  sparklineVariant = computed((): 'bars' | 'line' =>
    this.metric().key === 'precipitation' ? 'bars' : 'line'
  );
}
```

**`metric-card.component.html`**

```html
<article class="metric-card">
  <div class="metric-card__icon">
    <lucide-icon [img]="icon()" [strokeWidth]="1.8" />
  </div>
  <div class="metric-card__body">
    <span>{{ metric().label }}</span>
    <strong>{{ metric().value }}<small>{{ metric().unit }}</small></strong>
    <em>{{ metric().hint }}</em>
  </div>
  <app-sparkline [values]="metric().trend" [variant]="sparklineVariant()" />
</article>
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The `WeatherMetric` import from `@nimbus/shared-types` must resolve via the
Phase 0 path alias. The `app-sparkline` selector must resolve to the `SparklineComponent` created
in Step 4. No type errors on `icon()` or `sparklineVariant()` bindings.

---

## Step 6 — Port `styles.css` into `apps/web/src/styles.scss`

**File to modify:** `apps/web/src/styles.scss`

Replace the existing placeholder comment with the full content of
`C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\assets\styles.css`
(~1,150 lines) verbatim. CSS is valid SCSS — no SCSS-specific syntax is required and no selectors
or class names are to be changed.

**Required content integrity checks (verify before saving):**

1. `:root { color-scheme: dark; ... background: #020713; color: #f4f8ff; }` — present at the top.
2. `body { ... background: radial-gradient(...), linear-gradient(135deg, #020713 0%, ...) }` — the
   dual-gradient body background (lines ~14–21 of source) is included.
3. `.app-shell { display: grid; grid-template-columns: 292px minmax(0, 1fr); min-height: 100vh; }` —
   the two-column layout grid.
4. `.sidebar { ... backdrop-filter: blur(24px); }` — sticky sidebar with blur.
5. `.metric-card { display: grid; grid-template-columns: 62px 1fr 132px; ... }` — metric card layout.
6. `.sparkline { width: 132px; height: 46px; }` and `.sparkline path` / `.sparkline-bars rect` — SVG
   sparkline styles.
7. `.weather-icon`, `.weather-icon--sm/md/lg/xl`, `.weather-icon--sunny`,
   `.weather-icon--rainy` / `.weather-icon--rain-showers` — icon wrapper size and color classes.
8. `@media (max-width: 1500px)` — sidebar collapses to 104px.
9. `@media (max-width: 980px)` — sidebar goes horizontal, grid collapses to 1 column.
10. `@media (max-width: 640px)` — mobile overrides.

**Do not:**
- Rename any selector.
- Add any SCSS variables or nesting that alters the CSS output.
- Split the file across multiple partial imports (the single-file approach keeps the wiring simple;
  the build already has `styles.scss` in `project.json` `styles`).

**Budget constraint:** The `anyComponentStyle` budget in `project.json` is 4 kb warn / 8 kb error.
Because the ~1,150-line stylesheet lives in the **global** `styles.scss` (not in a component's
`styleUrls`), it does not count toward the `anyComponentStyle` budget. All three components created
in Steps 3–5 must have **no** `styleUrls` / `styles` array — inline or per-component styles are
explicitly prohibited by acceptance criterion 7.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. No `anyComponentStyle` budget warnings. Confirm with a quick `--configuration
production` build to exercise the budget check:

```powershell
npx nx build web --configuration=production
```

Expected: exits 0, no "budget exceeded" warning in the output.

---

## Step 7 — Add `favicon.svg` and update `index.html`

### 7-A — Add `favicon.svg`

**File to create:** `apps/web/public/favicon.svg`

The favicon is the `CloudLightning` glyph from `lucide-angular` (same icon set as
`lucide-vue-next` — the glyph is identical). Reproduce it as an inline SVG file using the
standard Lucide `CloudLightning` path data. The file must be a self-contained SVG document
viewable in a browser tab.

Minimal correct `favicon.svg` (use the Lucide CloudLightning path; adjust stroke color to match
the brand blue `#66b8ff`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
     fill="none" stroke="#66b8ff" stroke-width="1.8" stroke-linecap="round"
     stroke-linejoin="round">
  <!-- Lucide CloudLightning path data -->
  <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
  <path d="m13 12-3 5h4l-3 5"/>
</svg>
```

**Source verification:** Confirm the path data against the actual Lucide `CloudLightning` icon.
After install, check `node_modules/lucide-angular` or `node_modules/lucide-static` for the SVG
source, or refer to https://lucide.dev/icons/cloud-lightning. The two paths above are the standard
Lucide CloudLightning paths — verify they are correct before saving.

**`apps/web/project.json` check:** The `build.options.assets` entry already copies
`apps/web/public/**/*` to the output root, so the new `favicon.svg` will be served at `/favicon.svg`
automatically. No `project.json` edit is needed.

### 7-B — Update `index.html`

**File to modify:** `apps/web/src/index.html`

Make exactly two changes:
1. Change `<title>web</title>` to `<title>Nimbus Weather</title>`.
2. Change `<link rel="icon" type="image/x-icon" href="favicon.ico" />` to
   `<link rel="icon" type="image/svg+xml" href="favicon.svg" />`.

The full updated `<head>` block:

```html
<head>
  <meta charset="utf-8" />
  <title>Nimbus Weather</title>
  <base href="/" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/svg+xml" href="favicon.svg" />
</head>
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The built `dist/apps/web/browser/` should contain `favicon.svg` (copied from
`apps/web/public/`) alongside the compiled JS/CSS output. Spot-check with:

```powershell
Test-Path "dist/apps/web/browser/favicon.svg"
```

Expected: `True`.

---

## Step 8 — Full build / lint / test gate

```powershell
npm run build
```

Expected: exits 0 across the workspace. No type errors in any of the three new components. No
`anyComponentStyle` budget breach.

```powershell
npm run lint
```

Expected: exits 0. Check especially:
- No unused imports in any of the three component `.ts` files.
- The `lucide-angular` icon data objects (`CloudRain`, `Droplet`, etc.) are imported from the
  correct path (`lucide-angular`).
- No `@typescript-eslint/no-explicit-any` violations.

```powershell
npm test
```

Expected: exits 0. No new test files are introduced in this task (component/store tests are
Phase 6 — acceptance criterion 7 explicitly states "No new specs (Phase 6)"). The existing
test baseline must still pass.

**Verify:** all three commands exit 0.

---

## Step 9 — Diff sanity check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new files (untracked → staged):**

- `apps/web/src/app/shared/weather-icon/weather-icon.component.ts`
- `apps/web/src/app/shared/weather-icon/weather-icon.component.html`
- `apps/web/src/app/shared/sparkline/sparkline.component.ts`
- `apps/web/src/app/shared/sparkline/sparkline.component.html`
- `apps/web/src/app/shared/metric-card/metric-card.component.ts`
- `apps/web/src/app/shared/metric-card/metric-card.component.html`
- `apps/web/public/favicon.svg`

**Expected modified files:**

- `apps/web/src/styles.scss`
- `apps/web/src/index.html`
- `package.json` (lucide-angular added to dependencies)
- `package-lock.json` (updated by npm install)

**Must NOT appear in the diff:**

- `prisma/schema.prisma` or `prisma/migrations/` — no schema edits.
- `libs/shared-types/**` — no shared-types edits.
- `apps/api/**` — no backend edits.
- `apps/web/project.json` — no project config edits needed (styles and assets already wired).
- Any file outside `apps/web/` and `package.json` / `package-lock.json`.

If any unexpected file appears, investigate and revert before staging.

### Stage and commit

```powershell
git add apps/web/src/app/shared/weather-icon/weather-icon.component.ts
git add apps/web/src/app/shared/weather-icon/weather-icon.component.html
git add apps/web/src/app/shared/sparkline/sparkline.component.ts
git add apps/web/src/app/shared/sparkline/sparkline.component.html
git add apps/web/src/app/shared/metric-card/metric-card.component.ts
git add apps/web/src/app/shared/metric-card/metric-card.component.html
git add apps/web/public/favicon.svg
git add apps/web/src/styles.scss
git add apps/web/src/index.html
git add package.json
git add package-lock.json
```

Confirm staged set:

```powershell
git status
```

Expected: exactly the files above staged, nothing else.

```powershell
git commit -m "feat(web): add reusable icon/sparkline/metric components + global styles

Port the source reusable components and design system into apps/web,
reproducing the source class names verbatim so the lifted CSS applies
unchanged:

- WeatherIconComponent (condition -> lucide map: rain/CloudRain,
  partly-cloud/CloudSun, cloud/Cloud, night|clear/Moon, default/Sun)
- SparklineComponent (132x46 inline SVG, line + bars variants)
- MetricCardComponent (.metric-card, key -> icon map + sparkline variant)
- styles.css ported into styles.scss (dark-only #020713/#f4f8ff, .app-shell
  292px grid, 1500/980/640px breakpoints, §0.5 tokens)
- favicon.svg (CloudLightning) + index.html title 'Nimbus Weather'

lucide-angular added only after approval (new dependency). build/lint/
test green; anyComponentStyle budget respected (CSS is global)."
```

No `Co-Authored-By` trailer.

**Final verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit message above appears at HEAD; the stat shows the 7 new files and 4 modified
files listed above — all within `apps/web/` plus the root `package.json` / `package-lock.json`.

---

## Summary of gates

| Step | Gate |
|---|---|
| 0 | `git status` clean; `npm run build` + `npm run lint` + `npm test` green at baseline; `lucide-angular` absent from `package.json` |
| 1 | STOP — present `lucide-angular` + version; await human approval before any install |
| 2 | `npm install lucide-angular` completes with no peer errors; `npm run build` exits 0 |
| 3 | `weather-icon.component.ts/.html` created; condition→icon map verbatim; `npm run build` exits 0 |
| 4 | `sparkline.component.ts/.html` created; 132×46, line path and bars rect math verbatim; `npm run build` exits 0 |
| 5 | `metric-card.component.ts/.html` created; key→icon and sparkline variant verbatim; `npm run build` exits 0 |
| 6 | `styles.scss` populated from `styles.css` verbatim; production build exits 0 with no `anyComponentStyle` budget warning |
| 7 | `favicon.svg` created in `apps/web/public/`; `index.html` title = "Nimbus Weather" and favicon points to `favicon.svg`; `npm run build` exits 0; `favicon.svg` present in `dist/` |
| 8 | `npm run build` + `npm run lint` + `npm test` all green post-implementation |
| 9 | `git diff --stat` shows exactly 7 new files + 4 modified files; commit message matches Tasks doc |
