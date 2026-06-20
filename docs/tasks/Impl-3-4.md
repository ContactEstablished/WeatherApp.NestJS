# Impl 3-4 — UsersModule: preferences endpoints + PreferenceService

**Acceptance contract:** `docs/tasks/Tasks-3-4.md`
**Decision lock:** `docs/RoadMap.md` Phase 3 — "DTO ↔ shared-types binding" (DTO classes `implements`
shared interfaces, add only `class-validator` decorators, no field redeclaration); "in-memory
`PreferenceService` fallback — skip it"; "Validation strictness: `whitelist` + `forbidNonWhitelisted`
+ `transform`". No ADRs in `docs/decisions/`.
**Scope:** Create `UsersModule` (four new files) and register it in `app.module.ts`. No schema change,
no new dependency, no shared-types edit.

---

## Step 0 — Pre-flight

### 0-A — Confirm Tasks 3-1 and 3-2 are merged

```powershell
git log --oneline -8
```

Expected: commits for Task 3-1 (`feat(api): add global PrismaModule + ConfigModule...`) and Task 3-2
(`feat(api): add /health endpoint and wire prefix, CORS, and ValidationPipe`) appear in history.
These are hard preconditions: `PrismaService` must be injectable and the global `ValidationPipe`
(`whitelist`, `forbidNonWhitelisted`, `transform`) must be registered. If either is absent, **STOP**.

### 0-B — Baseline build is green

```powershell
npm run build
npm test
npm run lint
```

All three must pass before any file is created. A pre-existing failure must be resolved first — it is
not attributable to this task.

### 0-C — Confirm PrismaService path

The build in 0-B having passed is the proof. Optionally confirm the file exists:

```powershell
Test-Path apps\api\src\app\prisma\prisma.service.ts
```

Expected: `True`. If `False`, Task 3-1 is incomplete — STOP.

### 0-D — Files to open before starting

- `apps/api/src/app/prisma/prisma.service.ts` — PrismaService class shape to mirror for injection.
- `apps/api/src/app/app.module.ts` — current `@Module` shape; this task adds `UsersModule` to `imports`.
- `apps/api/src/app/app.controller.ts` — `@Controller` / `@Get` / `@Put` / `@Param` / `@Body` decorator style to mirror.
- `libs/shared-types/src/lib/weather.ts` — `UserPreferences`, `UnitSystem` shapes.
- `libs/shared-types/src/lib/requests.ts` — `UpdatePreferencesRequest` shape (single field `unitSystem: UnitSystem`).

---

## Step 1 — Create the DTO class

**File:** `apps/api/src/app/users/dto/update-preferences.dto.ts` (new file; also creates the
`users/dto/` directory tree).

The class implements `UpdatePreferencesRequest` from `@nimbus/shared-types`. It adds only `class-validator`
decorators — no field is declared beyond what the interface already defines.

```ts
import { IsIn } from 'class-validator';
import type { UpdatePreferencesRequest } from '@nimbus/shared-types';
import type { UnitSystem } from '@nimbus/shared-types';

export class UpdatePreferencesDto implements UpdatePreferencesRequest {
  @IsIn(['imperial', 'metric'])
  unitSystem!: UnitSystem;
}
```

Rules to enforce:
- Class name ends in `Dto` by convention; the `implements UpdatePreferencesRequest` binding is
  load-bearing — it causes a compile error if the interface gains a field and the class does not.
- `@IsIn(['imperial', 'metric'])` is the exact constraint — no `@IsString()` duplication needed; the
  literal union is sufficient for the two-value set.
- The `!` non-null assertion satisfies strict mode; `class-transformer` (`transform: true` in the pipe)
  materialises the value at runtime.
- No `@IsOptional()`, no extra decorators, no extra fields.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. A type error here means either the import path is wrong or the field name
diverges from the interface — fix before proceeding.

---

## Step 2 — Create PreferenceService

**File:** `apps/api/src/app/users/preference.service.ts` (new file).

The service is `@Injectable()`, injects `PrismaService`, and exposes exactly two public methods
returning the `UserPreferences` shape (`{ userId, unitSystem }` — timestamps are **not** exposed).

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UserPreferences, UpdatePreferencesRequest } from '@nimbus/shared-types';

@Injectable()
export class PreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<UserPreferences> {
    const existing = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    if (existing) {
      return { userId: existing.userId, unitSystem: existing.unitSystem as UserPreferences['unitSystem'] };
    }
    const created = await this.prisma.userPreference.create({
      data: { userId, unitSystem: 'imperial' },
    });
    return { userId: created.userId, unitSystem: created.unitSystem as UserPreferences['unitSystem'] };
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesRequest,
  ): Promise<UserPreferences> {
    const upserted = await this.prisma.userPreference.upsert({
      where: { userId },
      update: { unitSystem: dto.unitSystem },
      create: { userId, unitSystem: dto.unitSystem },
    });
    return { userId: upserted.userId, unitSystem: upserted.unitSystem as UserPreferences['unitSystem'] };
  }
}
```

Key design notes:
- `getPreferences` uses `findUnique` + `create` (not upsert) so the auto-create-on-first-read path is
  explicit and the default `'imperial'` comes from the service, matching the §0.4 invariant.
- `updatePreferences` uses `upsert` so `PUT`-before-`GET` still creates the row.
- The `as UserPreferences['unitSystem']` cast bridges Prisma's `String` column type to the
  `'imperial' | 'metric'` literal union — no runtime work, just a type annotation.
- Neither method exposes `createdUtc` or `updatedUtc` (per the Phase 2 handoff: persistence-only
  bookkeeping columns, not in the API contract).
- The injection token is `PrismaService` by class reference — no string token needed because
  `PrismaModule` is `@Global()` from Task 3-1.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. A type error on `prisma.userPreference` means the generated client is stale —
run `npx prisma generate` (no migration needed) and rebuild.

---

## Step 3 — Create UsersController

**File:** `apps/api/src/app/users/users.controller.ts` (new file).

Mirrors the `@Controller` / `@Get` / `@Put` / `@Param` / `@Body` decorator style from
`apps/api/src/app/app.controller.ts`.

```ts
import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { PreferenceService } from './preference.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import type { UserPreferences } from '@nimbus/shared-types';

@Controller('users')
export class UsersController {
  constructor(private readonly preferenceService: PreferenceService) {}

  @Get(':userId/preferences')
  getPreferences(@Param('userId') userId: string): Promise<UserPreferences> {
    return this.preferenceService.getPreferences(userId);
  }

  @Put(':userId/preferences')
  updatePreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    return this.preferenceService.updatePreferences(userId, dto);
  }
}
```

Key design notes:
- `@Controller('users')` + the global prefix `api` (from Task 3-2 `main.ts`) resolves to
  `/api/users/:userId/preferences` — matching §0.2 endpoints #4 and #5 exactly.
- `@Body() dto: UpdatePreferencesDto` — the global `ValidationPipe` (Task 3-2, `whitelist: true`,
  `forbidNonWhitelisted: true`, `transform: true`) validates and transforms the incoming body against
  the DTO class before the method is entered. An unknown field or an out-of-range `unitSystem` is
  rejected with `400 Bad Request` automatically.
- Both handlers return `Promise<UserPreferences>` — NestJS serializes this to JSON with the JS default
  camelCase keys (`userId`, `unitSystem`), matching the §0.2 contract. No extra serializer is added.
- Task 3-5 will add saved-location handlers to this same controller; the constructor injection of
  `PreferenceService` will stay untouched.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. A missing-decorator import or a wrong import path surfaces here.

---

## Step 4 — Create UsersModule

**File:** `apps/api/src/app/users/users.module.ts` (new file).

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PreferenceService } from './preference.service';

@Module({
  controllers: [UsersController],
  providers: [PreferenceService],
})
export class UsersModule {}
```

Key design notes:
- `PrismaService` is injected into `PreferenceService` via the `@Global()` `PrismaModule` (Task 3-1)
  — it does not need to appear in `imports` here.
- `PreferenceService` is listed in `providers` so NestJS resolves it when `UsersController` requests
  it. It is not exported because no other module consumes it yet.
- Task 3-5 will add `SavedLocationService` (or an equivalent) to `providers` in this same module
  without touching the controller or the existing providers.

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 5 — Register UsersModule in AppModule

**File:** `apps/api/src/app/app.module.ts` (modify existing).

Read the current file first (done in pre-flight), then add `UsersModule` to the `imports` array.

Current file after Tasks 3-1 and 3-2:

```ts
import { Module } from '@nestjs/common';
// ... existing imports (ConfigModule, PrismaModule, HealthController, etc.)

@Module({
  imports: [/* ConfigModule.forRoot(...), PrismaModule, ... */],
  controllers: [/* HealthController, ... */],
  providers: [/* ... */],
})
export class AppModule {}
```

Add the import and register:

```ts
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    /* existing imports unchanged */
    UsersModule,
  ],
  // controllers and providers unchanged
})
export class AppModule {}
```

The exact existing imports/controllers/providers must be preserved — only add `UsersModule` to the
`imports` array and the corresponding `import` statement at the top of the file.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. NestJS dependency resolution failures (e.g. `PrismaService` not found) would
surface here — they indicate `PrismaModule` is not `@Global()` yet (Task 3-1 regression).

---

## Step 6 — Manual smoke test against the live API

This step requires local Postgres to be running (same pre-condition as prior tasks).

Start the API:

```powershell
npx nx serve api
```

Wait for `Nest application successfully started` (port 3000).

**Test endpoint #4 — first read auto-creates an imperial row:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users/anonymous/preferences" -Method GET | ConvertTo-Json
```

Expected response (HTTP 200):

```json
{ "userId": "anonymous", "unitSystem": "imperial" }
```

**Test endpoint #5 — update unit system:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users/anonymous/preferences" -Method PUT -ContentType "application/json" -Body '{"unitSystem":"metric"}' | ConvertTo-Json
```

Expected response (HTTP 200):

```json
{ "userId": "anonymous", "unitSystem": "metric" }
```

**Test idempotency — subsequent GET returns persisted value:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users/anonymous/preferences" -Method GET | ConvertTo-Json
```

Expected response (HTTP 200):

```json
{ "userId": "anonymous", "unitSystem": "metric" }
```

**Test validation — unknown field rejected:**

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/users/anonymous/preferences" -Method PUT -ContentType "application/json" -Body '{"unitSystem":"metric","extraField":"bad"}'
} catch {
  $_.Exception.Response.StatusCode
}
```

Expected: `400` (Bad Request — `forbidNonWhitelisted` rejects `extraField`).

**Test validation — invalid unitSystem rejected:**

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/users/anonymous/preferences" -Method PUT -ContentType "application/json" -Body '{"unitSystem":"fahrenheit"}'
} catch {
  $_.Exception.Response.StatusCode
}
```

Expected: `400` (Bad Request — `@IsIn(['imperial','metric'])` rejects `'fahrenheit'`).

Stop the API server (`Ctrl+C`) after the smoke tests pass.

**Verify:** All five requests above produce the expected responses. If a `500` appears instead of
`400`, the global `ValidationPipe` is not active — confirm Task 3-2 is merged. If a `404` appears,
the route registration failed — confirm `UsersModule` is in `app.module.ts` imports.

---

## Step 7 — Full build / lint / test gate

```powershell
npm run build
```

Expected: exits 0 across the full workspace (api + web + shared-types).

```powershell
npm run lint
```

Expected: exits 0. Fix any lint violations (unused imports, missing semicolons per project config)
before committing.

```powershell
npm test
```

Expected: exits 0. No new test files are added in this task (integration tests are Phase 6);
`passWithNoTests` keeps the api project green.

**Verify:** All three commands exit 0 on the post-implementation workspace.

---

## Step 8 — Diff sanity check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new files (untracked → to be staged):**

- `apps/api/src/app/users/dto/update-preferences.dto.ts`
- `apps/api/src/app/users/preference.service.ts`
- `apps/api/src/app/users/users.controller.ts`
- `apps/api/src/app/users/users.module.ts`

**Expected modified file:**

- `apps/api/src/app/app.module.ts`

**Must NOT appear in the diff:**

- `prisma/schema.prisma` or anything under `prisma/migrations/`
- `libs/shared-types/**` (read-only)
- `apps/api/src/main.ts` (Task 3-2, not touched here)
- Any file outside `apps/api/src/app/users/` and `apps/api/src/app/app.module.ts`

If unexpected files appear, investigate before staging.

### Stage and commit

```powershell
git add apps/api/src/app/users/ apps/api/src/app/app.module.ts
git status
```

Confirm only the five expected files are staged.

```powershell
git commit -m "feat(api): add UsersModule preferences (GET/PUT) with auto-create-on-read

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
edits. build/lint/test green."
```

No `Co-Authored-By` trailer.

**Verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit above is HEAD; the stat shows exactly 5 files (4 new + 1 modified) under
`apps/api/src/app/`.

---

## Summary of gates

| Step | Gate |
|------|------|
| 0-A | Tasks 3-1 + 3-2 commits present in `git log` — STOP if absent |
| 0-B | `npm run build` + `npm test` + `npm run lint` green at baseline |
| 0-C | `apps/api/src/app/prisma/prisma.service.ts` exists |
| 1 | `npm run build` green after DTO class created |
| 2 | `npm run build` green after `PreferenceService` created |
| 3 | `npm run build` green after `UsersController` created |
| 4 | `npm run build` green after `UsersModule` created |
| 5 | `npm run build` green after `AppModule` updated |
| 6 | Smoke tests: GET returns `imperial` on first read; PUT updates; validation rejects bad bodies with `400` |
| 7 | `npm run build` + `npm run lint` + `npm test` green on full workspace |
| 8 | `git diff --stat HEAD` shows exactly 5 files; commit message matches Tasks doc; no Co-Authored-By trailer |
