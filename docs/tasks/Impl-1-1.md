# Impl 1-1 — Lift the §0.3 response interfaces into `libs/shared-types` + barrel

**Acceptance contract:** `docs/tasks/Tasks-1-1.md`
**Decision lock:** RoadMap.md §0.3 (nine response interfaces, verbatim — field names, types, and optionality are locked); RoadMap.md §1 (`@nimbus/shared-types` alias spelling is load-bearing, established in Phase 0 and must not change). No ADR file exists — roadmap is the sole locked source.
**Scope:** Add `libs/shared-types/src/lib/weather.ts` with the nine response interfaces copied byte-for-byte from `docs/reference/weather.ts`; replace `libs/shared-types/src/index.ts` to re-export them via barrel. No schema change. No new dependency.

---

## Step 0 — Pre-flight

**STOP if Phase 0 has not landed.** This task's hard precondition is a complete Nx workspace with `libs/shared-types` already generated and the `@nimbus/shared-types` path alias already in `tsconfig.base.json`. Verify all of the following are present before touching any file:

| File / directory | Confirms |
|---|---|
| `nx.json` | Nx workspace exists |
| `tsconfig.base.json` | base tsconfig with path alias |
| `libs/shared-types/src/index.ts` | library entry point |
| `libs/shared-types/project.json` | library project targets |

If any are absent: **STOP. Phase 0 is incomplete. Do not scaffold anything here.**

Open `tsconfig.base.json` and confirm `compilerOptions.paths` contains exactly:
```json
"@nimbus/shared-types": ["./libs/shared-types/src/index.ts"]
```
The leading `./` is required (no `baseUrl` is set; non-relative values fail with TS5090). Do not alter this entry.

Confirm the working branch is clean:
```
git status
```
Expected: `nothing to commit, working tree clean`.

Run the baseline verify suite and confirm all pass:
```
npm run build
npm run lint
npm test
```

All three must exit 0 before proceeding.

**Files to open before starting:**
- `libs/shared-types/src/index.ts` — currently contains only `SHARED_TYPES_PLACEHOLDER`; this is what Phase 1 replaces.
- `docs/reference/weather.ts` — the canonical byte-for-byte source for all nine interfaces. The nine symbols, in file order, are: `WeatherDashboard`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `WeatherPreview`, `WeatherMetric`, `LocationSuggestion`, `UnitSystem` (type alias, declared near the end), `UserPreferences`.

**Verify:** git tree clean, `npm run build`, `npm run lint`, and `npm test` all exit 0.

---

## Step 1 — Create `libs/shared-types/src/lib/weather.ts`

Phase 0 delivered `libs/shared-types/src/` with only `index.ts` (no `lib/` subdirectory). Create the subdirectory and the file now.

Create `libs/shared-types/src/lib/weather.ts` and copy the nine declarations **exactly** as they appear in `docs/reference/weather.ts` — same order, same field names, same types, same optionality, no added comments. The content to write is:

```ts
export interface WeatherDashboard {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  previews: WeatherPreview[];
  metrics: WeatherMetric[];
  locations: LocationSuggestion[];
  unitSystem: UnitSystem;
  temperatureUnit: string;
  windUnit: string;
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
  label: string;
  time: string;
  condition: string;
  temperature: number;
  windSpeed: number;
  precipitationChance: number;
}

export interface DailyForecast {
  day: string;
  date: string;
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
  key: string;
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

export type UnitSystem = 'imperial' | 'metric';

export interface UserPreferences {
  userId: string;
  unitSystem: UnitSystem;
}
```

Constraints to enforce while writing:
- `UnitSystem` is a `type` alias (string-literal union), not an `enum` — write it exactly as shown.
- `id?: number | null` on `LocationSuggestion` — the `?` (optional) and `| null` (nullable) are both required.
- No runtime values, no classes, no decorators, no imports from any external package. The file contains only `export interface` and `export type` declarations.
- Do **not** add `UpdatePreferencesRequest`, `SaveLocationRequest`, `UpdateSavedLocationRequest`, or `ReorderSavedLocationsRequest` — those are Task 1-2.

**Verify:** The file exists at `libs/shared-types/src/lib/weather.ts` and matches `docs/reference/weather.ts` byte-for-byte in every symbol name, field name, type, and optionality. Run `npm run build` — must exit 0 (the new file is not yet re-exported but it is valid TypeScript with no errors).

---

## Step 2 — Replace the barrel (`libs/shared-types/src/index.ts`)

Open `libs/shared-types/src/index.ts`. It currently reads:
```ts
// Placeholder export — Phase 0 only. The real REST contract types land in Phase 1.
export const SHARED_TYPES_PLACEHOLDER = true;
```

Replace the entire file content with exactly:
```ts
export * from './lib/weather';
```

This single re-export makes all nine names (`WeatherDashboard`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `WeatherPreview`, `WeatherMetric`, `LocationSuggestion`, `UnitSystem`, `UserPreferences`) resolvable from `@nimbus/shared-types`.

Do not retain the placeholder comment or the `SHARED_TYPES_PLACEHOLDER` constant — it is replaced, not supplemented.

**Verify:** `libs/shared-types/src/index.ts` contains only `export * from './lib/weather';` and nothing else. Run `npm run build` — must exit 0 with no type errors across all three projects (`shared-types`, `api`, `web`).

---

## Step 3 — Compile-check resolution from both apps (throwaway, removed before commit)

This step verifies that `@nimbus/shared-types` resolves the real types from both `apps/web` and `apps/api`. The imports are temporary and **must be removed in Step 4 before committing**.

**In `apps/api`:**
Open `apps/api/src/main.ts`. At the very top of the file, add:
```ts
import type { WeatherDashboard, LocationSuggestion, UserPreferences } from '@nimbus/shared-types';
type _Check = WeatherDashboard | LocationSuggestion | UserPreferences;
```

**In `apps/web`:**
Open `apps/web/src/main.ts`. At the very top of the file, add the same two lines:
```ts
import type { WeatherDashboard, LocationSuggestion, UserPreferences } from '@nimbus/shared-types';
type _Check = WeatherDashboard | LocationSuggestion | UserPreferences;
```

Using `import type` ensures no runtime code is emitted and avoids lint warnings about unused runtime imports.

**Verify:** Run `npm run build` — must exit 0 with no type errors. This confirms the alias resolves the new real types (not the placeholder) from both app TypeScript compilation roots.

---

## Step 4 — Remove the throwaway resolution imports

Open each file edited in Step 3 and remove both lines added (`import type { ... } from '@nimbus/shared-types';` and `type _Check = ...`). Restore each file to exactly its pre-Step-3 state.

Files to revert:
- `apps/api/src/main.ts`
- `apps/web/src/main.ts`

No app source file should carry any change from this task.

**Verify:** Inspect both files to confirm no `shared-types` import or `_Check` type reference remains. Run `npm run build` — must still exit 0 (the library re-exports resolve correctly without the app-side probes).

---

## Step 5 — Final verify: full suite + diff sanity check

Run all three verify commands from the repo root:
```
npm run build
npm run lint
npm test
```

All three must exit 0.

Acceptance criteria checklist before committing:
1. `libs/shared-types/src/lib/weather.ts` exists and declares all nine symbols (`WeatherDashboard`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `WeatherPreview`, `WeatherMetric`, `LocationSuggestion`, `UnitSystem`, `UserPreferences`) with the exact fields, types, and optionality from `docs/reference/weather.ts`.
2. `UnitSystem` is a `type` alias (`'imperial' | 'metric'`), not an `enum`.
3. `LocationSuggestion.id` is typed `id?: number | null` (optional AND nullable).
4. `libs/shared-types/src/index.ts` contains only `export * from './lib/weather';` — the `SHARED_TYPES_PLACEHOLDER` constant is gone.
5. No runtime values, no classes, no decorators, no imports from `@angular/*`, `@nestjs/*`, `@prisma/client`, or any external runtime package appear in `libs/shared-types/src/lib/weather.ts`.
6. No request DTOs (`UpdatePreferencesRequest`, `SaveLocationRequest`, `UpdateSavedLocationRequest`, `ReorderSavedLocationsRequest`) are present — those are Task 1-2.
7. `npm run build`, `npm run lint`, and `npm test` all exit 0.
8. No app source file (`apps/web/**`, `apps/api/**`) is changed in the final diff.

Run a sanity diff:
```
git diff --stat
```

Expected changed/added files:
```
libs/shared-types/src/index.ts          (replaced placeholder with barrel re-export)
libs/shared-types/src/lib/weather.ts   (new file — nine response interfaces)
```

No other files should appear. If any `apps/web/` or `apps/api/` source file shows a change, the throwaway imports from Step 3 were not fully removed — fix before committing.

**Verify:** All three commands green, diff shows exactly two files under `libs/shared-types/src/`, no app source changes.

---

## Step 6 — Commit

Stage the two changed/added files and commit with the exact message from the Tasks doc:

```
git add libs/shared-types/src/index.ts libs/shared-types/src/lib/weather.ts
git commit -m "feat(shared-types): add §0.3 weather response interfaces and barrel

Lift the nine response interfaces verbatim from the source-app
weather.ts (per RoadMap §0.3) into libs/shared-types and re-export
them through the barrel so apps/web and apps/api share one contract.

Pure type-only declarations: no runtime code, no Angular/Nest/Prisma
imports, no validation decorators (those land in Phase 3)."
```

No `Co-Authored-By` trailer (config sets `ai_coauthor_trailer: false`).

**Verify:** `git log --oneline -1` shows the commit. `git status` is clean.
