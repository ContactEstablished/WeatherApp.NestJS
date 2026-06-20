# Task 3-5 — UsersModule: saved-location CRUD, reorder, set-default (endpoints #6–#11)

## Surface
Backend feature work in the existing `apps/api` `UsersModule` only — extend `UsersController` and
`PreferenceService` (or add a `SavedLocationService`) to serve endpoints #6–#11 over the Phase 2
`saved_locations` table, enforcing the three remaining §0.4 invariants, converting Prisma `Decimal`
lat/lon to JSON `number` at the boundary, returning `204 No Content` on the mutating endpoints, and
adding the `SaveLocationRequest` / `ReorderSavedLocationsRequest` DTO classes. No preferences changes,
no weather logic, no schema or shared-types edits.

## Why
Endpoints #6–#11 are the saved-locations half of the §0.2 contract — the sidebar the Angular client
uses to select / reorder / set-default / delete saved places (§0.1 items 7–8). This ports the rest of
the .NET `IUserPreferenceService`: list (ordered by `sortOrder`), create, update, delete, set-default,
and reorder over the Phase 2 `saved_locations` table, enforcing the **two non-trivial server rules**
(§4) — **single default per user** (setting a default atomically clears it on the others) and
**contiguous `sortOrder` on reorder** — plus the **no-duplicate `(userId, name, region)`** invariant
(backed by the Phase 2 `@@unique`). It also handles the §4 **`Decimal`→`number`** boundary: Prisma
returns `Decimal` objects for the `@db.Decimal(9, 6)` lat/lon, which must serialize as JSON `number` to
match the `LocationSuggestion` contract. This completes the §0.2 contract and Phase 3.

## Depends on
- **Task 3-4** (`docs/tasks/Tasks-3-4.md`): `UsersModule`/`UsersController` exist and the DTO-class
  pattern (`implements` a `@nimbus/shared-types` request interface + `class-validator` decorators) is
  established. **Hard precondition** — this task extends that module.
- **Task 3-1** (`docs/tasks/Tasks-3-1.md`): the global `PrismaService` (injected for `saved_locations`
  queries) and `class-validator` exist. **Hard precondition.**
- **Task 3-2** (`docs/tasks/Tasks-3-2.md`): the global `api` prefix + global `ValidationPipe`. **Hard
  precondition.**
- **Roadmap Phase 3 — Backend (NestJS)** (`docs/RoadMap.md`, "### Phase 3"): the `UsersModule` scope
  bullet (saved-location list/create/update/delete; set-default; reorder; the four §0.4 invariants;
  `Decimal`→`number` at the response boundary), the "contract fidelity is non-negotiable" constraint
  (`204 No Content` on the mutating endpoints), and the DTO-binding decision. Enumerated task-split item
  **5**.
- **Roadmap §0.2** (lines ~55–72): endpoints #6 `GET …/locations` → `LocationSuggestion[]` ordered by
  `sortOrder`; #7 `POST …/locations` body `{ name, region, country, latitude, longitude, isDefault? }`
  → `204`; #8 `PUT …/locations/{id}` (same body) → `204`; #9 `DELETE …/locations/{id}` → `204`; #10 `PUT
  …/locations/{id}/default` → `204`; #11 `PUT …/locations/reorder` body `{ locationIds: number[] }` →
  `204`.
- **Roadmap §0.4** (lines ~158–208): `SavedLocation` fields/constraints (`@@unique([userId, name,
  region])`, `@@index([userId, sortOrder])`); invariants — single default per user; no duplicate
  `(userId, name, region)`; `sortOrder` defines order and a reorder rewrites it contiguously.
- **Roadmap §4** (lines ~725–731): the `Decimal`→`number` boundary; the two high-risk invariants.
- **Phase 2 — Database + Prisma — Handoff** (`docs/handoffs/Phase-2-Handoff.md`): the
  `prisma.savedLocation` accessor; lat/lon come back as `Decimal` (`@db.Decimal(9, 6)`) and must be
  converted to `number`; the `@@unique` makes a duplicate insert/update fail at the DB. **Do not modify
  `prisma/schema.prisma`.**
- **Phase 1 — Shared contract — Handoff** (`docs/handoffs/Phase-1-Handoff.md`): import
  `LocationSuggestion`, `SaveLocationRequest`, `UpdateSavedLocationRequest` (= `SaveLocationRequest`),
  `ReorderSavedLocationsRequest` from `@nimbus/shared-types`; DTO classes `implements` them.
- No ADRs exist in `docs/decisions/`.

## Required reading
- `libs/shared-types/src/lib/weather.ts` + `libs/shared-types/src/lib/requests.ts` (via
  `@nimbus/shared-types`) — **Mirror:** `LocationSuggestion { name, region, country, latitude: number,
  longitude: number, id?: number | null, isDefault, sortOrder }`; `SaveLocationRequest` (six fields,
  `isDefault?`); `UpdateSavedLocationRequest = SaveLocationRequest`; `ReorderSavedLocationsRequest {
  locationIds: number[] }`.
- `apps/api/src/app/users/users.controller.ts` + `preference.service.ts` (Task 3-4) — **Mirror:** extend
  these with the saved-location routes/methods (or add a sibling `SavedLocationService` in the same
  module); reuse the established DTO-class + Prisma-injection patterns.
- `apps/api/src/app/users/dto/update-preferences.dto.ts` (Task 3-4) — **Mirror:** the DTO-class style for
  the new `SaveLocationRequest` / `ReorderSavedLocationsRequest` classes.
- `apps/api/src/app/prisma/prisma.service.ts` — **Mirror:** `this.prisma.savedLocation.*` and
  `this.prisma.$transaction([...])` for the atomic single-default and contiguous-reorder writes.
- `docs/handoffs/Phase-2-Handoff.md` — **Mirror:** `Decimal`→`number` conversion; `@@unique` behavior;
  no schema edits.
- `docs/RoadMap.md` §0.1 items 7–8 — **Mirror:** the user-visible save / select / reorder / set-default
  / delete behavior these endpoints back.
- `CLAUDE.md` — `npm run build` / `npm run lint` / `npm test`.

## Acceptance criteria
1. **DTO classes.** `SaveLocationRequest` DTO class (`implements SaveLocationRequest`) with
   `class-validator` decorators: `name`/`region`/`country` `@IsString()` non-empty, `latitude`/
   `longitude` `@IsNumber()` (and reasonable range, e.g. lat `-90..90`, lon `-180..180`), `isDefault`
   `@IsBoolean() @IsOptional()`. A `ReorderSavedLocationsRequest` DTO class (`implements …`) with
   `locationIds` `@IsArray()` of `@IsInt()`. Endpoint #8 reuses the `SaveLocationRequest` DTO (the body
   is identical — `UpdateSavedLocationRequest = SaveLocationRequest`). Under the Task 3-2 pipe, malformed
   bodies (unknown field, wrong type, out-of-range) are rejected with `400`.
2. **Endpoint #6** — `GET /api/users/:userId/locations` returns `200` with `LocationSuggestion[]`
   **ordered by `sortOrder` ascending**. Each item's `latitude`/`longitude` is a JSON `number` (not a
   `Decimal` object / not a string), `id` is the row's numeric id, and `isDefault`/`sortOrder` reflect
   the row. An empty list returns `[]` (not `404`).
3. **Endpoint #7** — `POST /api/users/:userId/locations` with `SaveLocationRequest` body returns **`204
   No Content`** (no body). The row is persisted with `userId` from the route. If `isDefault: true`, the
   single-default invariant (5) applies. A second POST with a duplicate `(userId, name, region)` is
   **rejected** (the Phase 2 `@@unique` raises; surface it as a `409 Conflict` rather than an unhandled
   500).
4. **Endpoint #8** — `PUT /api/users/:userId/locations/:id` with the same body returns **`204`** and
   updates the row; a duplicate `(userId, name, region)` collision is rejected (`409`), and `isDefault:
   true` triggers (5).
5. **Endpoint #9** — `DELETE /api/users/:userId/locations/:id` returns **`204`** and removes the row.
6. **Endpoint #10 — single default per user (invariant).** `PUT /api/users/:userId/locations/:id/default`
   returns **`204`** and **atomically** sets the target row `isDefault = true` while clearing
   `isDefault` on **all other** rows for that `userId` (run in a single `$transaction`). After the call,
   exactly one of the user's rows has `isDefault === true`. Setting default on a row when another was
   already default leaves exactly one default (the new one).
7. **Endpoint #11 — contiguous `sortOrder` on reorder (invariant).** `PUT
   /api/users/:userId/locations/reorder` with `{ locationIds: [id3, id1, id2] }` returns **`204`** and
   rewrites `sortOrder` **contiguously** so the rows follow the supplied id order (e.g. `sortOrder` `0,
   1, 2, …` in array order), run atomically in a `$transaction`. A subsequent `GET` (endpoint #6)
   returns the rows in exactly the new order.
8. **`Decimal`→`number` boundary (§4).** Every `LocationSuggestion` returned by endpoint #6 has
   `latitude`/`longitude` converted from the Prisma `Decimal` to a primitive `number` at the response
   boundary (e.g. `Number(row.latitude)` / `.toNumber()`), so the JSON contains `"latitude": 37.7749`
   numerics, never a `Decimal` object or a quoted string.
9. **No-duplicate invariant.** A create/update that would violate `(userId, name, region)` is rejected
   (mapped from the Prisma unique-constraint error to `409`), not silently duplicated. This is the
   `@@unique` from Phase 2 surfaced as a clean HTTP status.
10. **camelCase JSON; `204` bodies empty.** Response keys match `LocationSuggestion` exactly; the five
    mutating endpoints (#7–#11) return `204 No Content` with **no** response body (use Nest's
    `@HttpCode(204)` where the handler returns a value, or return `void`).
11. **No schema edits.** All queries use the Phase 2 `prisma.savedLocation` accessor as-is;
    `prisma/schema.prisma` / `prisma/migrations/` are untouched.
12. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` pass. Dedicated
    `PreferenceService`/saved-location integration tests (Testcontainers — dedupe, single-default,
    reorder) are **Phase 6** — do not add them here.

## Out of scope (do NOT do these here)
- **Preferences endpoints #4 / #5 and the auto-create invariant** — **Task 3-4** (precondition).
- **`WeatherModule` (#2/#3)** — **Task 3-3**. The `locations` array the dashboard returns is search
  results; these endpoints own the **saved** rows.
- **`PrismaModule` / `ConfigModule` / deps** (Task 3-1), **prefix / CORS / pipe** (Task 3-2) —
  preconditions.
- **Any new column/index** (e.g. to store extra location metadata) — that is a **new approval-gated
  Phase 2-style migration**, not part of this task.
- **Integration tests for the invariants** — **Phase 6**.
- **Schema / shared-types edits** — Phases 2 / 1, read-only here.

## Approval gates / what NOT to run
- **No new dependency** — uses the Task 3-1 `PrismaService` and the installed `class-validator`. If a
  step seems to need a new package, STOP and ask.
- **No schema migration / no schema edit.** The §0.4 `saved_locations` table and its `@@unique` /
  `@@index` already exist (Phase 2). **If a task seems to need a schema change (new column/index/
  constraint), STOP and ask** — it requires a new approval-gated Phase 2-style migration; do not edit
  `prisma/schema.prisma`. The single-default and contiguous-reorder invariants are **service-layer**
  logic over the existing schema, not DB changes.

## Files affected
- `apps/api/src/app/users/users.controller.ts` — modified (add endpoints #6–#11).
- `apps/api/src/app/users/preference.service.ts` — modified, **or**
  `apps/api/src/app/users/saved-location.service.ts` — created (saved-location logic + invariants).
- `apps/api/src/app/users/dto/save-location.dto.ts` — created (`SaveLocationRequest` DTO class).
- `apps/api/src/app/users/dto/reorder-saved-locations.dto.ts` — created
  (`ReorderSavedLocationsRequest` DTO class).
- `apps/api/src/app/users/users.module.ts` — modified only if a new `SavedLocationService` provider is
  added.

## Suggested commit
```
feat(api): add saved-location CRUD, reorder, and set-default (endpoints #6-#11)

Complete the §0.2 contract over the Phase 2 saved_locations table:

- GET /api/users/:userId/locations -> LocationSuggestion[] ordered by
  sortOrder; POST/PUT/:id/DELETE/:id/PUT/:id/default/PUT/reorder all return
  204 No Content.
- Invariants: single default per user (set-default atomically clears the
  others in a $transaction); contiguous sortOrder rewrite on reorder
  (atomic); no duplicate (userId, name, region) surfaced as 409 from the
  Phase 2 @@unique.
- Decimal -> number conversion for latitude/longitude at the response
  boundary so JSON matches LocationSuggestion (§4).
- SaveLocationRequest and ReorderSavedLocationsRequest DTO classes
  implement the @nimbus/shared-types interfaces with class-validator
  decorators (#8 reuses SaveLocationRequest).

camelCase JSON, empty 204 bodies. No schema edits. Invariant integration
tests are Phase 6. build/lint/test green.
```
