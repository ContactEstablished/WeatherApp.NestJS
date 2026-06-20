# Execution Prompt — Phase 4: Frontend (Angular)

Paste into a fresh session rooted at the repo; run only after Phase 3 (Backend — NestJS) has landed on `main` and ships all 11 §0.2 endpoints live on `http://localhost:3000`.

You are the lead full-stack engineer for the WeatherApp.NestJS project, working across an Angular front end, a NestJS/Node.js API, and a PostgreSQL database. You design, implement, test, and validate the work directly, following the repo's existing conventions and keeping type safety, clear contracts between the API and the client, and database integrity in mind.

---

## Required reading, in order, before any code

1. **`CLAUDE.md`** — scaffolding guidance and expected commands.
2. **`docs/RoadMap.md` — Phase 4 entry** (lines ~677–847) — goal, scope, decisions, out of scope, success criteria. Pay special attention to:
   - Section 0.2 (the 11-endpoint REST contract, §0.2 note on `/health` outside `api` prefix).
   - Section 0.3 (response type shapes — port them to the shared lib).
   - Section 0.5 (DOM/class-fidelity constraint — **identical markup and class names**).
   - Concept mapping (§3) — Vue/Express/etc. equivalents in Angular/Nest/Postgres.
   - Risks (§4) — Decimal lat/lon, camelCase JSON, the two invariants, CORS/ports differ.
3. **`docs/handoffs/Phase-3-Handoff.md`** — what the Backend landed. Key facts:
   - All 11 endpoints live on `http://localhost:3000` with the global `/api` prefix (except `/health` outside it).
   - `/health` returns `{ status: 'ok', service: 'nimbus-api', time: <ISO> }`.
   - CORS already allows `http://localhost:4200` (Angular dev server).
   - Mutating saved-location calls (#7–#11) return **`204 No Content`** (no response body).
   - The Phase 3 API serves real data (with an OpenWeather key) or mock data (without).
4. **`libs/shared-types/` — Phase 1 contract types** (already landed, read-only).
   - `index.ts` re-exports all response and request interfaces (`WeatherDashboard`, `LocationSuggestion`, `UserPreferences`, etc.).
5. **Source reference:** `C:\Projects\ContactEstablished\WeatherApp.VUE\src\WeatherApp.Client\src\App.vue` (lines 43–258 for the state model, lines 263–415 for sidebar + topbar, lines 417–543 for dashboard panels). **DO NOT** port styling or any .NET backend logic — the Vue/NestJS contract alignment is what matters.

---

## Session-start checklist

Run these before touching any code:

```powershell
# Clean working tree on main
git status
git log --oneline -3

# All baseline commands green
npm run build
npm run lint
npm test
```

**Expected state:**
- Working tree clean on `main`.
- Recent history includes the Phase 3 commits (the last one being `feat(api): add saved-location CRUD, reorder, and set-default (endpoints #6-#11)`).
- `npm run build`, `npm run lint`, `npm test` all exit 0.

**Environment / ports:**
- Phase 3 API running (or runnable): `http://localhost:3000` (serves `/health` and `/api/...` endpoints).
- Angular dev server will run on `http://localhost:4200` (set later; Phase 4-1 adds the dev proxy).
- Postgres running (or available; not strictly needed until Tasks are code-wired to the store).

**Approval gates to watch:**
- **Task 4-6 `lucide-angular` approval gate (NEW DEPENDENCY).** This task requires explicit human sign-off before `npm install` runs. Do not proceed past Task 4-6 Step 1 until approval is received. Frame the approval request: `lucide-angular ^0.523.0 (Angular icon lib, equiv. of source lucide-vue-next)`.

---

## Important context

### Phase 4 scope and constraints (locked from roadmap)

**Goal:** Rebuild the Nimbus dashboard UI in `apps/web` into Angular **standalone components**, preserving **identical DOM structure and class names** so the ported `styles.css` reproduces a near-pixel-identical UI, wired to signals-based `WeatherStore` and HttpClient `WeatherApiService`.

**Key rules (non-negotiable):**

1. **DOM/class-fidelity is load-bearing.** The faithful clone depends on reproducing the source `App.vue` markup and class names **verbatim**. Renaming classes or restructuring breaks the CSS and is **OUT OF BOUNDS**. Examples:
   - `.brand`, `.brand__mark` (not `.logo`, not `.brand-mark`).
   - `.nav-list__item.is-active` (not `.nav-item.active`).
   - `.dashboard-grid`, `.preview-card`, `.daily-row__range`, `.metric-card`.
   - All the way through to `.weather-icon--sm`, `.sparkline`, etc.

2. **No touches to Phase 1/2/3 artifacts.** Consume only:
   - `@nimbus/shared-types` (Phase 1 contract types) — read-only, no new types.
   - `prisma/schema.prisma` + generated `@prisma/client` (Phase 2) — read-only.
   - `apps/api/` (Phase 3 NestJS backend) — read-only, no backend edits.

3. **No new dependency except `lucide-angular` (approval-gated at Task 4-6).** `@angular/common`, `@angular/common/http`, `rxjs ~7.8.0` are already installed. Task 4-6 is the ONLY place `npm install` runs.

4. **Commit style:** `feat(web): ...` for new feature commits. **No `Co-Authored-By:` trailer** (per config `ai_coauthor_trailer: false`).

5. **Signal-first state management.** The `WeatherStore` (Task 4-2) mirrors the `App.vue` `<script setup>` reactive state using Angular signals (`signal`, `computed`, `effect`), not RxJS observables for application state. RxJS is used only for side effects (the search debounce in Task 4-2, the proxy/HTTP in Task 4-1).

---

## Mission

Deliver Phase 4 — Frontend (Angular) end to end. Six sequential tasks, one commit per task.

### Step 0 — Lock any "Decisions needed" from the roadmap entry into the task specs before coding

The roadmap Phase 4 "Decisions needed" section lists:
- **Search wiring:** RxJS `Subject` → `debounceTime(250)` → `switchMap` (LOCKED: no new dependency).
- **`lucide-angular` as the icon library:** LOCKED and approval-gated (Task 4-6 Step 1).
- **Env/proxy config:** `apps/web/src/environments/environment.ts` + `apps/web/proxy.conf.json` (LOCKED in Task 4-1).

No additional decisions are open. Proceed to Step 1 with these locked.

### Step 1 — Write the task specs (one commit)

**Do NOT code yet.** Instead, read through `docs/tasks/Tasks-4-1.md` through `docs/tasks/Tasks-4-6.md` in order. For each task, note:
- The **surface** (what gets built).
- The **why** (why this task exists, what upstream/downstream depends on it).
- The **acceptance criteria** (the testable contract the code must meet).

Then read through `docs/tasks/Impl-4-1.md` through `docs/tasks/Impl-4-6.md` (implementation guides with concrete step-by-step instructions and code templates).

Finally, stage and commit:

```powershell
git add docs/tasks/Tasks-4-*.md docs/tasks/Impl-4-*.md
git commit -m "docs: add Phase 4 task specs"
```

### Step 2 — Implement, one task per commit

Each of the six tasks produces one commit. Follow the enumerated **task split** from `docs/RoadMap.md` Phase 4 "Enumerated task split" (lines ~810–846):

#### Task 4-1 — `WeatherApiService` + HttpClient + env/proxy
**Reference:** `docs/tasks/Tasks-4-1.md` + `docs/tasks/Impl-4-1.md`
**Scope:** Frontend foundation — three new files (`environment.ts`, `weather-api.service.ts`, `proxy.conf.json`), two file edits (`app.config.ts`, `project.json`). No components, no styles, no `lucide-angular` (that's 4-6).
**Acceptance:** All 11 §0.2 endpoints are exposed as one method per service. `HttpClient` is registered. Dev proxy forwards `/api` and `/health` to `:3000`.
**Suggested commit:** `feat(web): add WeatherApiService, HttpClient provider, and dev proxy/env`

#### Task 4-2 — `WeatherStore` signals state + RxJS search debounce
**Reference:** `docs/tasks/Tasks-4-2.md` + `docs/tasks/Impl-4-2.md`
**Scope:** State in one new file (`weather.store.ts`). Ten writable signals, four computeds, eight handlers, one debounced RxJS pipe, one boot sequence. Consumes Task 4-1's service.
**Acceptance:** Signals are typed via `@nimbus/shared-types`. Boot sequence runs: prefs → saved → default/first → dashboard. Search debounces at 250 ms, filters ≥2 chars, emits one request per idle window.
**Suggested commit:** `feat(web): add signals-based WeatherStore with debounced RxJS search`

#### Task 4-3 — Shell / sidebar component tree
**Reference:** `docs/tasks/Tasks-4-3.md` + `docs/tasks/Impl-4-3.md`
**Scope:** Six new standalone components (shell, sidebar, brand, nav-list, saved-locations, premium-card, theme-toggle) reproducing `App.vue` sidebar DOM verbatim. Replaces Nx-welcome. Binds to Task 4-2 store. **DEPENDENCY ON 4-6 FOR ICONS:** either complete 4-6 first or use placeholders and mark `TODO(4-6)`.
**Acceptance:** Sidebar renders with exactly the source class names and structure. Saved-locations row actions invoke store handlers. Shell calls `store.init()` on load.
**Suggested commit:** `feat(web): add shell + sidebar component tree bound to WeatherStore`

#### Task 4-4 — Topbar component tree
**Reference:** `docs/tasks/Tasks-4-4.md` + `docs/tasks/Impl-4-4.md`
**Scope:** Four new components (topbar, search-box, unit-switch, profile-cluster) under `apps/web/src/app/features/topbar/`. Binds to Task 4-2 store. Mounts as first child of `.workspace` (Task 4-3 left this slot).
**Acceptance:** Search input debounces and surfaces suggestions. Unit toggle calls `changeUnits`. Profile cluster is static. All class names match source.
**Suggested commit:** `feat(web): add topbar component tree (search / units / profile)`

#### Task 4-5 — Dashboard component tree
**Reference:** `docs/tasks/Tasks-4-5.md` + `docs/tasks/Impl-4-5.md`
**Scope:** Six new components (dashboard, hero-weather, preview-row, hourly-panel, forecast-panel, metric-stack) rendering the full `WeatherDashboard` response from Task 4-1's API service. **DEPENDS ON 4-6:** consumes `WeatherIconComponent`, `MetricCardComponent`, `lucide-angular` icons. Mounts below topbar in `.workspace`.
**Acceptance:** Renders 7 hourly (first `is-now`), 5 daily, 3 previews, 4 metrics. Hero card save button bound to store. Range bar width clamped 22–86 px. All DOM/class names verbatim.
**Suggested commit:** `feat(web): add dashboard component tree (hero / previews / hourly / daily / metrics)`

#### Task 4-6 — Reusable components + global styles/assets
**Reference:** `docs/tasks/Tasks-4-6.md` + `docs/tasks/Impl-4-6.md`
**Scope:** Three new components (`weather-icon`, `sparkline`, `metric-card`), global `styles.scss` ported from source `styles.css`, `favicon.svg` + `index.html` update, `lucide-angular` install (approval-gated).
**APPROVAL GATE (Step 1 in Impl):** Before any code, present `lucide-angular ^0.523.0` and **STOP for human sign-off**. Only after approval, proceed with install and the component builds.
**Acceptance:** `WeatherIconComponent` maps condition→lucide icon 1:1 from source. `SparklineComponent` renders 132×46 SVG with line/bars variants (math verbatim). `MetricCardComponent` uses the key→icon map and sparkline variant (bars for precipitation, else line). Global `styles.scss` (1,150 lines) is the source `styles.css` unchanged. Favicon is CloudLightning. Title is "Nimbus Weather".
**Suggested commit:** `feat(web): add reusable icon/sparkline/metric components + global styles`

**Task sequencing note:** Tasks 4-3, 4-4, 4-5 depend on icons from Task 4-6. Consider either:
- **Option A (recommended):** Complete 4-6 first (approval gate + install), then 4-3/4-4/4-5.
- **Option B:** Proceed with 4-3/4-4/4-5 using icon placeholders (`<span>` or `<!-- TODO(4-6): icon -->`) and wire real icons once 4-6 lands. Do NOT install `lucide-angular` in 4-3/4-4/4-5 — it is 4-6's approval gate.

### Step 3 — Phase exit

Once all six tasks commit successfully:

1. **Verify every roadmap success criterion** (from `docs/RoadMap.md` Phase 4 "Success criteria"):
   - `npm run build` / `npm run lint` / `npm test` green across workspace.
   - `nx serve web` (4200) against `nx serve api` (3000) renders the dashboard.
   - §0.1 user-visible flows pass: search → suggestions, save location → reorder/default/delete, °F/°C toggle persists.
   - `WeatherApiService` exposes all 11 endpoint methods, typed via `@nimbus/shared-types`.
   - Ported `styles.scss` reproduces §0.5 design system (dark-only, 292px grid, responsive breakpoints).
   - Document title is "Nimbus Weather", favicon is CloudLightning glyph.
   - `lucide-angular` renders condition icons per the map; sparkline renders both variants; proxy forwards `/api` + `/health`.

2. **Flip the ledger row to "complete"** (update this doc or the roadmap's phase table if one exists).

3. **Write a new handoff** in `docs/handoffs/Phase-4-Handoff.md` recording:
   - The six task commits and their summary.
   - What was delivered (the full UI).
   - Verification performed (e.g., serve screenshots, flow traces).
   - Deviations or notes for Phase 5 (the dev workflow orchestration script).

4. **Update conventions doc phase pointer** — if `CLAUDE.md` or another conventions doc has a "current phase" pointer, update it to Phase 5.

5. **Final commit:**
   ```powershell
   git commit -m "docs: close out Phase 4"
   ```

---

## Scope guardrails (DO NOT)

- **Do NOT touch Phase 1/2/3 artifacts.** The shared-types contract, Prisma schema, and backend are read-only. If a step would edit them, STOP and ask.
- **Do NOT refactor outside the named `apps/web/src/app/` component files.** No changes to root `angular.json`, workspace `tsconfig.base.json`, or `package.json` unless explicitly listed in a Tasks doc.
- **Do NOT add any new dependency except `lucide-angular` (approval-gated in Task 4-6).** If a step seems to need a package, STOP and ask. `@angular/common`, `@angular/common/http`, and `rxjs` are already in `package.json`.
- **Do NOT change camelCase JSON.** The JS serializer already emits camelCase; do not add a transformer that snake_case/PascalCases keys.
- **Do NOT rename source class names or restructure DOM.** Class fidelity is load-bearing. `.brand`, `.nav-list__item`, `.dashboard-grid`, etc. must remain exactly as they are in the source. If you find yourself renaming a class, STOP — you may be breaking the CSS.
- **Do NOT write test specs in this phase.** Tests are Phase 6. Keep `npm test` green by leaving existing specs untouched.

---

## Commit-trailer rule

Plain `feat(web): ...` commit messages only. **Do NOT append a `Co-Authored-By:` trailer or any AI co-author line.** It adds a second author and skews GitHub contributor counts. The `ai_coauthor_trailer` config setting is `false` — honor it.

---

**Get started:** Read the required reading (RoadMap Phase 4, Phase 3 Handoff, source `App.vue`). Then run the session-start checklist. Begin with Step 1 (task specs commit). Good luck.
