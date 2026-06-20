# Task 4-6 — Reusable components + global styles/assets

## Surface
Frontend in `apps/web` only — the cross-cutting leaf pieces every other Phase 4 task depends on:
`MetricCardComponent`, `WeatherIconComponent` (condition→lucide map), `SparklineComponent` (inline SVG);
the **install + wiring of `lucide-angular`** (approval-gated new dependency); the ported global
`styles.scss`; and the `favicon.svg` + `index.html` title/favicon. No store, no service, no page-level
shell/topbar/dashboard composition (those are Tasks 4-1 … 4-5, which consume what this task ships).

## Why
This task delivers the shared visual primitives and the design system the rest of the UI hangs on. The
ported `styles.css` (~1,150 lines, §0.5) is what makes the cloned DOM/class names from Tasks 4-3 … 4-5
render near-pixel-identically; `WeatherIconComponent` and `SparklineComponent` are reused across the hero,
previews, hourly, daily, and metric panels; and `lucide-angular` is the §0.5/§3 mapped equivalent of the
source `lucide-vue-next` so the icon glyphs port 1:1. Because `lucide-angular` is a **new dependency
requiring approval before install**, this task is the explicit dependency-approval gate for the phase.

## Depends on
- **Roadmap Phase 4 — Frontend (Angular)** (`docs/RoadMap.md`, "### Phase 4"): the "Reusable:" component
  bullet, the "Styling + assets" bullet, the "Add the `lucide-angular` icon dependency — **new
  dependency, approval required before install**" bullet, and the DOM/class-fidelity constraint.
  Enumerated task-split item **6**.
- **Tasks 4-3 / 4-4 / 4-5**: those component trees import the lucide icons, `WeatherIconComponent`,
  `MetricCardComponent`, and the rendered result depends on this `styles.scss`. This task supplies all of
  them; in practice it should be sequenced **first or alongside** the component tasks so the icon
  dependency is approved and installed before they need it.
- **Phase 5 (Dev workflow)** and **Phase 7 (Build & deploy)** are out of scope — this task adds the
  `proxyConfig` neighbours' assets but not serve orchestration or the nginx/static build.
- No ADRs in `docs/decisions/`. Per the roadmap, the `lucide-angular` choice and the search-debounce
  wiring are the natural ADR candidates; **if this repo introduces ADRs, record the `lucide-angular`
  decision in `docs/decisions/` before install.**

## Required reading
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\components\WeatherIcon.vue` —
  **Mirror:** the condition→icon map (`includes('rain')`→`CloudRain`; `includes('cloud') &&
  includes('partly')`→`CloudSun`; `includes('cloud')`→`Cloud`; `includes('night')||includes('clear')`→
  `Moon`; default→`Sun`), the `size` prop (`sm`/`md`/`lg`/`xl`, default `md`), and the
  `<span class="weather-icon weather-icon--{size} weather-icon--{condition-kebab}">` wrapper with
  `stroke-width="1.8"`.
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\components\Sparkline.vue` —
  **Mirror:** `width = 132`, `height = 46`, the `line` path math (`linePath`) and the `bars` rect math
  (`x = index*14`, `y = height - value*2.2 - 2`, `width=6`, `height=max(value*2.2,4)`, `rx=2`), the
  `variant?: 'line' | 'bars'`, and the `<svg class="sparkline" viewBox="0 0 132 46" role="img"
  aria-label="metric trend">` shell.
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\components\MetricCard.vue` —
  **Mirror:** the `key`→icon map (`humidity`→`Droplet`, `wind`→`Wind`, `precipitation`→`Umbrella`,
  default→`Eye`), the `.metric-card` / `.metric-card__icon` / `.metric-card__body` markup, and the
  `Sparkline` `variant` (`bars` for `precipitation`, else `line`).
- `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\assets\styles.css` —
  **Mirror:** the full stylesheet (`:root { color-scheme: dark }`, `#020713`/`#f4f8ff`, the
  `.app-shell { grid-template-columns: 292px minmax(0,1fr) }` grid, the §0.5 tokens, the
  1500/980/640px breakpoints). Port verbatim into SCSS (CSS is valid SCSS; keep selectors/classes
  unchanged).
- `apps/web/src/styles.scss` — **Mirror:** currently an empty placeholder comment; it is already wired in
  `apps/web/project.json` `styles`. This is the port target.
- `apps/web/src/index.html` — **Mirror:** current `<title>web</title>` and `href="favicon.ico"`; change
  to the Nimbus title + svg favicon.
- `apps/web/project.json` — **Mirror:** the `build` target copies `apps/web/public/**/*` as assets, so the
  new `favicon.svg` belongs in `apps/web/public`.

## Acceptance criteria
1. **`lucide-angular` install — APPROVAL REQUIRED BEFORE INSTALL.** `lucide-angular` is **not** in
   `package.json` and is a cross-cutting new dependency. **Present `lucide-angular` (with the version that
   satisfies the Angular 20/Nx peer range) for human sign-off and STOP before running the install.** Do
   not install unattended. After approval, add it to the root `package.json` `dependencies` and wire its
   provider/`LucideAngularModule` (or the standalone icon registration) so icon components resolve in
   `apps/web`. `npm install` completes with no peer-dependency errors. (`@angular/common`/`HttpClient` and
   `rxjs` are already present — no approval needed for those.)
2. **`WeatherIconComponent` created** (standalone, `selector: 'app-weather-icon'`): inputs
   `condition: string` and `size: 'sm' | 'md' | 'lg' | 'xl'` (default `md`); renders
   `<span class="weather-icon weather-icon--{size} weather-icon--{kebab-condition}">` wrapping the mapped
   lucide icon at `stroke-width="1.8"`. The condition→icon map is the **exact** source mapping
   (rain→CloudRain, partly-cloud→CloudSun, cloud→Cloud, night/clear→Moon, default→Sun), evaluated against
   `condition.toLowerCase()`.
3. **`SparklineComponent` created** (standalone, `selector: 'app-sparkline'`): inputs `values: number[]`
   and `variant: 'line' | 'bars'` (default `line`); renders the **132×46** `<svg class="sparkline"
   viewBox="0 0 132 46">`. The `line` variant draws the `linePath` (`M`/`L` path, y mapped over `height-10`
   with the `-5` offset, `x = index * (width / max(len-1, 1))`); the `bars` variant draws one `<rect>` per
   value with the source x/y/width/height/rx math. Empty `values` renders an empty path without error.
4. **`MetricCardComponent` created** (standalone, `selector: 'app-metric-card'`): input `metric:
   WeatherMetric` (from `@nimbus/shared-types`); renders `.metric-card` / `.metric-card__icon` /
   `.metric-card__body` with the `key`→icon map (humidity→Droplet, wind→Wind, precipitation→Umbrella,
   default→Eye) and a `SparklineComponent` whose `variant` is `bars` for `key === 'precipitation'` else
   `line`, fed `metric.trend`.
5. **Global `styles.scss` ported.** `apps/web/src/styles.scss` reproduces the source `styles.css` design
   system: dark-only (`color-scheme: dark`, `#020713`/`#f4f8ff`, the accent blues), the `.app-shell` grid
   (`292px minmax(0,1fr)`), and the **1500 / 980 / 640px** responsive breakpoints — applied to the cloned
   DOM/class names from Tasks 4-3 … 4-5. Selectors and class names are unchanged from the source. The
   result is a near-pixel match to the §5 QA screenshots (`qa-desktop` / `qa-tablet` / `qa-mobile` /
   `qa-search`).
6. **Favicon + title.** `apps/web/public/favicon.svg` is added (the CloudLightning glyph); `index.html`
   `<title>` is set to **"Nimbus Weather"** (currently `web`) and the favicon `<link>` points at
   `favicon.svg` (replacing `favicon.ico`).
7. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` pass across the
   workspace; the `anyComponentStyle` budget (4kb warn / 8kb error in `project.json`) is respected — the
   bulk CSS lives in the **global** `styles.scss`, not per-component styles. No new specs (Phase 6).

## What NOT to modify
- **`WeatherApiService` / `provideHttpClient` / proxy / env** (Task 4-1), **`WeatherStore`** (Task 4-2),
  **sidebar** (Task 4-3), **topbar** (Task 4-4), **dashboard panels** (Task 4-5) — this task ships the
  leaf components + styles they consume; it does not author the page composition.
- Do **not** rename source class names or restructure markup — DOM/class fidelity is load-bearing; the
  ported CSS must apply unchanged.
- **`libs/shared-types`** (Phase 1, read-only), **`apps/api`** (Phase 3). 
- **MANDATORY — `lucide-angular` is a new dependency requiring approval before install.** Present it and
  STOP for sign-off before `npm install`. No schema migration / no other new dependency unless the
  roadmap says so — if a step seems to need a package beyond the approved `lucide-angular`, STOP and ask.

## Suggested commit
```
feat(web): add reusable icon/sparkline/metric components + global styles

Port the source reusable components and design system into apps/web,
reproducing the source class names verbatim so the lifted CSS applies
unchanged:

- WeatherIconComponent (condition -> lucide map: rain/CloudRain,
  partly-cloud/CloudSun, cloud/Cloud, night|clear/Moon, default/Sun)
- SparklineComponent (132x46 inline SVG, line + bars variants)
- MetricCardComponent (.metric-card, key -> icon map + sparkline variant)
- styles.css ported into styles.scss (dark-only #020713/#f4f8ff, .app-shell
  292px grid, 1500/980/640px breakpoints, §0.5 tokens)
- favicon.svg (CloudLightning) + index.html title "Nimbus Weather"

lucide-angular added only after approval (new dependency). build/lint/
test green; anyComponentStyle budget respected (CSS is global).
```
