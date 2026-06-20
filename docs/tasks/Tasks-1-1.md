# Task 1-1 — Lift the §0.3 response types into `libs/shared-types` + barrel

## Surface
Shared library only — `libs/shared-types` (the compile-time contract consumed later by both
`apps/web` Angular and `apps/api` NestJS). No app, controller, service, or DB code is touched.

## Why
This is the first half of standing up `@nimbus/shared-types` as the single source of truth for the
REST contract. Lifting the nine §0.3 response interfaces **verbatim** into one shared library means
the Angular client and the Nest server import the *same* types, so the response contract can never
silently drift between front and back end. It unblocks Phase 2 (Prisma models shaped against these
types), Phase 3 (Nest controllers/services returning these types) and Phase 4 (Angular store/services
consuming them). This task deliberately carries only the **response** interfaces; the four request
DTOs are Task 1-2.

## Depends on
- **Roadmap Phase 1 — Shared contract** (`docs/RoadMap.md`, "### Phase 1 — Shared contract"),
  specifically the §0.3 data contract block and the "Constraint — pure TypeScript types only".
- **Roadmap §0.3** (`docs/RoadMap.md` lines ~74–156) — the authoritative text of the nine interfaces.
- **Roadmap §1** (`docs/RoadMap.md` lines ~228–248) — the `libs/shared-types` location and the
  `@nimbus/shared-types` import alias.
- **Phase 0 — Bootstrap** (`docs/RoadMap.md`, "### Phase 0 — Bootstrap") — generates the
  `libs/shared-types` project and the `@nimbus/shared-types` tsconfig path alias. **This is a hard
  precondition.** See "Precondition / blocker" below.
- No prior Tasks docs (this is the first task of Phase 1). No ADRs exist in `docs/decisions/` and no
  handoff exists in `docs/handoffs/` (both directories are absent) — there is no prior locked state to
  honor beyond the roadmap itself.

## Precondition / blocker — VERIFY BEFORE STARTING
> **STOP and confirm before writing code if either of these is true.**
>
> 1. **Phase 0 has not run.** As of this planning pass the repository contains only `README.md`,
>    `CLAUDE.md`, `.gitignore`, `docs/`, and `.claude/`. There is **no** `package.json`, **no**
>    `nx.json`, **no** `tsconfig.base.json`, and **no** `libs/` directory. The Nx workspace, the
>    `libs/shared-types` project, and the `@nimbus/shared-types` path alias that this task assumes are
>    all Phase 0 deliverables. If Phase 0 has not been completed, this task is **blocked** — do not
>    hand-scaffold a workspace here (that is Phase 0's scope, not Phase 1's). Flag it and stop.
> 2. **Canonical source is the vendored real file, not §0.3.** The source app's
>    `src/WeatherApp.Client/src/types/weather.ts` has been snapshotted byte-for-byte into this repo at
>    **`docs/reference/weather.ts`** (see `docs/reference/README.md` for provenance). **Treat
>    `docs/reference/weather.ts` as the canonical source** for the nine interfaces — lift from it, not
>    from the §0.3 code block. The real file differs from RoadMap §0.3 in two **non-semantic** ways:
>    (a) the real file has **no inline comments** (§0.3 added annotations like `// "F" | "C"`,
>    `// ISO date`); (b) the real file declares `UnitSystem` **near the end** (after `LocationSuggestion`),
>    whereas §0.3 hoists it to the top. Field names, types, and optionality (incl. `id?: number | null`)
>    are identical. Do not invent fields or reshape anything; reproduce `docs/reference/weather.ts`.

## Required reading
- `docs/reference/weather.ts` — **the canonical, byte-for-byte source** (vendored snapshot of the
  source app's `weather.ts`). **Mirror:** reproduce these nine interface declarations exactly.
- `docs/reference/README.md` — provenance and the two non-semantic deltas vs §0.3 (no inline comments;
  `UnitSystem` declared near the end).
- `docs/RoadMap.md` — §0.3 "Data contract" code block (a *documented* rendering of the same nine
  interfaces — useful for the field-purpose comments, but **not** the byte-for-byte source) and the
  Phase 1 "Scope", "Constraint", "Decisions needed", "Out of scope", and "Success criteria"
  sub-sections.
- `docs/RoadMap.md` — §1 "Target architecture" tree. **Mirror:** the `libs/shared-types/` location
  and the `@nimbus/shared-types` import alias spelling.
- `CLAUDE.md` — project conventions. **Mirror:** TypeScript/NestJS house style, the
  "document only what exists" discipline, and the expected commands (`npm run build`, `npm test`,
  `npm run lint`).
- `libs/shared-types/` (Phase 0 output — read **before** editing to learn the generated layout:
  `src/index.ts` entry point, `src/lib/` location, `project.json`/`tsconfig.lib.json`, and what
  `package.json#exports` / the tsconfig `paths` entry for `@nimbus/shared-types` already points at).
  **Mirror:** place new files where Phase 0's generated structure expects them; do not relocate the
  generated entry point.

## Acceptance criteria
1. **The nine response types are present, verbatim.** A source file in the library (recommended:
   `libs/shared-types/src/lib/weather.ts`, matching the original filename; place it wherever the
   Phase 0 layout's entry point can re-export from) declares exactly these nine, matching
   `docs/reference/weather.ts` (same names, types, optionality):
   - `export type UnitSystem = 'imperial' | 'metric';`
   - `export interface WeatherDashboard { … }` with fields: `current: CurrentWeather;`
     `hourly: HourlyForecast[];` `daily: DailyForecast[];` `previews: WeatherPreview[];`
     `metrics: WeatherMetric[];` `locations: LocationSuggestion[];` `unitSystem: UnitSystem;`
     `temperatureUnit: string;` `windUnit: string;`
   - `export interface CurrentWeather { … }` with fields `location, observedAt, condition, summary,
     description` (all `string`), `temperature, feelsLike, low, high` (all `number`),
     `sunrise, sunset, backgroundImageUrl` (all `string`).
   - `export interface HourlyForecast { … }` — `label: string; time: string; condition: string;
     temperature: number; windSpeed: number; precipitationChance: number;`
   - `export interface DailyForecast { … }` — `day: string; date: string; condition: string;
     high: number; low: number; precipitationChance: number;`
   - `export interface WeatherPreview { … }` — `condition: string; high: number; low: number;
     description: string;`
   - `export interface WeatherMetric { … }` — `key: string; label: string; value: string;
     unit: string; hint: string; trend: number[];`
   - `export interface LocationSuggestion { … }` — `name: string; region: string; country: string;
     latitude: number; longitude: number; id?: number | null; isDefault: boolean; sortOrder: number;`
     (note `id` is **optional and nullable** — `id?: number | null` — preserve exactly).
   - `export interface UserPreferences { … }` — `userId: string; unitSystem: UnitSystem;`
   The canonical `docs/reference/weather.ts` carries **no inline comments** — matching it (no comments)
   satisfies this criterion. Retaining the §0.3 doc annotations (`// "F" | "C"`, `// "Now", "11 PM", ...`,
   `// "Mon"`, `// ISO date`, `// "humidity" | "wind" | "precipitation" | "visibility"`) as
   non-semantic comments is **allowed but optional** — they must not alter any name, type, or optionality.
2. **Barrel re-export.** The library's public entry point (`libs/shared-types/src/index.ts`, the file
   the `@nimbus/shared-types` alias resolves to per Phase 0) re-exports every one of the nine names.
   `export * from './lib/weather';` (path adjusted to the actual location) is acceptable, provided all
   nine resolve from `@nimbus/shared-types`.
3. **Pure-types constraint holds.** The library contains **only** `type`/`interface` declarations and
   re-exports — **no** runtime values, **no** `enum` (use the string-literal `UnitSystem` union as
   given), **no** classes, **no** `class-validator`/`class-transformer` decorators, and **no** imports
   from `@angular/*`, `@nestjs/*`, `@prisma/client`, or any runtime package. The compiled JS output
   for these declaration files is empty.
4. **Build is green.** `npm run build` (Nx will build the `shared-types` project; e.g.
   `npx nx build shared-types`) completes with **no type errors**.
5. **Lint is green.** `npm run lint` passes for the library — flags any stray runtime code or
   disallowed import, and passes here because there is none.
6. **Resolution check (compile-time only).** A throwaway type-only statement
   `import type { WeatherDashboard, LocationSuggestion, UserPreferences } from '@nimbus/shared-types';`
   type-checks. If a sandbox/scratch type-check is added to verify this, it must be removed before
   commit (no test scaffolding is introduced in Phase 1 — testing is Phase 6). Do **not** add a Jest
   spec; `npm test` is not expected to gain new specs in this task.

## What NOT to modify
- Do **not** add the four request DTOs (`UpdatePreferencesRequest`, `SaveLocationRequest`,
  `UpdateSavedLocationRequest`, `ReorderSavedLocationsRequest`) — those are **Task 1-2**.
- Do **not** scaffold or reconfigure the Nx workspace, create `package.json`/`nx.json`/
  `tsconfig.base.json`, or define the `@nimbus/shared-types` path alias — that is **Phase 0**. If it
  is missing, STOP (see Precondition / blocker), do not create it here.
- Do **not** touch `apps/web` or `apps/api`, any Nest controller/service, or any Prisma schema.
- Do **not** add runtime validation, decorators, or any new field/shape beyond §0.3.
- **No schema migration / no new dependency** unless the roadmap says so — and Phase 1 explicitly says
  it adds none. If a task seems to need one, STOP and ask.

## Suggested commit
```
feat(shared-types): add §0.3 weather response interfaces and barrel

Lift the nine response interfaces verbatim from the source-app
weather.ts (per RoadMap §0.3) into libs/shared-types and re-export
them through the barrel so apps/web and apps/api share one contract.

Pure type-only declarations: no runtime code, no Angular/Nest/Prisma
imports, no validation decorators (those land in Phase 3).
```
