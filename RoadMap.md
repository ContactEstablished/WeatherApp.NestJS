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
- `npx create-nx-workspace@latest nimbus-weather --preset=apps` (integrated monorepo).
- Add plugins `@nx/angular` and `@nx/nest`. Generate `apps/web` (Angular, standalone components, SCSS) and `apps/api` (Nest).
- Generate `libs/shared-types`. Add Prisma: `npm i -D prisma`, `npm i @prisma/client`, `npx prisma init`.
- Create `docker-compose.yml` with a `postgres:16` service, and `.env` (`DATABASE_URL`, `OPENWEATHER_API_KEY`, `PORT=3000`).

### Phase 1 — Shared contract (`libs/shared-types`) (½ day)
- Copy the §0.3 interfaces verbatim. Add request DTO types: `UpdatePreferencesRequest`,
  `SaveLocationRequest`, `UpdateSavedLocationRequest`, `ReorderSavedLocationsRequest`.
- Export a barrel (`index.ts`). Both `apps/web` and `apps/api` import from `@nimbus/shared-types`.

### Phase 2 — Database + Prisma (½ day)
- Author `prisma/schema.prisma` per §0.4 (`@@unique([userId, name, region])`, `@@index([userId, sortOrder])`, `@db.Decimal(9,6)` lat/lon, `now()`/`@updatedAt` timestamps).
- `npx prisma migrate dev --name init`, then `npx prisma generate`. (This mirrors the two existing EF migrations: `InitialCreate` + `AddSavedLocationSortOrder`.)

### Phase 3 — Backend (NestJS) (2–3 days)
Module/provider layout mirrors the current .NET service layer:

- **PrismaModule** → `PrismaService` (extends `PrismaClient`, connects in `onModuleInit`). Global module.
- **ConfigModule** (`@nestjs/config`) for env: OpenWeather key + base URL, DB URL, CORS origin, `UseMockWhenMissing`.
- **HealthController** → `GET /health` returning `{ status: 'ok', service: 'nimbus-api', time: <ISO> }`. **Excluded** from the `api` global prefix.
- **WeatherModule**
  - `WeatherController` → endpoints #2 (`/weather/dashboard`) and #3 (`/weather/locations`).
  - Provider token `WEATHER_SERVICE` → **`OpenWeatherService`** (primary) with **`MockWeatherService`** fallback. Port the existing OpenWeather logic:
    - Geocoding: `GET /geo/1.0/direct?q=&limit=5&appid=` and `GET /geo/1.0/zip?zip=XXXXX,US&appid=`.
    - Weather: `GET /data/3.0/onecall?lat=&lon=&units=&exclude=minutely&appid=`.
    - Imperial/metric unit mapping; US-state-abbreviation normalization; ZIP detection (5-digit / 9-digit); timezone-aware time conversion.
    - Condition → Unsplash background-image map; shape the response into 7 hourly / 5 daily / 3 previews / 4 metrics, with `trend` arrays for sparklines.
  - HTTP via `@nestjs/axios` or native `fetch`. Caching via `@nestjs/cache-manager` (in-memory store): **weather 10 min** keyed by `location + unitSystem`, **geocoding 6 hr** keyed by query.
  - Fall back to `MockWeatherService` when the API key is missing or the upstream call fails (matches current behavior — the app must run out of the box with no key).
- **UsersModule**
  - `UsersController` → endpoints #4–#11 (preferences + saved-location CRUD, reorder, set-default).
  - `PreferenceService` (Prisma-backed) implementing the §0.4 invariants. (Optionally keep an in-memory implementation for a "no DB configured" mode, like the original `InMemoryUserPreferenceService` — low priority.)
- **Cross-cutting**
  - Global `ValidationPipe` (`class-validator` / `class-transformer`) over request DTOs.
  - CORS allowing the Angular dev origin (`http://localhost:4200`).
  - Global prefix `api`, excluding `health`.
  - camelCase JSON (the JS default) — do not add a snake_case/Pascal-case transformer.

### Phase 4 — Frontend (Angular) (3–4 days)
Decompose the monolithic `App.vue` into standalone components while keeping **identical DOM + class names** (so the ported CSS just works):

- **Shell:** `SidebarComponent` (→ `BrandComponent`, `NavListComponent`, `SavedLocationsComponent`, `PremiumCardComponent`, `ThemeToggleComponent`).
- **Topbar:** `TopbarComponent` (→ `SearchBoxComponent` with suggestions dropdown, `UnitSwitchComponent`, `ProfileClusterComponent`).
- **Dashboard:** `DashboardComponent` (→ `HeroWeatherComponent`, `PreviewRowComponent`, `HourlyPanelComponent`, `ForecastPanelComponent`, `MetricStackComponent`).
- **Reusable:** `MetricCardComponent`, `WeatherIconComponent` (condition → lucide icon map: rain→CloudRain, partly cloud→CloudSun, cloud→Cloud, night/clear→Moon, default→Sun), `SparklineComponent`.

- **State — `WeatherStore` service using Angular signals.** Mirror the `App.vue` reactive state:
  `dashboard`, `loading`, `error`, `search`, `unitSystem`, `suggestions`, `savedLocations`,
  `searchFocused`, `savingLocation`, `updatingLocationId`; plus `computed` for `activeLocation`,
  `activeSavedLocation`, `showSuggestions`, and the formatted-date helpers. Port the exact handlers:
  `loadDashboard`, `loadPreferences`, `loadSavedLocations`, `changeUnits`, `chooseLocation`,
  `saveActiveLocation`, `removeSavedLocation`, `makeDefaultLocation`, `moveSavedLocation`, plus the
  `onMounted` boot sequence (load prefs → load saved → pick default/first → load dashboard).
- **API service — `WeatherApiService`** using `HttpClient`, one method per endpoint (a direct port of `weatherApi.ts`, with `userId = 'anonymous'`).
- **Search debounce:** an RxJS `Subject` → `debounceTime(250)` → `switchMap(searchLocations)` (or `toObservable(searchSignal)`), matching the 250 ms / 2-char-minimum behavior.
- **Styling:** drop `styles.css` into `apps/web/src/styles.scss` (global). Use `lucide-angular` for icons. Port `favicon.svg` and the `index.html` title.
- **Env / proxy:** `environment.ts` exposes `apiBaseUrl`; `proxy.conf.json` forwards `/api` and `/health` to `http://localhost:3000` (replaces the Vite proxy).

### Phase 5 — Dev workflow (½ day)
- `nx serve api` (port 3000) + `nx serve web` (port 4200) — or `nx run-many -t serve`. Add an npm `dev` script.
- Local Postgres: `docker compose up -d db`; apply schema with `npx prisma migrate dev`; seeding optional.
- `.env.example` documents `OPENWEATHER_API_KEY` and notes the app runs with mock data when it is absent.

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
