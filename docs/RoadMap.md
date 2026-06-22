# ROADMAP — Nimbus Weather, rebuilt on Angular + NestJS + PostgreSQL

> **Stack note.** The original request said "MEAN" (MongoDB · Express · Angular · Node). After
> discussion we swapped two pieces for a better fit while keeping the parts that matter:
>
> | MEAN piece | Decision | Why |
> |------------|----------|-----|
> | **M**ongoDB | → **PostgreSQL + Prisma** | The data is small but genuinely relational (one-default-per-user, unique location per user, an ordered list). SQL enforces those invariants natively; Prisma's type-safe client + migrations mirror the current EF Core setup. |
> | **E**xpress | → **NestJS** | TypeScript-first, with the *exact* mental model Angular uses (modules, DI, decorators, providers). One paradigm across the whole stack; maps 1:1 onto the current .NET service layout. Runs on Express/Fastify under the hood. |
> | **A**ngular | **kept** | Requested. Replaces Vue 3. |
> | **N**ode | **kept** | Requested. Runtime for NestJS. |
>
> Effective stack: **Angular + NestJS + PostgreSQL + Node** (a "MEAN-inspired" / *PANN* stack). The
> filename stays `RoadMap-MEAN.md` for continuity with the original ask.

This document is a complete, self-contained recipe to recreate the existing **Nimbus Weather** app —
identical UI, design, and behavior — on the new stack, in a **brand-new repository**.

---

## Table of contents
0. [Source-app reference (what we are cloning)](#0-source-app-reference-what-we-are-cloning)
1. [Target architecture (Nx monorepo)](#1-target-architecture-nx-monorepo)
2. [Phased build plan](#2-phased-build-plan)
3. [Concept mapping (Vue/.NET → Angular/Nest)](#3-concept-mapping)
4. [Risks / gotchas](#4-risks--gotchas)
5. [Verification (end-to-end)](#5-verification-end-to-end)
6. [New repository creation](#6-new-repository-creation)

---

## 0. Source-app reference (what we are cloning)

The current app is **not** a Node app. Today it is:

- **Frontend:** Vue 3 + Vite + TypeScript — a single dashboard view, custom CSS design system, `lucide` icons, plain `fetch` for the API.
- **Backend:** **.NET 10 Minimal API + EF Core + SQL Server**, with an OpenWeather One Call 3.0 integration, in-memory caching, and a mock fallback.

The front/back boundary is a clean, well-defined **11-endpoint REST contract**, which is what makes the
rewrite tractable: clone the contract exactly and both ends stay compatible.

### 0.1 Feature inventory (user-visible behavior — must match exactly)
1. Location search with debounced (250 ms) autocomplete; supports city, "city, state", and US ZIP.
2. Current-conditions hero card: temperature, condition + icon, feels-like, sunrise/sunset, observed-at, dynamic background image, summary/description.
3. 3-card "condition previews" carousel (with dot indicators).
4. Hourly forecast strip (7 hours; first labeled "Now").
5. 5-day forecast list (day/date, icon, condition, precipitation %, high/low with a visual range bar).
6. 4 metric cards (humidity, wind, precipitation, visibility) each with a hint + sparkline trend.
7. Save the current location (star/plus button on the hero card).
8. Saved-locations sidebar: select (loads its weather), move up/down (reorder), set default (star), delete.
9. Temperature unit toggle °F/°C (imperial/metric), persisted per user.
10. Dark-mode toggle UI present but cosmetic (app is dark-only) — replicate as-is.
11. Static profile cluster + notifications bell (hardcoded "Alex Morgan / Premium") — replicate as-is.

### 0.2 REST contract (reproduce 1:1 — same paths, params, JSON shapes, status codes)
The frontend calls these with `userId = "anonymous"`. JSON is **camelCase**.

| # | Method | Path | Params / Body | Returns |
|---|--------|------|---------------|---------|
| 1 | GET | `/health` | — | `{ status, service, time }` |
| 2 | GET | `/api/weather/dashboard` | `?location&unitSystem&userId` | `WeatherDashboard` |
| 3 | GET | `/api/weather/locations` | `?query` (default `"San Francisco"`) | `LocationSuggestion[]` |
| 4 | GET | `/api/users/{userId}/preferences` | — | `UserPreferences` |
| 5 | PUT | `/api/users/{userId}/preferences` | `{ unitSystem }` | `UserPreferences` |
| 6 | GET | `/api/users/{userId}/locations` | — | `LocationSuggestion[]` (ordered by `sortOrder`) |
| 7 | POST | `/api/users/{userId}/locations` | `{ name, region, country, latitude, longitude, isDefault? }` | `204 No Content` |
| 8 | PUT | `/api/users/{userId}/locations/{id}` | same body as POST | `204 No Content` |
| 9 | DELETE | `/api/users/{userId}/locations/{id}` | — | `204 No Content` |
| 10 | PUT | `/api/users/{userId}/locations/{id}/default` | — | `204 No Content` |
| 11 | PUT | `/api/users/{userId}/locations/reorder` | `{ locationIds: number[] }` | `204 No Content` |

> **Note:** `/health` is **not** under `/api`. In Nest, set a global prefix `api` but **exclude** the health route.

### 0.3 Data contract (TypeScript interfaces — lift verbatim into the shared lib)
Copy from `src/WeatherApp.Client/src/types/weather.ts` — it already matches the JSON exactly.

```ts
export type UnitSystem = 'imperial' | 'metric';

export interface WeatherDashboard {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  previews: WeatherPreview[];
  metrics: WeatherMetric[];
  locations: LocationSuggestion[];
  unitSystem: UnitSystem;
  temperatureUnit: string;   // "F" | "C"
  windUnit: string;          // "mph" | "m/s"
}

export interface CurrentWeather {
  location: string;
  observedAt: string;
  condition: string;
  summary: string;
  description: string;
  temperature: number;
  feelsLike: number;
  low: number;
  high: number;
  sunrise: string;
  sunset: string;
  backgroundImageUrl: string;
}

export interface HourlyForecast {
  label: string;             // "Now", "11 PM", ...
  time: string;
  condition: string;
  temperature: number;
  windSpeed: number;
  precipitationChance: number;
}

export interface DailyForecast {
  day: string;               // "Mon"
  date: string;              // ISO date
  condition: string;
  high: number;
  low: number;
  precipitationChance: number;
}

export interface WeatherPreview {
  condition: string;
  high: number;
  low: number;
  description: string;
}

export interface WeatherMetric {
  key: string;               // "humidity" | "wind" | "precipitation" | "visibility"
  label: string;
  value: string;
  unit: string;
  hint: string;
  trend: number[];
}

export interface LocationSuggestion {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  id?: number | null;
  isDefault: boolean;
  sortOrder: number;
}

export interface UserPreferences {
  userId: string;
  unitSystem: UnitSystem;
}
```

### 0.4 Data model (current EF Core → target Prisma)

| Entity | Fields | Constraints |
|--------|--------|-------------|
| `UserPreference` | `userId` (PK, string ≤120), `unitSystem` (string, default `"imperial"`), `createdUtc`, `updatedUtc` | — |
| `SavedLocation` | `id` (PK int identity), `userId`, `name`, `region`, `country`, `latitude` `decimal(9,6)`, `longitude` `decimal(9,6)`, `isDefault` bool, `sortOrder` int, `createdUtc` | **unique** `(userId, name, region)`; **index** `(userId, sortOrder)` |

Invariants to preserve in service logic (these are the only non-trivial server rules):
- Auto-create a `UserPreference` with `unitSystem = "imperial"` on first read.
- **One default location per user** — setting a default atomically clears it on the others.
- **No duplicate** `(userId, name, region)`.
- `sortOrder` defines display order; a reorder rewrites it contiguously.

Target `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model UserPreference {
  userId     String   @id @db.VarChar(120)
  unitSystem String   @default("imperial") @db.VarChar(16)
  createdUtc DateTime @default(now())
  updatedUtc DateTime @updatedAt

  @@map("user_preferences")
}

model SavedLocation {
  id         Int      @id @default(autoincrement())
  userId     String   @db.VarChar(120)
  name       String   @db.VarChar(160)
  region     String   @db.VarChar(160)
  country    String   @db.VarChar(80)
  latitude   Decimal  @db.Decimal(9, 6)
  longitude  Decimal  @db.Decimal(9, 6)
  isDefault  Boolean  @default(false)
  sortOrder  Int      @default(0)
  createdUtc DateTime @default(now())

  @@unique([userId, name, region])
  @@index([userId, sortOrder])
  @@map("saved_locations")
}
```

### 0.5 Design system (port the CSS, not the framework)
The styling lives in `src/WeatherApp.Client/src/assets/styles.css` (~1,150 lines) and is **plain,
framework-agnostic CSS** keyed off class names. The fastest faithful clone is to **reproduce the same
DOM structure and class names in Angular templates and lift `styles.css` into Angular global styles
almost verbatim** — this yields a near-pixel-identical UI.

Design tokens to preserve:
- Dark only (`color-scheme: dark`). Font: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Base background `#020713`, text `#f4f8ff`. Body uses a radial + linear gradient (`styles.css` ~lines 14–21).
- Accent blues `#39b6ff / #42c2ff / #66b8ff`; secondary text `#c2ccdb / #8f9aac / #9facbf`; gold `#ffd25f`; error `#ff5c5c`.
- Layout: `.app-shell` grid `292px minmax(0, 1fr)`; sticky sidebar with `backdrop-filter: blur(24px)`.
- Responsive breakpoints: **1500px** (sidebar collapses to 104px), **980px** (sidebar goes horizontal, grid → 1 column), **640px** (mobile).
- Icons: `lucide-vue-next` → **`lucide-angular`** (same icon set, identical glyphs).
- Sparkline: hand-rolled inline SVG (132×46 viewBox; `line` and `bars` variants) — reproduce as an Angular component.
- Misc assets: `public/favicon.svg` (CloudLightning), document title **"Nimbus Weather"**, profile avatar is a hardcoded Unsplash URL, hero background is a per-condition Unsplash URL supplied by the API.

---

## 1. Target architecture (Nx monorepo)

```
nimbus-weather/                      # new repo
├─ apps/
│  ├─ web/                           # Angular app (standalone components, signals)
│  └─ api/                           # NestJS app (Express or Fastify adapter)
├─ libs/
│  └─ shared-types/                  # weather.ts interfaces shared by web + api (no drift)
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ docker-compose.yml                # local Postgres (+ api/web for prod compose)
├─ .env / .env.example               # DATABASE_URL, OPENWEATHER_API_KEY, ports
├─ nx.json, package.json, tsconfig.base.json
└─ RoadMap-MEAN.md
```

**Why this shape:** Nx runs, builds, and tests both apps from one workspace, and `libs/shared-types`
makes the REST contract a **compile-time shared dependency** — the Angular client and the Nest server
import the same interfaces, so the API contract can never silently drift.

---

## 2. Phased build plan

> Effort estimates assume one developer familiar with Angular + Nest. They are guidance, not commitments.

### Phase 0 — Bootstrap (½ day)

> _Normalized 2026-06-20: expanded from a thin bullet list into the pipeline's required shape.
> The repo is not yet scaffolded (only `README.md`, `.gitignore`, `CLAUDE.md`, and the docs/`.claude`
> kit exist) — there is no `nx.json`, `package.json`, `apps/`, `libs/`, `prisma/`, or
> `docker-compose.yml` yet. Everything below is therefore greenfield._

**Goal.** Stand up the Nx integrated monorepo and all of the empty-but-wired scaffolding the rest of
the plan lands into: `apps/web` (Angular standalone components, SCSS), `apps/api` (Nest),
`libs/shared-types` with the `@nimbus/shared-types` tsconfig path alias, Prisma initialized, local
Postgres via `docker-compose`, and `.env` / `.env.example`. Phase 0 produces **structure and
configuration only** — no contract types, no business logic, no schema models (those are Phases 1+).
The deliverable is a workspace where every later phase already has a place to put its code.

**Scope (in scope).**
- **Create the Nx workspace.** `npx create-nx-workspace@latest nimbus-weather --preset=apps`
  (integrated monorepo). Workspace name is `nimbus-weather` (matches §1 and the `@nimbus` scope).
- **Add the framework plugins and generate the two apps.** Add `@nx/angular` and `@nx/nest`, then
  generate `apps/web` (Angular **standalone components**, **SCSS** styling) and `apps/api` (Nest).
- **Generate the shared library and lock the path alias.** Generate `libs/shared-types` and
  confirm/establish the `@nimbus/shared-types` tsconfig path alias in `tsconfig.base.json`. **The alias
  spelling is load-bearing — Phase 1 imports from `@nimbus/shared-types`** and depends on it resolving
  from both apps. The library only needs a placeholder export for now; the real contract types are
  Phase 1.
- **Initialize Prisma (no models).** `npm i -D prisma`, `npm i @prisma/client`, `npx prisma init` —
  this creates the `prisma/schema.prisma` stub and the `.env` `DATABASE_URL`. **No models are authored
  here** — schema authoring per §0.4 is Phase 2.
- **Local Postgres + environment config.** Add `docker-compose.yml` with a `postgres:16` service, and
  `.env` + `.env.example` carrying `DATABASE_URL`, `OPENWEATHER_API_KEY` (may be blank — the app falls
  back to mock weather data, per §4), and `PORT=3000` (Nest; the Angular dev server is 4200).
- **Confirm the verify commands resolve.** Confirm baseline `npm run build`, `npm run lint`, and
  `npm test` resolve to working Nx targets across the generated projects (even if they only exercise
  empty scaffolding).

> **Constraint — scaffolding and config only.** No contract types, no DTOs, no Prisma models, no
> modules/providers, no UI. If a step would produce business logic or a schema model, it belongs to a
> later phase (see Out of scope).

**Decisions needed.**
- **Package manager.** The "Scaffolding the project" section in `CLAUDE.md` notes the choice is
  undecided and the `.gitignore` carries npm/pnpm/yarn references. *Recommendation:* **npm** — the
  config's build/verify commands are already `npm run build` / `npm test` / `npm run lint`, and the
  §0.x bullets use `npm i`. Pick it during `create-nx-workspace` and remove the "undecided" note from
  `CLAUDE.md`.
- **Nx workspace style — integrated vs package-based.** *Recommendation:* **integrated** (the
  `--preset=apps` default), matching §1's stated "Nx integrated monorepo" so Nx owns build/test/serve
  targets for both apps.
- **Commit `.env.example` only; gitignore `.env`.** *Recommendation:* commit `.env.example`
  documenting the three vars and add `.env` to `.gitignore` (the Nest template's `.gitignore` already
  covers the `.env*` family), per §6. **Approval required before apply** — this is a repo-policy edit.
- **Confirm `@nimbus` as the alias/npm scope.** *Recommendation:* **keep `@nimbus`** — it matches §1
  and the `nimbus-weather` workspace name; only revisit if the eventual published scope differs.

**Out of scope (deferred).**
- **§0.3 contract types and §0.2-derived request DTOs** — the nine response interfaces and four
  request DTOs are **Phase 1 (Shared contract)**; Phase 0 only creates the empty `libs/shared-types`
  project and its path alias.
- **Prisma schema models + migrations** — authoring `schema.prisma` per §0.4 and running
  `prisma migrate dev` is **Phase 2 (Database + Prisma)**. Phase 0 only runs `prisma init` (stub).
  **Schema migrations require approval before apply.**
- **All backend modules/providers** — the Prisma/Config/Health/Weather/Users modules are **Phase 3 (Backend)**.
- **Angular UI / components / `WeatherStore`** — all components, state, and ported CSS are **Phase 4 (Frontend)**.
- **CI (GitHub Actions)** — install → lint → test → build on PR is **Phase 7 (Build & deploy)**.

**Success criteria.**
- The workspace builds clean: `npm run build` succeeds across the generated projects; `npm run lint`
  and `npm test` resolve to working Nx targets and pass against the empty scaffolding.
- `apps/web` and `apps/api` exist and serve (Angular dev server on 4200, Nest on 3000).
- `libs/shared-types` resolves via the `@nimbus/shared-types` path alias from **both** `apps/web` and
  `apps/api` (a placeholder export is enough to compile-check the alias).
- `npx prisma` is runnable and `prisma/schema.prisma` exists (stub, no models).
- `docker compose up -d` brings up the `postgres:16` service.
- `.env.example` documents `DATABASE_URL`, `OPENWEATHER_API_KEY`, and `PORT`, and notes that a missing
  `OPENWEATHER_API_KEY` makes the app serve mock weather data (per §4).

**Enumerated task split** — `S` · 4 task docs (phase-0 Nx workspace + apps/web + apps/api; phase-0 libs/shared-types + `@nimbus/shared-types` path alias; phase-0 Prisma init; phase-0 docker-compose Postgres + `.env`/`.env.example`).
1. **Create the Nx workspace and generate both apps.** Run `create-nx-workspace@latest nimbus-weather
   --preset=apps`, add `@nx/angular` + `@nx/nest`, generate `apps/web` (Angular standalone, SCSS) and
   `apps/api` (Nest). Verifiable: `npm run build` / `npm run lint` / `npm test` resolve to Nx targets
   and pass; both apps serve (web 4200, api 3000).
2. **Generate `libs/shared-types` and establish the `@nimbus/shared-types` path alias.** Generate the
   library with a placeholder export and confirm the `@nimbus/shared-types` alias in
   `tsconfig.base.json`. Verifiable: a placeholder import of `@nimbus/shared-types` resolves from both
   `apps/web` and `apps/api`, and `npm run build` stays green.
3. **Initialize Prisma (stub, no models).** `npm i -D prisma`, `npm i @prisma/client`,
   `npx prisma init`. Verifiable: `prisma/schema.prisma` exists and `npx prisma` is runnable; no models
   are authored.
4. **Add local Postgres and environment config.** Author `docker-compose.yml` with a `postgres:16`
   service and create `.env` + `.env.example` (`DATABASE_URL`, `OPENWEATHER_API_KEY`, `PORT=3000`),
   gitignoring `.env`. Verifiable: `docker compose up -d` brings up Postgres and `.env.example`
   documents the three vars plus the no-key mock fallback.

### Phase 1 — Shared contract (`libs/shared-types`) (½ day)

**Goal.** Stand up `libs/shared-types` as the single, compile-time source of truth for the REST
contract — the nine §0.3 response interfaces plus the four request DTOs — so `apps/web` and `apps/api`
import identical types from `@nimbus/shared-types` and the contract can never silently drift.

**Scope (in scope).**
- **Response types — lift §0.3 verbatim.** All nine declarations, byte-for-byte from
  `src/WeatherApp.Client/src/types/weather.ts` (they already match the camelCase JSON): `UnitSystem`,
  `WeatherDashboard`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `WeatherPreview`,
  `WeatherMetric`, `LocationSuggestion`, `UserPreferences`.
- **Request DTO types — derived from the §0.2 endpoint bodies.** Add four interfaces matching the
  bodies of the mutating endpoints exactly:
  - `UpdatePreferencesRequest` → endpoint #5 `PUT /api/users/{userId}/preferences` body `{ unitSystem }` (reuse `UnitSystem`).
  - `SaveLocationRequest` → endpoint #7 `POST /api/users/{userId}/locations` body `{ name, region, country, latitude, longitude, isDefault? }` (`isDefault` optional).
  - `UpdateSavedLocationRequest` → endpoint #8 `PUT /api/users/{userId}/locations/{id}` — "same body as POST"; type as `SaveLocationRequest` (alias or extend, no new fields).
  - `ReorderSavedLocationsRequest` → endpoint #11 `PUT /api/users/{userId}/locations/reorder` body `{ locationIds: number[] }`.
- **Barrel export.** A single `index.ts` re-exporting every type so both apps import from
  `@nimbus/shared-types` (the path alias scaffolded in Phase 0).

> **Constraint — pure TypeScript types only.** This library carries `type`/`interface` declarations
> and nothing else: no Angular, Nest, or Prisma imports, no `class-validator` decorators, no runtime
> code. Validation and runtime concerns belong to Phase 3 (see Out of scope).

**Decisions needed.**
- **How to type `UpdateSavedLocationRequest` against `SaveLocationRequest`** (the bodies are
  identical). *Recommendation:* `export type UpdateSavedLocationRequest = SaveLocationRequest;` — a
  plain alias keeps the "same body" invariant from §0.2 self-documenting and impossible to drift; only
  switch to `extends` if a field genuinely diverges later.
- **Whether `@nimbus` is the final npm scope** for the alias `@nimbus/shared-types`. *Recommendation:*
  keep `@nimbus` — it matches §1 and the `nimbus-weather` workspace name; this only needs confirming
  if the published package scope differs.
- **Whether request DTOs live in their own file** (e.g. `requests.ts`) or alongside the lifted
  response types. *Recommendation:* a separate `requests.ts` re-exported through the barrel — keeps the
  §0.3 block a clean verbatim copy and the §0.2-derived DTOs visibly distinct.

**Out of scope (deferred).**
- **Runtime validation** — `class-validator` / `class-transformer` DTO classes and the global
  `ValidationPipe` live in **Phase 3 (Backend)**, not here.
- **Prisma models / DB types** — `prisma/schema.prisma` and the generated client are **Phase 2
  (Database + Prisma)**. The `Decimal`→`number` boundary conversion noted in §4 is a Phase 3 concern.
- **Any consumer wiring** — actually importing these types into Angular services or Nest controllers
  happens in **Phase 3 (Backend)** and **Phase 4 (Frontend)**.
- **Workspace scaffolding** — generating the `libs/shared-types` project and the tsconfig path alias
  is **Phase 0 (Bootstrap)**, a prerequisite for this phase.

**Success criteria.**
- `libs/shared-types/src` exports all nine §0.3 types and the four request DTOs through `index.ts`;
  the response interfaces are textually identical to `src/WeatherApp.Client/src/types/weather.ts`.
- `npm run build` builds the `shared-types` library with no type errors.
- `npm run lint` passes for the library (no stray runtime code, no disallowed imports).
- A throwaway type-only import of `@nimbus/shared-types` resolves from both `apps/web` and `apps/api`
  via the Phase 0 path alias (compile-checked, no runtime dependency introduced).

**Enumerated task split** — `S` · 2 task docs (phase-1 §0.3 response types + barrel; phase-2 §0.2-derived request DTOs).
1. **Lift the §0.3 response types into `libs/shared-types` + barrel.** Copy the nine interfaces
   verbatim into the library's source, add `index.ts` re-exporting them, and confirm `npm run build` /
   `npm run lint` are green. Verifiable: the nine types resolve via `@nimbus/shared-types`.
2. **Add the four §0.2-derived request DTOs and export them through the barrel.**
   `UpdatePreferencesRequest`, `SaveLocationRequest`, `UpdateSavedLocationRequest` (= `SaveLocationRequest`),
   `ReorderSavedLocationsRequest`, each matching its endpoint body. Verifiable: all four resolve via
   the barrel and `npm run build` stays green.

### Phase 2 — Database + Prisma (½ day)

> _**Shipped 2026-06-20.** Closed out after the Task 2-1 / 2-2 handoff landed on `main`
> (`f78f462` schema + seed stub + `package.json` hook; `84bf29a` `init` migration + `prisma generate`).
> Both §0.4 models (`UserPreference`, `SavedLocation`) are authored in `prisma/schema.prisma` with the
> `@@unique([userId, name, region])` constraint and `@@index([userId, sortOrder])`; the initial
> migration is `prisma/migrations/20260620144720_init/migration.sql` (provider locked to `postgresql`
> in `migration_lock.toml`); Prisma Client 6.19.3 is generated and the `prisma.userPreference` /
> `prisma.savedLocation` accessors type-check. `prisma/seed.ts` is a minimal stub (empty `main()`,
> commented anonymous upsert) wired via `package.json` `prisma.seed = "ts-node prisma/seed.ts"` but
> **not run** (Phase 5 owns execution). `npx prisma migrate status` reports 1 migration applied, no
> drift; `npm run build` / `npm run lint` / `npm test` are green. See
> `docs/handoffs/Phase-2-Handoff.md`. The historical plan is preserved below._
>
> _Normalized 2026-06-20: expanded from a thin two-bullet stub into the pipeline's required shape.
> Verified against the repo: `prisma/schema.prisma` exists as the Phase 0 **stub** (a `generator
> client` block and a `postgresql` `datasource` only — no models); there is no `prisma/migrations/`
> directory yet and no `prisma/seed.ts`. `libs/shared-types` (Phase 1) is landed. Phase 2 builds on
> the Phase 0 stub by adding the two §0.4 models and the initial migration._

**Goal.** Turn the Phase 0 Prisma stub into the project's persistence schema: author the two §0.4
models (`UserPreference`, `SavedLocation`) with their exact field types, constraints, and indexes into
`prisma/schema.prisma`, then create the initial migration and generate the Prisma client. The
deliverable is a migrated Postgres schema plus a resolvable generated client that Phase 3's
`PrismaService` can import — this phase authors **schema and migration only**, no NestJS providers and
no service-layer logic.

**Scope (in scope).**
- **Author the two §0.4 models in `prisma/schema.prisma`.** Replace the stub's model-free body with
  the §0.4 target block exactly: `UserPreference` (`userId` `@id @db.VarChar(120)`, `unitSystem`
  `@default("imperial") @db.VarChar(16)`, `createdUtc @default(now())`, `updatedUtc @updatedAt`,
  `@@map("user_preferences")`) and `SavedLocation` (`id @id @default(autoincrement())`, `userId`/`name`/
  `region`/`country` `@db.VarChar`, `latitude`/`longitude` `@db.Decimal(9, 6)`, `isDefault
  @default(false)`, `sortOrder @default(0)`, `createdUtc @default(now())`, `@@map("saved_locations")`).
  Leave the existing `generator client` and `postgresql` `datasource` blocks untouched.
- **Carry the two constraints exactly.** `@@unique([userId, name, region])` and
  `@@index([userId, sortOrder])` on `SavedLocation` — these back the §0.4 "no duplicate" and ordered-list
  invariants at the database layer.
- **Create the initial migration.** `npx prisma migrate dev --name init` against the Phase 0 local
  Postgres (`docker compose up -d` first), producing `prisma/migrations/<timestamp>_init/migration.sql`.
- **Generate the Prisma client.** `npx prisma generate` immediately after the migration, so the typed
  client exists on disk before Phase 3 imports it.
- **Author a `prisma/seed.ts` stub and wire `prisma.seed` in `package.json` (do not run).** A minimal
  (empty or single-`anonymous`-row) seed file plus the `package.json` `"prisma": { "seed": "..." }`
  hook, so Phase 5 can run it without further wiring. **Authoring only — running the seed is Phase 5.**

> **Constraint — schema + migration only, no providers.** This phase touches `prisma/schema.prisma`,
> `prisma/migrations/`, the generated client, and the `prisma/seed.ts` + `package.json` seed hook.
> It writes **no** NestJS code: `PrismaModule`/`PrismaService`, the `UsersModule`, and every §0.4
> service-layer invariant are Phase 3 (see Out of scope).

> **Constraint — schema migration is an approval gate.** §0 records that "schema migrations require
> approval before apply." Authoring `schema.prisma` may proceed, but **`prisma migrate dev` must not be
> run until the schema diff is approved** — it creates a migration and mutates the database.

**Decisions needed.**
- **Single `init` migration vs. mirroring the two EF migrations** (`InitialCreate` +
  `AddSavedLocationSortOrder`). *Recommendation:* **one `--name init` migration** — both models are
  authored fresh in a single step, so there is no reason to split history; the EF migration names are
  informational only (they describe how the *current* .NET schema evolved, not a sequencing requirement
  here).
- **`prisma generate` placement.** *Recommendation:* **run it as part of this phase**, immediately
  after `migrate dev`, so the generated client is present on disk before Phase 3's `PrismaService`
  tries to import `@prisma/client`. (`migrate dev` already triggers a generate, but running it
  explicitly makes the dependency order unambiguous and survives a `migrate` that skips generation.)
- **Seed data.** *Recommendation:* **author a `prisma/seed.ts` stub and wire `prisma.seed` in
  `package.json`, but do not run it here.** A minimal seed (e.g. one `anonymous` `UserPreference` row)
  gives Phase 3/6 integration tests a known starting state, but *running* seeds is a dev-workflow
  concern — see Out of scope and the Phase 5 forward pointer.
- **Schema approval gate (carry-through from §0).** *Recommendation:* treat the schema diff as
  **approval required before apply** — present the authored `schema.prisma` and the planned migration
  for review, then run `migrate dev` only once approved.

**Out of scope (deferred).**
- **`PrismaModule` / `PrismaService`** — the global module and the `PrismaClient`-extending service
  that connects in `onModuleInit` are **Phase 3 (Backend)**. Phase 2 produces the schema and client they
  depend on, nothing more.
- **All §0.4 service-layer invariants** — auto-create-on-first-read, single-default-per-user,
  `(userId, name, region)` dedupe, and contiguous-`sortOrder`-on-reorder are **Phase 3** service logic
  (`PreferenceService` / `UsersModule`). The schema's `@@unique` and `@@index` only back those rules at
  the DB layer; the enforcement code is not written here.
- **Running the seed** — `prisma/seed.ts` is *authored and wired* here but **executed in Phase 5
  (Dev workflow)** as part of the local-DB setup. Phase 2 must not run `prisma db seed`.
- **`Decimal` → `number` boundary conversion** — turning Prisma `Decimal` lat/lon into the
  `LocationSuggestion` contract's `number` fields (per §4) is a **Phase 3 (Backend)** API-boundary
  concern, not a schema concern.

**Success criteria.**
- `prisma/schema.prisma` contains the two §0.4 models exactly — including `@@unique([userId, name,
  region])`, `@@index([userId, sortOrder])`, `@db.Decimal(9, 6)` on `latitude`/`longitude`, the
  `@default(now())` / `@updatedAt` timestamps, and the `@@map` table names — and `npx prisma validate`
  passes.
- `npx prisma migrate dev --name init` succeeds (after approval) and produces a
  `prisma/migrations/<timestamp>_init/migration.sql` whose DDL creates `user_preferences` and
  `saved_locations` with the unique constraint and the index.
- `npx prisma generate` completes and the generated client resolves — a throwaway
  `import { PrismaClient } from '@prisma/client'` type-checks.
- `prisma/seed.ts` exists and `package.json` carries a `prisma.seed` hook, but no seed has been run
  (Phase 5 owns execution).
- `npm run build` stays green (no schema-driven type breakage introduced into the workspace).

**Enumerated task split** — `S` · 2 task docs (phase-2 author `schema.prisma` models + seed/`package.json` wiring; phase-2 run `migrate dev --name init` + `prisma generate`).
1. **Author the two §0.4 models (and the seed stub) and validate the schema.** Replace the stub body
   of `prisma/schema.prisma` with the `UserPreference` and `SavedLocation` models — all field types,
   `@db.VarChar`/`@db.Decimal(9, 6)` annotations, defaults, `@updatedAt`, `@@unique`, `@@index`, and
   `@@map` names — and add a minimal `prisma/seed.ts` stub plus the `package.json` `prisma.seed` hook.
   Verifiable: `npx prisma validate` passes; `prisma/seed.ts` and the `prisma.seed` hook exist (seed
   not run).
2. **Create the initial migration and generate the client.** With local Postgres up and the schema
   diff approved, run `npx prisma migrate dev --name init` then `npx prisma generate`. Verifiable: a
   `prisma/migrations/<timestamp>_init/migration.sql` exists creating `user_preferences` and
   `saved_locations` (with the unique constraint + index), and a throwaway
   `import { PrismaClient } from '@prisma/client'` resolves.

### Phase 3 — Backend (NestJS) (2–3 days)

> _**Shipped 2026-06-20.** Closed out after Tasks 3-1…3-5 landed on
> `claude/phase3-prompt-execution-e0hbuf` (`dd2e089` PrismaModule/ConfigModule + backend deps;
> `92df376` `/health` + prefix/CORS/ValidationPipe; `abaf1b6` WeatherModule; `4c3be1a` UsersModule
> preferences; `608b838` saved-location CRUD/reorder/set-default). All 11 §0.2 endpoints serve the
> contract shapes (`/health` outside `/api`, #7-#11 return `204`), the four §0.4 invariants hold,
> `latitude`/`longitude` serialize as JSON `number`, and `npm run build` / `npm run lint` / `npm test`
> are green across the workspace. See `docs/handoffs/Phase-3-Handoff.md`._
>
> _Normalized 2026-06-20: expanded from a thin module/provider bullet list into the pipeline's required
> shape. Verified against the repo: `apps/api` is the Phase 0 Nest scaffold — `apps/api/src/main.ts`
> ships the Nx-default `app.setGlobalPrefix('api')` (Phase 0 handoff §4 left this as-is; Phase 3 owns
> the authoritative prefix + `/health` exclusion) and there are no feature modules yet
> (`PrismaModule`/`ConfigModule`/`HealthController`/`WeatherModule`/`UsersModule` are all unwritten).
> Phase 1's `@nimbus/shared-types` and Phase 2's generated Prisma Client (`@prisma/client`, with the
> `prisma.userPreference` / `prisma.savedLocation` accessors) are landed and importable. No backend
> runtime dependencies (`@nestjs/config`, `@nestjs/axios`, `@nestjs/cache-manager`, `class-validator`,
> `class-transformer`) are installed yet — adding them is in scope here and flagged below._

**Goal.** Build the NestJS API that fulfils the full §0.2 11-endpoint REST contract, mirroring the
current .NET service layer: a global Prisma module, env-driven config, the health endpoint, the weather
module (OpenWeather primary + mock fallback, with caching), and the users module implementing the §0.4
persistence invariants. The deliverable is a server that serves every endpoint with camelCase JSON,
the `api` global prefix (health excluded), CORS for the Angular dev origin, and global request-DTO
validation — and that runs out of the box with no API key by falling back to mock weather data.

**Scope (in scope).**
- **`PrismaModule` → `PrismaService`.** A global module whose `PrismaService` extends the Phase 2
  generated `PrismaClient` and connects in `onModuleInit` (disconnects on shutdown). This is the single
  DB access point injected into the users module.
- **`ConfigModule` (`@nestjs/config`).** Typed env access for the OpenWeather key + base URL, the DB
  URL, the CORS origin, and a `UseMockWhenMissing` flag. Loaded globally so providers inject config
  rather than reading `process.env` directly.
- **`HealthController` → `GET /health`.** Returns `{ status: 'ok', service: 'nimbus-api', time: <ISO> }`
  and is **excluded** from the `api` global prefix (per §0.2 note / §4 gotcha).
- **`WeatherModule`** — `WeatherController` serving endpoints #2 (`/weather/dashboard`) and #3
  (`/weather/locations`); a `WEATHER_SERVICE` provider token bound to `OpenWeatherService` (primary)
  with a `MockWeatherService` fallback. Port the OpenWeather logic: geocoding
  (`/geo/1.0/direct` + `/geo/1.0/zip`), one-call weather (`/data/3.0/onecall?...exclude=minutely`),
  imperial/metric unit mapping, US-state-abbreviation normalization, ZIP detection (5/9-digit),
  timezone-aware time conversion, condition→Unsplash background map, and shaping into 7 hourly / 5 daily
  / 3 previews / 4 metrics with `trend` arrays. HTTP via `@nestjs/axios` or native `fetch`; caching via
  `@nestjs/cache-manager` (in-memory): **weather 10 min** keyed by `location + unitSystem`,
  **geocoding 6 hr** keyed by query. Fall back to `MockWeatherService` when the key is missing or the
  upstream call fails (the app must run key-less).
- **`UsersModule`** — `UsersController` serving endpoints #4–#11 (preferences GET/PUT; saved-location
  list/create/update/delete; set-default; reorder), backed by a Prisma-backed `PreferenceService` that
  implements the four §0.4 invariants: auto-create `UserPreference` (`unitSystem = "imperial"`) on first
  read; single-default-per-user (setting a default atomically clears the others); no duplicate
  `(userId, name, region)`; contiguous-`sortOrder` rewrite on reorder. Convert Prisma `Decimal`
  lat/lon to `number` at the response boundary so JSON matches the `LocationSuggestion` contract (§4).
- **Cross-cutting wiring.** Global `ValidationPipe` over `class-validator`/`class-transformer` request
  DTO classes that *implement* the `@nimbus/shared-types` request interfaces (no field duplication, per
  the Phase 1 handoff); CORS allowing `http://localhost:4200`; global prefix `api` excluding `health`;
  keep camelCase JSON (the JS default — do **not** add a snake_case/Pascal-case transformer).
- **Add the backend runtime dependencies** the above requires (`@nestjs/config`, the chosen HTTP
  approach, `@nestjs/cache-manager` + `cache-manager`, `class-validator`, `class-transformer`).
  **New dependencies — approval required before install** (see Decisions).

> **Constraint — backend only; types and schema are upstream.** This phase writes Nest modules,
> providers, controllers, and DTO classes in `apps/api`. It does **not** modify `libs/shared-types`
> (Phase 1, consumed read-only via `@nimbus/shared-types`) or `prisma/schema.prisma` /
> `prisma/migrations/` (Phase 2). DTO classes *implement* the shared interfaces; they do not redeclare
> the contract.

> **Constraint — contract fidelity is non-negotiable.** Endpoint paths, params, request/response JSON
> shapes, and status codes must reproduce §0.2 **1:1** (including the `204 No Content` responses for
> the mutating location endpoints and the `/health` placement outside `api`). The two non-trivial
> server rules — single default per user; contiguous `sortOrder` on reorder — are the §4-flagged
> high-risk logic; port them carefully.

> **Constraint — new dependencies require approval before install.** Adding `@nestjs/config`,
> `@nestjs/axios`/HTTP client, `@nestjs/cache-manager`, `class-validator`, and `class-transformer` is a
> cross-cutting change; present the dependency list for approval before running the install.

**Decisions needed.**
- **HTTP client — `@nestjs/axios` vs native `fetch`.** *Recommendation:* **native `fetch`** (Node 22 in
  this workspace ships a stable global `fetch`) to avoid an extra dependency and an RxJS-wrapped HTTP
  layer; reach for `@nestjs/axios` only if interceptor/retry ergonomics are wanted. Either way this is a
  **new-dependency / no-new-dependency** decision to lock before install.
- **Caching backend.** *Recommendation:* `@nestjs/cache-manager` with the **in-memory** store (mirrors
  the .NET `IMemoryCache`); the 10-min weather / 6-hr geocoding TTLs and cache keys are fixed by §0/§4.
  **New dependency — approval required.**
- **Whether to keep an in-memory `PreferenceService` fallback** (mirroring the original
  `InMemoryUserPreferenceService` "no DB configured" mode). *Recommendation:* **skip it** (low priority
  per the original bullet) — Phase 2 makes Postgres the committed persistence layer; add it later only
  if a DB-less demo mode is wanted.
- **Validation strictness / `ValidationPipe` options.** *Recommendation:* enable `whitelist` +
  `forbidNonWhitelisted` + `transform` so request bodies are coerced to the DTO classes and unknown
  fields are rejected — tightens contract fidelity without changing the JSON shape.
- **DTO ↔ shared-types binding.** *Recommendation:* request DTO **classes** in `apps/api` `implements`
  the `@nimbus/shared-types` request interfaces (`SaveLocationRequest`, etc.) and add only
  `class-validator` decorators — no field redeclaration, per the Phase 1 handoff guidance.
- _If this repo keeps ADRs, the HTTP-client choice, the caching backend, and the dependency set are the
  natural candidates to record in `docs/decisions/` before install._

**Out of scope (deferred).**
- **Angular UI / `WeatherStore` / `WeatherApiService` / proxy** — all client-side consumption of these
  endpoints is **Phase 4 (Frontend)**.
- **Running the Prisma seed** — `prisma/seed.ts` (authored in Phase 2) is executed in **Phase 5 (Dev
  workflow)**; Phase 3 may rely on a seeded or empty DB but does not run `prisma db seed`.
- **The dev `serve` ergonomics / npm `dev` script** — `nx serve api` + `nx serve web` wiring is
  **Phase 5**.
- **Automated tests** — `PreferenceService` integration tests (Testcontainers) and `OpenWeatherService`
  mocked-HTTP tests are **Phase 6 (Testing)**. Phase 3 ships the code under test and must keep
  `npm test` green, but the dedicated coverage is Phase 6.
- **Schema changes** — any new model/column/index belongs to a Phase 2-style migration (approval-gated);
  Phase 3 consumes the Phase 2 schema as-is.
- **CI / Dockerfiles** — **Phase 7 (Build & deploy)**.

**Success criteria.**
- All 11 §0.2 endpoints respond with the exact paths, params, JSON shapes, and status codes
  (`204 No Content` on the mutating location endpoints); `GET /health` returns
  `{ status: 'ok', service: 'nimbus-api', time: <ISO> }` and sits **outside** the `api` prefix.
- `GET /api/weather/dashboard?location=San%20Francisco,%20CA&unitSystem=imperial&userId=anonymous`
  returns a full `WeatherDashboard` (mock data when `OPENWEATHER_API_KEY` is absent), with 7 hourly /
  5 daily / 3 previews / 4 metrics and sparkline `trend` arrays.
- The four §0.4 invariants hold: first preferences read auto-creates an `imperial` row; setting a
  default clears it on the others; a duplicate `(userId, name, region)` is rejected; reorder rewrites
  `sortOrder` contiguously. Saved-location `latitude`/`longitude` serialize as JSON `number`, not
  Prisma `Decimal`.
- CORS allows `http://localhost:4200`; the global `ValidationPipe` rejects malformed request bodies;
  JSON keys stay camelCase (no transformer added).
- `npm run build` / `npm run lint` / `npm test` are green across the workspace.

**Enumerated task split** — `S` · 5 task docs (phase-3 PrismaModule + ConfigModule + dependency install; phase-3 HealthController + global prefix/`api` exclusion + CORS + global ValidationPipe; phase-3 WeatherModule — OpenWeather + Mock + caching, endpoints #2/#3; phase-3 UsersModule — preferences endpoints #4/#5 + `PreferenceService` invariants; phase-3 UsersModule — saved-location CRUD/reorder/default endpoints #6–#11).
1. **`PrismaModule` + `ConfigModule` + backend dependencies.** Add the approved runtime deps; create
   the global `PrismaModule`/`PrismaService` (extends the Phase 2 `PrismaClient`, connects in
   `onModuleInit`) and the global `ConfigModule` (OpenWeather key/base URL, DB URL, CORS origin,
   `UseMockWhenMissing`). Verifiable: the app boots, injects both, and `npm run build`/`lint`/`test`
   stay green.
2. **App-shell cross-cutting: health, prefix, CORS, validation.** Author `HealthController`
   (`GET /health`) and wire the authoritative global prefix `api` **excluding** `health`, CORS for
   `http://localhost:4200`, and the global `ValidationPipe` in `main.ts`. Verifiable: `/health` returns
   the §0.2 body outside the `api` prefix and an unknown-field request body is rejected.
3. **`WeatherModule` — OpenWeather + Mock + caching (endpoints #2, #3).** Implement `WeatherController`,
   the `WEATHER_SERVICE` token, `OpenWeatherService` (geocoding + one-call, unit/ZIP/timezone handling,
   condition→Unsplash map, 7/5/3/4 shaping with `trend` arrays), `MockWeatherService` fallback, and the
   in-memory cache TTLs. Verifiable: `/api/weather/dashboard` and `/api/weather/locations` return
   contract-shaped JSON, key-less requests fall back to mock data, and a cache hit returns the same
   payload.
4. **`UsersModule` — preferences (endpoints #4, #5) + `PreferenceService` core.** Implement the
   Prisma-backed `PreferenceService` with auto-create-on-first-read, plus `GET`/`PUT`
   `/api/users/{userId}/preferences`. Verifiable: first read creates an `imperial` row; `PUT` updates
   the unit system and returns the `UserPreferences` shape.
5. **`UsersModule` — saved-location CRUD, reorder, set-default (endpoints #6–#11).** Implement list
   (ordered by `sortOrder`), create, update, delete, set-default, and reorder — enforcing
   single-default-per-user, `(userId, name, region)` dedupe, and contiguous-`sortOrder` rewrite, with
   `Decimal`→`number` conversion at the boundary and `204 No Content` responses. Verifiable: all six
   endpoints honour the invariants and return the §0.2 status codes/shapes.

### Phase 4 — Frontend (Angular) (3–4 days)

> _**Shipped 2026-06-21.** Closed out after Tasks 4-1…4-6 landed on `main`
> (`f09f5ae` `WeatherApiService` + `HttpClient` + `environment.ts` + dev proxy; `a4f1d32` signals
> `WeatherStore` + RxJS debounced search + boot sequence; `67039c7` reusable icon/sparkline/metric
> components + global styles; `c91a25e` shell + sidebar tree; `af962dd` topbar tree; `7a54140`
> dashboard tree). The full Angular 21 frontend renders in `apps/web` with the source DOM/class names
> ported verbatim, a signals `WeatherStore` over `@nimbus/shared-types`, a `WeatherApiService`
> covering all 11 §0.2 endpoints (`provideHttpClient()` registered), the 250 ms debounced search, the
> ~1,148-line `styles.scss` port, `lucide-angular` v1.0.0 icons, and the "Nimbus Weather" title +
> CloudLightning `favicon.svg`. `apps/web/proxy.conf.json` forwards `/api` + `/health` to `:3000`
> (wired via `serve.configurations.development`). `npm run build` / `npm run lint` / `npm test` are
> green across the workspace. See `docs/handoffs/Phase-4-Handoff.md`. The historical plan is preserved
> below._
>
> _Normalized 2026-06-20: expanded from a thin component/state bullet list into the pipeline's required
> shape. Verified against the repo: `apps/web` is the Phase 0 Angular **standalone** scaffold — `src/main.ts`
> bootstraps `App` via `bootstrapApplication`, `src/app/app.config.ts` provides **only**
> `provideBrowserGlobalErrorListeners()` (no `provideHttpClient` yet), `src/app/app.ts` is the Nx-welcome
> placeholder (`title = 'web'`, imports `NxWelcome`), `src/styles.scss` is an empty placeholder comment,
> `src/index.html` carries `<title>web</title>` and `href="favicon.ico"`, and `apps/web/public/favicon.ico`
> is the Nx default. **There is no `proxy.conf.json`, no `environment.ts`, and the `serve` target in
> `apps/web/project.json` has no `proxyConfig`** — all of that is Phase 4's to add. Phase 1's
> `@nimbus/shared-types` is landed and importable from `apps/web` (Phase 1 handoff). **Phase 3 (Backend)
> is in flight, not yet shipped** — `docs/tasks/Tasks-3-*`/`Impl-3-*` exist but there is no
> `docs/handoffs/Phase-3-Handoff.md`; Phase 4 depends on the Phase 3 API serving the §0.2 contract on
> `http://localhost:3000` and should sequence after it lands. `rxjs ~7.8.0` and `@angular/common`
> (which provides `HttpClient`) are already in `package.json`; `lucide-angular` is **not** installed._

**Goal.** Rebuild the Nimbus dashboard UI in `apps/web` by decomposing the source app's monolithic
`App.vue` into Angular **standalone components** — preserving **identical DOM structure and class
names** so the ported `styles.css` reproduces a near-pixel-identical, dark-only UI — wired to a
signals-based `WeatherStore` and an `HttpClient`-based `WeatherApiService` that consumes all 11 §0.2
endpoints. The deliverable is a running `nx serve web` (4200) that, against the Phase 3 API (3000),
exercises every §0.1 user-visible behavior: debounced search, current-conditions hero, previews,
hourly/daily forecasts, metric cards with sparklines, save/reorder/default/delete saved locations, and
the persisted °F/°C toggle.

**Scope (in scope).**
- **Component decomposition (identical DOM + class names).** Port `App.vue` into standalone components,
  reproducing the source markup and class names verbatim so the ported CSS applies unchanged:
  - **Shell:** `SidebarComponent` → `BrandComponent`, `NavListComponent`, `SavedLocationsComponent`
    (select / move up·down / set-default / delete), `PremiumCardComponent`, `ThemeToggleComponent`
    (cosmetic dark-only toggle, replicate as-is per §0.1).
  - **Topbar:** `TopbarComponent` → `SearchBoxComponent` (suggestions dropdown), `UnitSwitchComponent`
    (°F/°C), `ProfileClusterComponent` (static "Alex Morgan / Premium" + notifications bell, §0.1).
  - **Dashboard:** `DashboardComponent` → `HeroWeatherComponent` (hero card + save star/plus +
    per-condition background), `PreviewRowComponent` (3-card carousel + dot indicators),
    `HourlyPanelComponent` (7 hours, first "Now"), `ForecastPanelComponent` (5-day list + range bar),
    `MetricStackComponent`.
  - **Reusable:** `MetricCardComponent`; `WeatherIconComponent` (condition → lucide icon map:
    rain→CloudRain, partly cloud→CloudSun, cloud→Cloud, night/clear→Moon, default→Sun);
    `SparklineComponent` (hand-rolled inline SVG, 132×46 viewBox, `line` + `bars` variants, per §0.5).
- **State — `WeatherStore` service (Angular signals).** Mirror the `App.vue` reactive state as signals:
  `dashboard`, `loading`, `error`, `search`, `unitSystem`, `suggestions`, `savedLocations`,
  `searchFocused`, `savingLocation`, `updatingLocationId`; `computed` for `activeLocation`,
  `activeSavedLocation`, `showSuggestions`, and the formatted-date helpers. Port the handlers exactly:
  `loadDashboard`, `loadPreferences`, `loadSavedLocations`, `changeUnits`, `chooseLocation`,
  `saveActiveLocation`, `removeSavedLocation`, `makeDefaultLocation`, `moveSavedLocation`, plus the
  `onMounted` boot sequence (load prefs → load saved → pick default/first → load dashboard). State is
  typed against `@nimbus/shared-types` (no field redeclaration).
- **API service — `WeatherApiService` (`HttpClient`).** A direct port of `weatherApi.ts`: one method per
  §0.2 endpoint (#1–#11), `userId = 'anonymous'`, request/response bodies typed via
  `@nimbus/shared-types`. Register `provideHttpClient()` in `app.config.ts` (currently only
  `provideBrowserGlobalErrorListeners()`). **No new dependency** — `HttpClient` ships in
  `@angular/common`, already installed.
- **Search debounce (RxJS).** A `Subject` (or `toObservable(searchSignal)`) →
  `debounceTime(250)` → `switchMap(searchLocations)` honoring the 250 ms / 2-char-minimum behavior.
  **No new dependency** — `rxjs ~7.8.0` is already in `package.json`.
- **Styling + assets.** Port the source `styles.css` (~1,150 lines, §0.5) into
  `apps/web/src/styles.scss` (the global stylesheet already wired in `apps/web/project.json` `styles`),
  preserving the §0.5 design tokens (dark-only, `#020713`/`#f4f8ff`, accent blues, `.app-shell` grid,
  the 1500/980/640px breakpoints). Replace the Nx-welcome `App` placeholder with the real shell.
  Use `lucide-angular` for icons. Add the CloudLightning `favicon.svg` to `apps/web/public` and set the
  `index.html` `<title>` to **"Nimbus Weather"** (currently `web`) and the favicon link accordingly.
- **Env / proxy.** Add `apps/web/src/environments/environment.ts` exposing `apiBaseUrl`, and an
  `apps/web/proxy.conf.json` forwarding `/api` **and** `/health` to `http://localhost:3000` (replacing
  the original Vite proxy); wire it via `proxyConfig` on the `serve` target in `apps/web/project.json`
  (per §4 CORS/ports note: Angular 4200 → Nest 3000).
- **Add the `lucide-angular` icon dependency.** **New dependency — approval required before install**
  (see Decisions; it is not in `package.json`).

> **Constraint — frontend only; contract + API are upstream.** This phase writes Angular components,
> the `WeatherStore`, `WeatherApiService`, styles, and proxy/env config in `apps/web`. It does **not**
> modify `libs/shared-types` (Phase 1, consumed read-only via `@nimbus/shared-types`),
> `prisma/schema.prisma` (Phase 2), or `apps/api` (Phase 3). It consumes the §0.2 contract as served by
> the Phase 3 backend.

> **Constraint — DOM/class fidelity is load-bearing.** The faithful clone depends on reproducing the
> source DOM structure and class names **verbatim** so the lifted `styles.css` applies unchanged (§0.5).
> Renaming classes or restructuring markup breaks the near-pixel-identical result and is out of bounds.

> **Constraint — new dependency requires approval before install.** Adding `lucide-angular` is a
> cross-cutting change; present it for approval before running the install. (`HttpClient` via
> `@angular/common` and `rxjs` are already present — no approval needed for those.)

**Decisions needed.**
- **Search wiring — RxJS `Subject` vs `toObservable(searchSignal)`.** *Recommendation:* a dedicated
  RxJS `Subject` piped through `debounceTime(250)` → `switchMap` — it keeps the 2-char-minimum guard and
  in-flight cancellation explicit and matches the source `weatherApi.ts` behavior; reach for
  `toObservable` only if the search input is already signal-bound. No new dependency either way.
- **`lucide-angular` as the icon library.** *Recommendation:* **`lucide-angular`** — it is the §0.5/§3
  mapped equivalent of the source `lucide-vue-next` (identical glyph set), so the icon map ports 1:1.
  **New dependency — approval required before install.**
- **Where `environment.ts` / proxy live and how `apiBaseUrl` is consumed.** *Recommendation:* put the
  env file under `apps/web/src/environments/` and have `WeatherApiService` read `apiBaseUrl` (default
  `''` so same-origin requests hit the dev proxy); the proxy forwards `/api` + `/health` to `:3000`. In
  prod the nginx config (Phase 7) plays the proxy's role.
- **`provideHttpClient` configuration.** *Recommendation:* plain `provideHttpClient()` in
  `app.config.ts` (no interceptors needed — `userId = 'anonymous'` is a route/param concern, not auth).
- _If this repo keeps ADRs, the `lucide-angular` dependency choice and the search-debounce wiring are the
  natural candidates to record in `docs/decisions/` (currently empty) before install._

**Out of scope (deferred).**
- **Backend / API** — every endpoint this UI calls is implemented in **Phase 3 (Backend, NestJS)**;
  Phase 4 consumes the §0.2 contract, it does not build it.
- **Dev `serve` ergonomics / npm `dev` script** — the combined `nx serve api` + `nx serve web` /
  `nx run-many -t serve` wiring and the npm `dev` script are **Phase 5 (Dev workflow)**. Phase 4 adds the
  `proxyConfig` the dev server needs, but not the orchestration script.
- **Component / store tests** — `TestBed` specs (e.g. `WeatherIconComponent` condition→icon mapping,
  `WeatherStore` handler behavior) are **Phase 6 (Testing)**. Phase 4 ships the code under test and must
  keep `npm test` green, but the dedicated coverage is Phase 6.
- **Contract / shared types** — `@nimbus/shared-types` is **Phase 1**, consumed read-only here; Phase 4
  adds no types to the shared lib.
- **Docker / nginx / CI** — building the static `dist`, the nginx image proxying `/api` + `/health`, and
  GitHub Actions are **Phase 7 (Build & deploy)**.

**Success criteria.**
- `npm run build` / `npm run lint` / `npm test` are green across the workspace with the new `apps/web`
  components, `WeatherStore`, and `WeatherApiService` in place (the Nx-welcome placeholder removed).
- `nx serve web` (4200) against the Phase 3 API (`nx serve api`, 3000) renders the full dashboard, and
  the §5 end-to-end UI flows pass: search a city → see debounced suggestions (250 ms, ≥2 chars); save a
  location; reorder it (move up/down); set it default (star); delete it; toggle °F/°C and confirm the
  preference **persists across a reload** (round-trips endpoints #4/#5).
- `WeatherApiService` exposes one method per §0.2 endpoint (#1–#11) with `userId = 'anonymous'`, typed
  via `@nimbus/shared-types`; `provideHttpClient()` is registered in `app.config.ts`.
- The ported `apps/web/src/styles.scss` reproduces the §0.5 design system (dark-only, the documented
  tokens, the 1500/980/640px responsive breakpoints) on the cloned DOM/class names; the result is a
  near-pixel match to the source (compare to the §5 QA screenshots `qa-desktop.png` / `qa-tablet.png`
  / `qa-mobile.png` / `qa-search.png`).
- `index.html` shows the title **"Nimbus Weather"** with the CloudLightning `favicon.svg`; `lucide-angular`
  renders the condition icons per the `WeatherIconComponent` map; the `SparklineComponent` renders the
  132×46 `line`/`bars` SVG variants.
- `apps/web/proxy.conf.json` forwards `/api` and `/health` to `http://localhost:3000` and is wired via
  the `serve` target's `proxyConfig`; `environment.ts` exposes `apiBaseUrl`.

**Enumerated task split** — `L` · 6 task docs (phase-4 `WeatherApiService` + `provideHttpClient` + `environment.ts`/`proxy.conf.json`; phase-4 `WeatherStore` signals state + RxJS search debounce; phase-4 shell/sidebar component tree; phase-4 topbar component tree; phase-4 dashboard component tree; phase-4 reusable components + global `styles.scss`/`lucide-angular`/favicon+title).
1. **`WeatherApiService` + HttpClient + env/proxy.** Register `provideHttpClient()` in `app.config.ts`;
   port `weatherApi.ts` into `WeatherApiService` (one method per §0.2 endpoint #1–#11, `userId =
   'anonymous'`, typed via `@nimbus/shared-types`); add `apps/web/src/environments/environment.ts`
   (`apiBaseUrl`) and `apps/web/proxy.conf.json` forwarding `/api` + `/health` to `:3000`, wired via the
   `serve` target's `proxyConfig`. Verifiable: each endpoint method resolves the shared types, the dev
   proxy forwards both prefixes to the API, and `npm run build`/`lint`/`test` stay green.
2. **`WeatherStore` signals state + search debounce.** Implement the signals (`dashboard`, `loading`,
   `error`, `search`, `unitSystem`, `suggestions`, `savedLocations`, `searchFocused`, `savingLocation`,
   `updatingLocationId`), the computeds (`activeLocation`, `activeSavedLocation`, `showSuggestions`,
   date helpers), the handlers (`loadDashboard`/`loadPreferences`/`loadSavedLocations`/`changeUnits`/
   `chooseLocation`/`saveActiveLocation`/`removeSavedLocation`/`makeDefaultLocation`/`moveSavedLocation`),
   the `onMounted` boot sequence, and the RxJS `debounceTime(250)` → `switchMap` search (≥2 chars).
   Verifiable: the boot sequence loads prefs → saved → default/first → dashboard, and search emits at
   most one request per 250 ms for queries ≥2 chars.
3. **Shell / sidebar component tree.** `SidebarComponent` → `BrandComponent`, `NavListComponent`,
   `SavedLocationsComponent` (select/move/default/delete bound to the store), `PremiumCardComponent`,
   `ThemeToggleComponent` (cosmetic), reproducing the source DOM + class names. Verifiable: the sidebar
   renders against the store, the saved-location actions invoke the store handlers, and the lifted CSS
   applies unchanged.
4. **Topbar component tree.** `TopbarComponent` → `SearchBoxComponent` (suggestions dropdown bound to
   the debounced search), `UnitSwitchComponent` (°F/°C → `changeUnits`), `ProfileClusterComponent`
   (static "Alex Morgan / Premium" + bell), reproducing DOM/class names. Verifiable: typing in the
   search box surfaces suggestions and selecting one calls `chooseLocation`; the unit switch round-trips
   preferences.
5. **Dashboard component tree.** `DashboardComponent` → `HeroWeatherComponent` (hero + save star/plus +
   per-condition background), `PreviewRowComponent` (3-card carousel + dots), `HourlyPanelComponent`
   (7 hours, first "Now"), `ForecastPanelComponent` (5-day list + range bar), `MetricStackComponent`,
   reproducing DOM/class names. Verifiable: a loaded `WeatherDashboard` renders all five panels with the
   correct counts (7 hourly / 5 daily / 3 previews / 4 metrics) and the save button calls
   `saveActiveLocation`.
6. **Reusable components + global styles/assets.** `MetricCardComponent`, `WeatherIconComponent`
   (condition→lucide map), `SparklineComponent` (132×46 `line`/`bars` SVG); port `styles.css` into
   `apps/web/src/styles.scss`; install/wire `lucide-angular` (**approval required**); add the
   `favicon.svg` and set the `index.html` title to "Nimbus Weather". Verifiable: the design tokens and
   breakpoints from §0.5 render correctly, icons resolve via the mapping, sparklines draw both variants,
   and the document title/favicon match.

### Phase 5 — Dev workflow (½ day)

> _Normalized 2026-06-22: expanded from a thin three-bullet stub into the pipeline's required shape.
> **Verified against the repo at time of writing:**_
> - _`docker-compose.yml` **already exists** (authored in Phase 0) with a single `db` service —
>   `image: postgres:16`, user/password/db all `nimbus`, port `5432:5432`, a `postgres_data` named
>   volume, and a `pg_isready` healthcheck. **No new compose authoring is required** — Phase 5 verifies
>   it and runs `prisma migrate` against it._
> - _`.env.example` **already documents all five variables** — `DATABASE_URL`
>   (`postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`, matching the compose credentials),
>   `OPENWEATHER_API_KEY` (blank, with the mock-fallback note), `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`,
>   and `PORT=3000`. The Phase 3 handoff already added `OPENWEATHER_BASE_URL` + `CORS_ORIGIN`; the
>   `DATABASE_URL` entry is present. So `.env.example` work is **confirm-and-reconcile**, not authoring._
> - _`prisma/seed.ts` is the Phase 2 **stub** (empty `main()`, commented `anonymous` upsert) and
>   `package.json` already carries `prisma.seed = "ts-node prisma/seed.ts"`; the seed has **not** been run._
> - _`prisma/migrations/20260620144720_init/migration.sql` (the Phase 2 `init` migration) is committed._
> - _`package.json` `scripts` are **only** `build`/`lint`/`test`, each `nx run-many -t <target>` — there
>   is **no `dev` script**, and **no `concurrently` dependency** (the established pattern is `nx run-many`)._
> - _`apps/web/proxy.conf.json` forwards `/api` + `/health` to `http://localhost:3000` (Phase 4), but per
>   the Phase 4 handoff §6 it was **never exercised at runtime** — confirming the proxy end-to-end is a
>   Phase 5 deliverable._
> - _Phases 1–4 are shipped on `main`; the API + frontend are code-complete. Phase 5 is pure dev-workflow
>   ergonomics + a first end-to-end local boot — **no `apps/`, `libs/`, `prisma/schema.prisma`, or
>   migration changes**._

**Goal.** Make the full stack boot locally with one (or two) commands and confirm it runs end-to-end:
add an npm `dev` script that serves the NestJS API (3000) and the Angular app (4200) together, run the
committed Phase 2 migration against the Phase 0 `docker-compose` Postgres `db` service to prove it
applies cleanly, run (or deliberately defer) the Phase 2 seed stub, reconcile `.env.example` as the
single documented source of every env var, and verify the Phase 4 dev proxy forwards `/api` + `/health`
to the API at runtime. The deliverable is a documented, repeatable local-dev loop — **no application
code, schema, or migration changes**.

**Scope (in scope).**
- **Add an npm `dev` script.** A `package.json` `"dev"` script that serves `apps/api` (3000) and
  `apps/web` (4200) together, following the established `nx run-many` pattern already used by
  `build`/`lint`/`test` (e.g. `nx run-many -t serve` or `nx run-many -t serve -p api web`). No new
  dependency (see Decisions — `concurrently` is **not** added).
- **Confirm the local Postgres comes up.** `docker compose up -d` (the existing `db` service:
  `postgres:16`, `nimbus`/`nimbus`/`nimbus`, `5432`, `postgres_data` volume, `pg_isready` healthcheck).
  Verify the container reports healthy. **No compose edits** — the service already exists from Phase 0.
- **Apply the Phase 2 migration against the live DB.** Run the chosen `prisma migrate` command (see
  Decisions) against the `docker-compose` Postgres so `prisma/migrations/20260620144720_init/` applies
  cleanly and `npx prisma migrate status` reports the one migration applied with **no drift**.
- **Run or defer the seed (decision below).** The Phase 2 `prisma/seed.ts` stub + `package.json`
  `prisma.seed` hook are wired; Phase 2 explicitly deferred *execution* to Phase 5. Either run
  `npx prisma db seed` (the stub is a no-op today) or document why it stays unrun — make the call
  explicit either way.
- **Reconcile `.env.example` as the single documented source.** Confirm `.env.example` documents all
  five vars (`DATABASE_URL`, `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, `PORT`) with
  the `DATABASE_URL` credentials matching the compose `db` service and the no-key mock-fallback note
  present. This is **confirm/tidy**, not authoring — the file already carries all five (per the §
  verification note); fix only genuine gaps or drift against `docker-compose.yml`.
- **Verify the dev proxy end-to-end (Phase 4 carry-through).** With the `dev` script running, confirm
  `apps/web/proxy.conf.json` forwards `/api` (e.g. `/api/weather/dashboard`) **and** `/health` from the
  Angular dev server (4200) to the API (3000) — the runtime check the Phase 4 handoff §6 flagged as
  unperformed.
- **Document the local-dev loop.** A short, accurate "run it locally" note (where it lives — README or
  `CLAUDE.md` "Commands" — is a decision below) covering: `docker compose up -d` → migrate → `npm run
  dev`, and the no-key mock-data behavior.

> **Constraint — dev-workflow ergonomics only; no app/schema changes.** This phase touches
> `package.json` (the `dev` script), `.env.example` (reconcile only), and a docs/run-it-locally note.
> It writes **no** code in `apps/api`, `apps/web`, or `libs/shared-types`, and **no** changes to
> `prisma/schema.prisma` or `prisma/migrations/` (those are read-only from Phases 2–4). Running
> `prisma migrate`/`db seed` *applies* the existing migration/seed — it does not author new ones.

> **Constraint — `migrate dev` vs `migrate deploy` is a local-vs-deploy choice (Decision below).**
> Use `migrate dev` for the local developer loop; `migrate deploy` is the Phase 7 container-startup
> path. Do not introduce a *new* migration here — the `init` migration is already committed; this phase
> only applies it.

**Decisions needed.**
- **`dev` script mechanism — `nx run-many -t serve` vs `concurrently`.** *Recommendation:*
  **`nx run-many -t serve` (no new dependency).** It matches the existing `build`/`lint`/`test` scripts
  (all `nx run-many`), and Nx already runs targets in parallel with interleaved, labelled output — so
  `concurrently` would add a dependency for capability Nx already provides. Use
  `"dev": "nx run-many -t serve"` (or `-p api web` to pin the two projects). Reach for `concurrently`
  only if non-Nx processes need orchestrating, which they do not here.
- **`migrate dev` vs `migrate deploy` for local setup.** *Recommendation:* **`npx prisma migrate dev`**
  for the documented local loop — it applies pending migrations, regenerates the client, and warns on
  drift, which is what a developer wants on first checkout. Reserve `migrate deploy` (no client
  regen, no dev prompts) for the Phase 7 container entrypoint (`api` Dockerfile runs `migrate deploy`).
  Document both: `migrate dev` here, `migrate deploy` as the deploy-time note pointing forward to Phase 7.
- **Run the seed or leave it stubbed.** *Recommendation:* **wire `npm run dev` to assume an empty DB and
  leave the seed unrun, but verify `npx prisma db seed` executes cleanly** (the stub is a no-op so it is
  safe to run). The Phase 3 §0.4 `getPreferences` auto-creates the `anonymous` `imperial` row on first
  read, so the app needs **no** seeded data to boot and exercise every flow; running the (empty) seed
  buys nothing today. Document that the seed hook exists and `db seed` is the entrypoint if a starter
  row is wanted later (e.g. Phase 6 fixtures). Leave `prisma/seed.ts` as the stub — **do not author seed
  data here** (that would be a content decision beyond dev-workflow scope).
- **Docker Compose vs bare Postgres for local dev.** *Recommendation:* **Docker Compose `db` service**
  (already present) — one command (`docker compose up -d`) brings up a pinned `postgres:16` with the
  exact credentials `.env.example`'s `DATABASE_URL` expects, so no developer needs a system Postgres.
  This is effectively already decided by Phase 0; Phase 5 just adopts it as *the* documented path.
- **Where the "run it locally" note lives.** *Recommendation:* the repo's `CLAUDE.md` already has a
  **Commands** section listing `nx serve api`/`nx serve web`; fold the `dev` script + `docker compose up
  -d` + `migrate dev` steps in there (and/or the README). Pick one canonical home to avoid drift.
  **Editing `CLAUDE.md` is a conventions-doc edit — confirm before applying.**

**Out of scope (deferred).**
- **Production build / Dockerfiles / nginx / CI** — `nx build web`/`nx build api`, the `api` Dockerfile
  (`migrate deploy` then start), the `web` nginx image, the `db`+`api`+`web` prod compose, and GitHub
  Actions are **Phase 7 (Build & deploy)**. Phase 5 is the *local dev* loop only.
- **Authoring seed data** — `prisma/seed.ts` stays the Phase 2 stub; writing real seed content (sample
  saved locations, etc.) is not in scope. Running the existing (no-op) seed to prove the hook works is
  in scope; *adding rows* is not.
- **New migrations / schema changes** — the `init` migration is applied, not modified; any schema change
  is an approval-gated Phase 2-style migration, not a Phase 5 concern.
- **Automated tests (incl. the Testcontainers DB)** — `PreferenceService` integration tests against a
  disposable Postgres and the `OpenWeatherService` mocked-HTTP tests are **Phase 6 (Testing)**. Phase 5
  keeps `npm test` green but adds no specs; the dev `db` service is for *manual* local runs, not the
  test harness.
- **Application / contract / UI code** — `apps/api`, `apps/web`, and `libs/shared-types` are consumed
  as-shipped from Phases 1–4; Phase 5 changes none of them.

**Success criteria.**
- `package.json` has a `dev` script that brings up **both** servers — `nx serve api` on 3000 and
  `nx serve web` on 4200 — in one invocation (`npm run dev`), with no new runtime/dev dependency added
  (no `concurrently` in `package.json`).
- `docker compose up -d` brings the `db` service to a healthy state, and `npx prisma migrate dev`
  applies the committed `init` migration cleanly — `npx prisma migrate status` reports **1 migration
  applied, no drift** against the `docker-compose` Postgres.
- The seed decision is executed and documented: either `npx prisma db seed` runs cleanly (no-op stub)
  or the entry records why it stays unrun, and the `prisma.seed` hook is confirmed wired.
- With `npm run dev` running, the Phase 4 proxy is confirmed end-to-end: a request to
  `http://localhost:4200/api/weather/dashboard?location=San%20Francisco,%20CA&unitSystem=imperial&userId=anonymous`
  returns a full `WeatherDashboard` (mock data with no `OPENWEATHER_API_KEY`), and
  `http://localhost:4200/health` returns the §0.2 health body — both proxied to `:3000`.
- `.env.example` is confirmed to document all five vars with `DATABASE_URL` matching the compose `db`
  credentials and the no-key mock-fallback note present (gaps/drift fixed; no spurious rewrite).
- The local-dev loop is documented in one canonical place (`CLAUDE.md` Commands and/or README):
  `docker compose up -d` → `npx prisma migrate dev` → `npm run dev`, plus the no-key mock-data note.
- `npm run build` / `npm run lint` / `npm test` stay green (the `dev` script and any docs edits
  introduce no regressions).

**Enumerated task split** — `S` · 2 task docs (phase-5 npm `dev` script + `.env.example` reconcile + local-dev docs note; phase-5 local DB bring-up — `migrate dev` + seed decision + end-to-end proxy verification).
1. **`dev` script + `.env.example` reconcile + local-dev docs.** Add the `package.json` `"dev"` script
   (`nx run-many -t serve`, no new dependency); reconcile `.env.example` against `docker-compose.yml`
   (confirm all five vars, `DATABASE_URL` credentials match the `db` service, mock-fallback note
   present — fix only genuine drift); document the `docker compose up -d` → `migrate dev` → `npm run dev`
   loop in the chosen canonical doc (**`CLAUDE.md` edit confirmed before applying**). Verifiable:
   `npm run dev` is defined and starts both servers, `.env.example` matches the compose credentials,
   and the run-it-locally note is present; `npm run build`/`lint`/`test` stay green.
2. **Local DB bring-up, migration apply, seed decision, and end-to-end proxy check.** `docker compose
   up -d` to a healthy `db`; `npx prisma migrate dev` to apply the committed `init` migration
   (`migrate status` → 1 applied, no drift); execute the seed decision (run the no-op `db seed` or
   document the deferral); then with `npm run dev` up, confirm the Phase 4 proxy forwards
   `/api/weather/dashboard` (full `WeatherDashboard`, mock data key-less) **and** `/health` from 4200 to
   the API on 3000. Verifiable: `migrate status` is clean, the seed call is resolved, and both proxied
   routes return their §0.2 shapes.

### Phase 6 — Testing (1–2 days)
Port the existing xUnit coverage to **Jest** (the Nx default):
- **`PreferenceService` integration tests** against a disposable Postgres via **Testcontainers** (or a dedicated test DB): default-prefs creation, unit update, dedupe `(userId, name, region)`, single-default invariant, delete, reorder.
- **`OpenWeatherService` tests** with mocked HTTP (`nock` or a jest fetch mock — the equivalent of the current `StubHttpMessageHandler`): imperial vs metric mapping, daily mapping, ZIP search, API-failure fallback, missing-key fallback, cache-hit returns the same object.
- **Angular:** `TestBed` component specs — e.g. `WeatherIconComponent` condition→icon mapping, and `WeatherStore` handler behavior.

### Phase 7 — Build & deploy (1 day)
- `nx build web` (static `dist`) and `nx build api` (Node bundle).
- Dockerfiles: `api` (`node:20-alpine`, runs `prisma migrate deploy` then starts Nest); `web` (nginx serving the Angular `dist`, proxying `/api` + `/health` to the api service). `docker-compose.yml` ties `db` + `api` + `web` together.
- CI (GitHub Actions): install → lint → test → build on every PR. (The original repo has no CI — this is a free upgrade.)

---

## 3. Concept mapping

| Vue / .NET concept | Angular / Nest equivalent |
|--------------------|---------------------------|
| `ref` / `computed` / `watch` | `signal` / `computed` / `effect` (+ RxJS `debounceTime` for search) |
| `<script setup>` SFC | standalone component (`.ts` + `.html` + `.scss`) |
| `fetch` in `weatherApi.ts` | `HttpClient` in `WeatherApiService` |
| Vite proxy / `VITE_API_BASE_URL` | `proxy.conf.json` / `environment.ts` |
| .NET DI + `IWeatherForecastService` | Nest module + provider token `WEATHER_SERVICE` |
| .NET `IUserPreferenceService` | Nest `PreferenceService` (Prisma-backed) |
| EF Core `DbContext` + migrations | Prisma `schema.prisma` + `prisma migrate` |
| SQL Server | PostgreSQL |
| `IMemoryCache` | `@nestjs/cache-manager` (in-memory store) |
| xUnit + SQLite-in-memory | Jest + Testcontainers Postgres |
| `lucide-vue-next` | `lucide-angular` |

---

## 4. Risks / gotchas
- **OpenWeather One Call 3.0** requires a subscribed API key. The mock fallback must work key-less so the app runs out of the box (just like today).
- **Decimal lat/lon:** Prisma returns `Decimal` objects for `@db.Decimal` columns — convert to `number` at the API boundary so the JSON matches the `LocationSuggestion` contract.
- **Health route placement:** `/health` must sit **outside** the `api` global prefix.
- **camelCase JSON:** JS serializes camelCase by default, so the contract is *easier* to hit than in .NET — just don't introduce a transformer that snake_case/PascalCases keys.
- **The two invariants** (single default per user; contiguous `sortOrder` on reorder) are the only non-trivial server logic. Port them carefully and cover them with tests.
- **CORS / ports** differ from the original (Vue 5173 / .NET 5078 → Angular 4200 / Nest 3000) — update the proxy and CORS origins accordingly.

---

## 5. Verification (end-to-end)
1. `docker compose up -d db` → `npx prisma migrate dev`.
2. `nx serve api` → `curl http://localhost:3000/health` returns `ok`; `GET /api/weather/dashboard?location=San%20Francisco,%20CA&unitSystem=imperial&userId=anonymous` returns a full dashboard (mock data if no API key is set).
3. `nx serve web` → open `http://localhost:4200` and exercise the flows: search a city and see suggestions; save a location; reorder it; set it default; delete it; toggle °F/°C and confirm the preference persists across a reload.
4. `nx run-many -t test` is green (backend + frontend).
5. Visual diff against the original QA screenshots (`qa-desktop.png`, `qa-tablet.png`, `qa-mobile.png`, `qa-search.png`) — the result should be near-identical.

---

## 6. New repository creation
- `npx create-nx-workspace@latest nimbus-weather …`, then `cd nimbus-weather` and `git init` (Nx may init git for you).
- `gh repo create <owner>/nimbus-weather --private --source=. --remote=origin` then `git push -u origin main`.
- Add `.env` to `.gitignore`; commit `.env.example` and this `RoadMap-MEAN.md`.
