# Phase 1 — Shared contract — Handoff

**Status:** Complete. Both tasks committed on `main`:

| Task | Commit | Summary |
|------|--------|---------|
| 1-1 | `e452c05` | Nine §0.3 response interfaces lifted verbatim from `docs/reference/weather.ts` into `libs/shared-types/src/lib/weather.ts`; barrel replaced |
| 1-2 | `718ddde` | Four §0.2 request DTOs added to `libs/shared-types/src/lib/requests.ts`; barrel extended |

---

## What was delivered

`libs/shared-types` is now the single compile-time source of truth for the REST contract. All thirteen symbols export through `@nimbus/shared-types`:

**Nine response interfaces (Task 1-1 — `lib/weather.ts`):**
- `WeatherDashboard`
- `CurrentWeather`
- `HourlyForecast`
- `DailyForecast`
- `WeatherPreview`
- `WeatherMetric`
- `LocationSuggestion`
- `UnitSystem` (string-literal type alias: `'imperial' | 'metric'`)
- `UserPreferences`

**Four request DTOs (Task 1-2 — `lib/requests.ts`):**
- `UpdatePreferencesRequest` — `{ unitSystem: UnitSystem }`
- `SaveLocationRequest` — six fields (`name`, `region`, `country`, `latitude`, `longitude`, `isDefault?`)
- `UpdateSavedLocationRequest` — plain type alias `= SaveLocationRequest` (keeps "same body as POST" invariant)
- `ReorderSavedLocationsRequest` — `{ locationIds: number[] }`

---

## Contract guarantees

- **Pure types only.** No runtime code, no `enum`, no classes, no `class-validator`/`class-transformer` decorators, no imports from `@angular/*`, `@nestjs/*`, or `@prisma/client`.
- **Alias resolves from both apps.** The `@nimbus/shared-types` path alias in `tsconfig.base.json` was compile-verified from both `apps/api` and `apps/web` during implementation.
- **Verbatim lift.** The nine response interfaces are textually identical to `docs/reference/weather.ts` (the source-app snapshot).

---

## For downstream phases

- **Phase 2 (Prisma models):** Prisma schema models should align with `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `LocationSuggestion`, and `UserPreferences`. The shared types define the API response shape; the schema owns the persistence shape.
- **Phase 3 (Backend):** Import from `@nimbus/shared-types` directly. Add runtime `class-validator` DTO classes in `apps/api` that *implement* these interfaces — do not duplicate field declarations.
- **Phase 4 (Frontend):** Import from `@nimbus/shared-types` directly. The Angular state/service layer uses these types as the canonical shape for HTTP responses and request bodies.
- **No new dependencies required.** `libs/shared-types` adds zero runtime packages.
