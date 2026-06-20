# Task 3-4 — UsersModule: preferences (endpoints #4, #5) + PreferenceService core

## Surface
Backend feature module in `apps/api` only — a `UsersModule` with `UsersController` serving endpoints #4
`GET /api/users/{userId}/preferences` and #5 `PUT /api/users/{userId}/preferences`, backed by a
Prisma-backed `PreferenceService` implementing the §0.4 auto-create-on-first-read invariant, plus the
`UpdatePreferencesRequest` DTO **class** (validated by the Task 3-2 global pipe). Registered in
`app.module.ts`. This task creates `UsersModule`; Task 3-5 extends it with the saved-location endpoints.
No weather logic, no schema or shared-types edits.

## Why
Endpoints #4 and #5 are the per-user preferences half of the §0.2 contract — the °F/°C unit toggle the
Angular client persists (§0.1 item 9). This ports the current .NET `IUserPreferenceService`: a
Prisma-backed `PreferenceService` over the Phase 2 `user_preferences` table, implementing the first of
the four §0.4 invariants — **auto-create a `UserPreference` with `unitSystem = "imperial"` on first
read**. It stands up `UsersModule` (the home Task 3-5's saved-location endpoints land in) and
establishes the DTO-class pattern (a `class-validator`-decorated class that `implements` the
`@nimbus/shared-types` request interface, no field duplication) the mutating endpoints reuse. Splitting
preferences (this task) from saved locations (Task 3-5) keeps each an independently shippable PR.

## Depends on
- **Task 3-1** (`docs/tasks/Tasks-3-1.md`): the global `PrismaModule`/`PrismaService` (injected into
  `PreferenceService`) and `class-validator`/`class-transformer` exist. **Hard precondition.**
- **Task 3-2** (`docs/tasks/Tasks-3-2.md`): the global `api` prefix (so `@Controller('users')` resolves
  at `/api/users/...`) and the global `ValidationPipe` (so the `UpdatePreferencesRequest` DTO is
  validated). **Hard precondition.**
- **Roadmap Phase 3 — Backend (NestJS)** (`docs/RoadMap.md`, "### Phase 3"): the `UsersModule` scope
  bullet (preferences GET/PUT, the auto-create-`imperial`-on-first-read invariant), the "DTO ↔
  shared-types binding" decision (DTO **classes** `implements` the shared interfaces + add only
  `class-validator` decorators), and the "in-memory `PreferenceService` fallback — **skip it**"
  decision. Enumerated task-split item **4**.
- **Roadmap §0.2** (lines ~55–72): endpoint #4 `GET /api/users/{userId}/preferences` → `UserPreferences`;
  endpoint #5 `PUT /api/users/{userId}/preferences` body `{ unitSystem }` → `UserPreferences`.
- **Roadmap §0.4** (lines ~158–208): `UserPreference` (`userId` PK ≤120, `unitSystem` default
  `"imperial"`, `createdUtc`, `updatedUtc`); invariant "Auto-create a `UserPreference` with `unitSystem
  = "imperial"` on first read."
- **Phase 2 — Database + Prisma — Handoff** (`docs/handoffs/Phase-2-Handoff.md`): the
  `prisma.userPreference` accessor is typed and ready; `@@map("user_preferences")`. Phase 3 must **not**
  modify `prisma/schema.prisma`.
- **Phase 1 — Shared contract — Handoff** (`docs/handoffs/Phase-1-Handoff.md`): import `UserPreferences`,
  `UpdatePreferencesRequest`, `UnitSystem` from `@nimbus/shared-types`; the DTO class `implements`
  `UpdatePreferencesRequest` (no field redeclaration).
- No ADRs exist in `docs/decisions/`.

## Required reading
- `libs/shared-types/src/lib/weather.ts` + `libs/shared-types/src/lib/requests.ts` (via
  `@nimbus/shared-types`) — **Mirror:** `UserPreferences { userId: string; unitSystem: UnitSystem }`,
  `UpdatePreferencesRequest { unitSystem: UnitSystem }`, `UnitSystem = 'imperial' | 'metric'`. The DTO
  class implements `UpdatePreferencesRequest`.
- `apps/api/src/app/prisma/prisma.service.ts` (created in Task 3-1) — **Mirror:** inject `PrismaService`
  and call `this.prisma.userPreference.findUnique` / `.create` / `.update` / `.upsert`.
- `apps/api/src/app/app.controller.ts` — **Mirror:** the `@Controller` / `@Get` / `@Put` / `@Param` /
  `@Body` decorator style.
- `apps/api/src/app/app.module.ts` — **Mirror:** register `UsersModule` in `imports`.
- `docs/handoffs/Phase-2-Handoff.md` — **Mirror:** `prisma.userPreference` usage; do not touch the
  schema.
- `CLAUDE.md` — `npm run build` / `npm run lint` / `npm test`.

## Acceptance criteria
1. **`UpdatePreferencesRequest` DTO class** (e.g. `apps/api/src/app/users/dto/update-preferences.dto.ts`):
   a class that `implements UpdatePreferencesRequest` from `@nimbus/shared-types`, with a single
   `unitSystem` field decorated to accept only the two literals — e.g.
   `@IsIn(['imperial', 'metric']) unitSystem!: UnitSystem;`. No field is redeclared beyond what the
   interface defines. Under the Task 3-2 pipe (`whitelist` + `forbidNonWhitelisted`), a body with an
   unknown field or an out-of-range `unitSystem` is rejected with `400`.
2. **`PreferenceService` created** (`apps/api/src/app/users/preference.service.ts`), `@Injectable()`,
   injecting `PrismaService`, with at least:
   - `getPreferences(userId: string): Promise<UserPreferences>` — **auto-create on first read**: if no
     `user_preferences` row exists for `userId`, create one with `unitSystem: 'imperial'` and return it;
     otherwise return the existing row mapped to the `UserPreferences` shape (`{ userId, unitSystem }` —
     the `createdUtc`/`updatedUtc` columns are **not** exposed, per the Phase 2 handoff).
   - `updatePreferences(userId: string, dto: UpdatePreferencesRequest): Promise<UserPreferences>` —
     upsert/update the row's `unitSystem` and return the updated `UserPreferences`. Updating a
     not-yet-existing user creates the row (upsert), so PUT-before-GET still works.
3. **Endpoint #4** — `GET /api/users/:userId/preferences` returns `200` with `UserPreferences`. **First
   read auto-creates** an `imperial` row: for a `userId` with no prior row, the response is
   `{ userId: '<userId>', unitSystem: 'imperial' }` and a `user_preferences` row now exists.
4. **Endpoint #5** — `PUT /api/users/:userId/preferences` with body `{ unitSystem: 'metric' }` returns
   `200` with `{ userId: '<userId>', unitSystem: 'metric' }`, and a subsequent `GET` returns the same
   (persisted) value. `userId = 'anonymous'` is the only identity exercised, but the route is
   parameterized by `:userId` as in §0.2.
5. **camelCase JSON.** Response keys are exactly `userId`, `unitSystem` (no transformer; no exposed
   timestamps).
6. **No schema edits.** `PreferenceService` queries the Phase 2 `prisma.userPreference` accessor as-is;
   `prisma/schema.prisma` and `prisma/migrations/` are untouched.
7. **Build / lint / test stay green.** `npm run build`, `npm run lint`, `npm test` pass. Dedicated
   `PreferenceService` integration tests (Testcontainers) are **Phase 6** — do not add them here.

## Out of scope (do NOT do these here)
- **Saved-location endpoints #6–#11** (list/create/update/delete/set-default/reorder) and their
  invariants (single-default-per-user, `(userId, name, region)` dedupe, contiguous `sortOrder`) —
  **Task 3-5**. This task only creates `UsersModule` + the preferences half.
- **`Decimal`→`number` conversion** — there are no `Decimal` columns on `user_preferences`; that
  boundary concern is the saved-location lat/lon in **Task 3-5**.
- **`SaveLocationRequest` / `ReorderSavedLocationsRequest` DTO classes** — **Task 3-5**.
- **`PrismaModule` / `ConfigModule` / deps** (Task 3-1), **prefix / CORS / pipe** (Task 3-2),
  **`WeatherModule`** (Task 3-3) — preconditions / siblings.
- **In-memory `PreferenceService` fallback** ("no DB" mode) — explicitly **skipped** per the roadmap
  decision; Postgres is the committed persistence layer.
- **Schema / shared-types edits** — Phases 2 / 1, read-only here.

## Approval gates / what NOT to run
- **No new dependency** — `PreferenceService` uses the Task 3-1 `PrismaService` and the installed
  `class-validator`. If a step seems to need a new package, STOP and ask.
- **No schema migration** — the `user_preferences` table already exists (Phase 2). If the work seems to
  need a new column/index, that is a **new approval-gated Phase 2-style migration** — STOP and ask; do
  not edit `prisma/schema.prisma`.

## Files affected
- `apps/api/src/app/users/users.module.ts` — created.
- `apps/api/src/app/users/users.controller.ts` — created (endpoints #4, #5; Task 3-5 extends it).
- `apps/api/src/app/users/preference.service.ts` — created.
- `apps/api/src/app/users/dto/update-preferences.dto.ts` — created.
- `apps/api/src/app/app.module.ts` — modified (register `UsersModule`).

## Suggested commit
```
feat(api): add UsersModule preferences (GET/PUT) with auto-create-on-read

Implement RoadMap §0.2 endpoints #4 and #5 and stand up UsersModule:

- PreferenceService (Prisma-backed over user_preferences): getPreferences
  auto-creates a unitSystem='imperial' row on first read (§0.4 invariant);
  updatePreferences upserts the unit system.
- UsersController: GET /api/users/:userId/preferences and PUT
  /api/users/:userId/preferences ({ unitSystem }) -> UserPreferences.
- UpdatePreferencesRequest DTO class implements the @nimbus/shared-types
  interface with @IsIn(['imperial','metric']); rejected by the global pipe
  on unknown/invalid fields.

camelCase JSON ({ userId, unitSystem }), no exposed timestamps. Saved
locations (#6-#11) are Task 3-5; integration tests are Phase 6. No schema
edits. build/lint/test green.
```
