# Impl 3-5 — UsersModule: saved-location CRUD, reorder, set-default (endpoints #6–#11)

**Acceptance contract:** `docs/tasks/Tasks-3-5.md`
**Decision lock:** No ADR. Locked by `docs/RoadMap.md` §0.2 (endpoint contract), §0.4
(SavedLocation schema and invariants), §4 (Decimal→number boundary, two high-risk invariants),
and Phase 3 "contract fidelity is non-negotiable" constraint. `docs/handoffs/Phase-2-Handoff.md`
forbids schema edits.
**Scope:** Extend `UsersModule` in `apps/api` only — new DTO classes, a `SavedLocationService`
(or extended `PreferenceService`), and six new controller routes. No schema change, no new
dependency, no shared-types edit.

---

## Step 0 — Pre-flight

**All precondition tasks (3-1, 3-2, 3-4) must be committed to `main` before any edit is made.
If any are absent, STOP.**

### 0-A — Branch / precondition check

```powershell
git log --oneline -8
git status
```

Expected: working tree clean on `main`; the recent history includes the Task 3-4 commit
(`feat(api): add UsersModule preferences (GET/PUT) with auto-create-on-read`) and the Task 3-1
and 3-2 commits upstream of it. If any precondition task is absent from the log, STOP — this
task extends the module those tasks create.

### 0-B — Baseline build / test / lint green

```powershell
npm run build
npm test
npm run lint
```

All three must exit 0 before any file is touched. A pre-existing failure here is a regression
from a prior task — resolve it before continuing.

### 0-C — Files to open before starting

Verify these files exist and read them in full before writing any code:

| File | Purpose |
|------|---------|
| `apps/api/src/app/users/users.controller.ts` | The controller Task 3-5 extends (endpoints #4/#5 exist here) |
| `apps/api/src/app/users/preference.service.ts` | Established Prisma-injection pattern to mirror |
| `apps/api/src/app/users/dto/update-preferences.dto.ts` | DTO-class style (implements + class-validator) |
| `apps/api/src/app/users/users.module.ts` | Module to update if a new provider is added |
| `apps/api/src/app/prisma/prisma.service.ts` | Injection token for `prisma.savedLocation.*` |
| `libs/shared-types/src/lib/weather.ts` | `LocationSuggestion` interface |
| `libs/shared-types/src/lib/requests.ts` | `SaveLocationRequest`, `ReorderSavedLocationsRequest` |

**STOP if any of the above files do not exist** — the precondition tasks have not been completed.

---

## Step 1 — Create `SaveLocationDto` class

**File:** `apps/api/src/app/users/dto/save-location.dto.ts` (new file)

Import `SaveLocationRequest` from `@nimbus/shared-types` and implement it with `class-validator`
decorators. The `@IsNumber()` decorator accepts the numeric literal types that `class-transformer`
produces when the global pipe has `transform: true`; also add range constraints with
`@Min`/`@Max` to satisfy acceptance criterion 1.

```typescript
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import type { SaveLocationRequest } from '@nimbus/shared-types';

export class SaveLocationDto implements SaveLocationRequest {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  region!: string;

  @IsString()
  @MinLength(1)
  country!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
```

`UpdateSavedLocationRequest = SaveLocationRequest` (a plain type alias in shared-types), so
endpoint #8 reuses this same `SaveLocationDto` class with no additional DTO file needed — see
acceptance criterion 1.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The new DTO file must compile with no type errors against the
`@nimbus/shared-types` interface.

---

## Step 2 — Create `ReorderSavedLocationsDto` class

**File:** `apps/api/src/app/users/dto/reorder-saved-locations.dto.ts` (new file)

```typescript
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';
import type { ReorderSavedLocationsRequest } from '@nimbus/shared-types';

export class ReorderSavedLocationsDto implements ReorderSavedLocationsRequest {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  locationIds!: number[];
}
```

`@IsArray()` rejects non-array values; `@IsInt({ each: true })` rejects non-integer elements.
Under the Task 3-2 global pipe (`whitelist`, `forbidNonWhitelisted`, `transform`), unknown fields
are rejected and each element is validated.

**Verify:**

```powershell
npm run build
```

Expected: exits 0.

---

## Step 3 — Create `SavedLocationService`

**File:** `apps/api/src/app/users/saved-location.service.ts` (new file)

This service owns all six saved-location operations and the three invariants: the
`Decimal`→`number` conversion, the single-default-per-user atomic transaction, and the
contiguous `sortOrder` rewrite. Inject `PrismaService` exactly as `PreferenceService` does.

The helper `toLocationSuggestion` converts a raw Prisma `SavedLocation` row to the
`LocationSuggestion` shape, applying `Number(row.latitude)` and `Number(row.longitude)` at the
boundary (acceptance criterion 8).

The Prisma unique-constraint error for `(userId, name, region)` is code `P2002`; catch it and
rethrow as `ConflictException` (acceptance criterion 9).

```typescript
import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { LocationSuggestion, SaveLocationRequest } from '@nimbus/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedLocationService {
  constructor(private readonly prisma: PrismaService) {}

  private toLocationSuggestion(row: {
    id: number;
    name: string;
    region: string;
    country: string;
    latitude: Prisma.Decimal;
    longitude: Prisma.Decimal;
    isDefault: boolean;
    sortOrder: number;
  }): LocationSuggestion {
    return {
      id: row.id,
      name: row.name,
      region: row.region,
      country: row.country,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
    };
  }

  async listLocations(userId: string): Promise<LocationSuggestion[]> {
    const rows = await this.prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => this.toLocationSuggestion(r));
  }

  async createLocation(userId: string, dto: SaveLocationRequest): Promise<void> {
    try {
      const count = await this.prisma.savedLocation.count({ where: { userId } });
      await this.prisma.savedLocation.create({
        data: {
          userId,
          name: dto.name,
          region: dto.region,
          country: dto.country,
          latitude: dto.latitude,
          longitude: dto.longitude,
          isDefault: dto.isDefault ?? false,
          sortOrder: count,
        },
      });
      if (dto.isDefault) {
        await this.enforceDefaultInvariant(userId, -1 /* placeholder — see below */);
      }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A location with this name and region already exists for this user.');
      }
      throw e;
    }
  }

  async updateLocation(userId: string, id: number, dto: SaveLocationRequest): Promise<void> {
    try {
      await this.prisma.savedLocation.update({
        where: { id, userId },
        data: {
          name: dto.name,
          region: dto.region,
          country: dto.country,
          latitude: dto.latitude,
          longitude: dto.longitude,
          isDefault: dto.isDefault ?? false,
        },
      });
      if (dto.isDefault) {
        await this.enforceDefaultInvariant(userId, id);
      }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A location with this name and region already exists for this user.');
      }
      throw e;
    }
  }

  async deleteLocation(userId: string, id: number): Promise<void> {
    await this.prisma.savedLocation.delete({ where: { id, userId } });
  }

  async setDefault(userId: string, id: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.savedLocation.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      }),
      this.prisma.savedLocation.update({
        where: { id, userId },
        data: { isDefault: true },
      }),
    ]);
  }

  async reorderLocations(userId: string, locationIds: number[]): Promise<void> {
    const updates = locationIds.map((locId, index) =>
      this.prisma.savedLocation.update({
        where: { id: locId, userId },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
  }

  private async enforceDefaultInvariant(userId: string, keepId: number): Promise<void> {
    await this.prisma.savedLocation.updateMany({
      where: { userId, id: { not: keepId }, isDefault: true },
      data: { isDefault: false },
    });
  }
}
```

**Implementation notes:**

- `createLocation`: after a successful insert, if `isDefault` is true the invariant enforcement
  pass must know the new row's id. Refactor to retrieve the created row's `id` and pass it to
  `enforceDefaultInvariant`. The simplest correct implementation runs the create in a `$transaction`
  together with the `updateMany` that clears other defaults — see the revision note below.

- **Revised `createLocation` — atomic single-default on create.** Because Prisma's interactive
  transactions return values, use `prisma.$transaction(async (tx) => { ... })` for both create
  and the optional default-clear. Replace the `create` + `enforceDefaultInvariant` two-step with:

  ```typescript
  async createLocation(userId: string, dto: SaveLocationRequest): Promise<void> {
    try {
      const count = await this.prisma.savedLocation.count({ where: { userId } });
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.savedLocation.create({
          data: {
            userId,
            name: dto.name,
            region: dto.region,
            country: dto.country,
            latitude: dto.latitude,
            longitude: dto.longitude,
            isDefault: dto.isDefault ?? false,
            sortOrder: count,
          },
        });
        if (dto.isDefault) {
          await tx.savedLocation.updateMany({
            where: { userId, id: { not: created.id }, isDefault: true },
            data: { isDefault: false },
          });
        }
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A location with this name and region already exists for this user.');
      }
      throw e;
    }
  }
  ```

- **Revised `updateLocation` — atomic single-default on update.** Same pattern: wrap the
  `update` and the conditional `updateMany` in an interactive `$transaction(async (tx) => { ... })`.

- **`setDefault`**: uses the array form of `$transaction` (non-interactive) as shown — two
  operations, atomically. After the call, exactly one row for `userId` has `isDefault = true`.

- **`reorderLocations`**: runs all `update` operations atomically. The resulting `sortOrder`
  values are `0, 1, 2, …` in the order of `locationIds` (contiguous, zero-based). A subsequent
  `listLocations` (ordered by `sortOrder asc`) returns rows in exactly the new order.

- **Remove the `private enforceDefaultInvariant` helper** once the two callers are inlined into
  their respective `$transaction` blocks — it is shown in the initial sketch for clarity but the
  final file should not keep dead code.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. Type-check the `Prisma.Decimal` reference — `Prisma` (the namespace) is
imported from `@prisma/client`; `Prisma.PrismaClientKnownRequestError` and `Prisma.Decimal` are
correct paths in Prisma 6.x.

---

## Step 4 — Register `SavedLocationService` in `UsersModule`

**File:** `apps/api/src/app/users/users.module.ts` (modify)

Add `SavedLocationService` to the `providers` array. The module already imports `PrismaModule`
(from Task 3-4) so no additional imports are needed.

```typescript
import { SavedLocationService } from './saved-location.service';

// In the @Module decorator:
providers: [PreferenceService, SavedLocationService],
```

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The new provider must resolve without circular-dependency errors.

---

## Step 5 — Add endpoints #6–#11 to `UsersController`

**File:** `apps/api/src/app/users/users.controller.ts` (modify)

Inject `SavedLocationService` alongside the existing `PreferenceService`. Add six route handlers
in dependency order: `GET` (list) first, then `POST` (create), then `PUT /:id` (update), then
`DELETE /:id`, then `PUT /:id/default`, then `PUT /reorder` last.

**Route ordering is critical:** NestJS/Express matches routes top-to-bottom. `PUT /reorder` must
be declared **before** `PUT /:id` — otherwise `:id` captures the literal string `"reorder"` and
the request is mis-routed. Place the `reorder` handler immediately before the `/:id` handler.

New imports to add at the top of the controller:

```typescript
import { Body, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { SavedLocationService } from './saved-location.service';
import { SaveLocationDto } from './dto/save-location.dto';
import { ReorderSavedLocationsDto } from './dto/reorder-saved-locations.dto';
import type { LocationSuggestion } from '@nimbus/shared-types';
```

Route handlers to add (append after the existing `#4`/`#5` handlers):

```typescript
// #6 — GET /api/users/:userId/locations
@Get(':userId/locations')
getLocations(@Param('userId') userId: string): Promise<LocationSuggestion[]> {
  return this.savedLocationService.listLocations(userId);
}

// #7 — POST /api/users/:userId/locations  (204 No Content)
@Post(':userId/locations')
@HttpCode(204)
async createLocation(
  @Param('userId') userId: string,
  @Body() dto: SaveLocationDto,
): Promise<void> {
  await this.savedLocationService.createLocation(userId, dto);
}

// #11 — PUT /api/users/:userId/locations/reorder  (204 No Content)
// MUST precede /:id to avoid ":id" capturing "reorder"
@Put(':userId/locations/reorder')
@HttpCode(204)
async reorderLocations(
  @Param('userId') userId: string,
  @Body() dto: ReorderSavedLocationsDto,
): Promise<void> {
  await this.savedLocationService.reorderLocations(userId, dto.locationIds);
}

// #10 — PUT /api/users/:userId/locations/:id/default  (204 No Content)
@Put(':userId/locations/:id/default')
@HttpCode(204)
async setDefault(
  @Param('userId') userId: string,
  @Param('id') id: string,
): Promise<void> {
  await this.savedLocationService.setDefault(userId, parseInt(id, 10));
}

// #8 — PUT /api/users/:userId/locations/:id  (204 No Content)
@Put(':userId/locations/:id')
@HttpCode(204)
async updateLocation(
  @Param('userId') userId: string,
  @Param('id') id: string,
  @Body() dto: SaveLocationDto,
): Promise<void> {
  await this.savedLocationService.updateLocation(userId, parseInt(id, 10), dto);
}

// #9 — DELETE /api/users/:userId/locations/:id  (204 No Content)
@Delete(':userId/locations/:id')
@HttpCode(204)
async deleteLocation(
  @Param('userId') userId: string,
  @Param('id') id: string,
): Promise<void> {
  await this.savedLocationService.deleteLocation(userId, parseInt(id, 10));
}
```

**Route-ordering checklist (read before saving):**

1. `PUT :userId/locations/reorder` — declared first among the `PUT /:id*` family.
2. `PUT :userId/locations/:id/default` — declared before `PUT :userId/locations/:id`.
3. `PUT :userId/locations/:id` — declared after both specific `PUT` routes above.
4. `DELETE :userId/locations/:id` — position relative to other `DELETE` routes is unrestricted.
5. The existing `#4` `GET :userId/preferences` and `#5` `PUT :userId/preferences` handlers are
   unchanged and still present.

**Verify:**

```powershell
npm run build
npm run lint
```

Both must exit 0. Check especially that no implicit `any` escapes through the `parseInt` calls
(TypeScript strict mode is on; `@Param` returns `string`, `parseInt(id, 10)` returns `number`).

---

## Step 6 — Smoke-check route registration manually

With the NestJS app runnable (assuming Tasks 3-1 and 3-2 have the app booting), start the API
and curl the list endpoint to confirm routing is wired:

```powershell
# In one terminal:
npx nx serve api

# In another terminal:
curl -s http://localhost:3000/api/users/anonymous/locations
```

Expected: `[]` (empty array, HTTP 200). An empty list must return `[]`, not a 404 (acceptance
criterion 2).

```powershell
# Test the POST endpoint returns 204:
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/users/anonymous/locations \
  -H "Content-Type: application/json" \
  -d '{"name":"San Francisco","region":"California","country":"US","latitude":37.7749,"longitude":-122.4194}'
```

Expected: `204`.

```powershell
# Test that a duplicate returns 409:
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/users/anonymous/locations \
  -H "Content-Type: application/json" \
  -d '{"name":"San Francisco","region":"California","country":"US","latitude":37.7749,"longitude":-122.4194}'
```

Expected: `409`.

```powershell
# Test that a malformed body (out-of-range latitude) returns 400:
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/users/anonymous/locations \
  -H "Content-Type: application/json" \
  -d '{"name":"Bad","region":"R","country":"US","latitude":999,"longitude":0}'
```

Expected: `400`.

```powershell
# GET after POST — confirm latitude/longitude are numeric (not strings or Decimal objects):
curl -s http://localhost:3000/api/users/anonymous/locations
```

Expected: a JSON array where each item's `latitude` and `longitude` are JSON numbers (e.g.
`"latitude": 37.7749`), not quoted strings or objects.

**Verify:** all four curl checks return the expected status codes / shapes. If the serve step
is not yet runnable (Tasks 3-1 / 3-2 not fully wired), skip the curl checks and proceed to the
build/test gate — the curl verification can be done in a follow-up manual pass before the commit.

---

## Step 7 — Full build / lint / test gate

```powershell
npm run build
```

Expected: exits 0 across the workspace. No type errors in the new DTO files, the service, or
the controller.

```powershell
npm run lint
```

Expected: exits 0. Check especially that:
- No unused imports remain in any edited file.
- `class-validator` decorators are from the correct package (not accidentally imported from
  `class-transformer`).
- The `SavedLocationService` file has no eslint `@typescript-eslint/no-explicit-any` violations
  (all Prisma row types are inferred or explicitly typed via the `toLocationSuggestion` helper
  parameter signature).

```powershell
npm test
```

Expected: exits 0. No new test files are added in this task (dedicated integration tests for
the invariants are Phase 6 — acceptance criterion 12).

**Verify:** all three commands exit 0.

---

## Step 8 — Diff sanity check and commit

### Verify the diff touches only the expected files

```powershell
git diff --stat HEAD
git status
```

**Expected new files (untracked → staged):**

- `apps/api/src/app/users/dto/save-location.dto.ts`
- `apps/api/src/app/users/dto/reorder-saved-locations.dto.ts`
- `apps/api/src/app/users/saved-location.service.ts`

**Expected modified files:**

- `apps/api/src/app/users/users.controller.ts`
- `apps/api/src/app/users/users.module.ts`

**Must NOT appear in the diff:**

- `prisma/schema.prisma` or `prisma/migrations/` (no schema edits — acceptance criterion 11)
- `libs/shared-types/**` (no shared-types edits)
- `package.json` (no new dependency)
- Any file outside `apps/api/src/app/users/`

If any unexpected file appears, investigate and revert before staging.

### Stage and commit

```powershell
git add apps/api/src/app/users/dto/save-location.dto.ts
git add apps/api/src/app/users/dto/reorder-saved-locations.dto.ts
git add apps/api/src/app/users/saved-location.service.ts
git add apps/api/src/app/users/users.controller.ts
git add apps/api/src/app/users/users.module.ts
```

Confirm staged set:

```powershell
git status
```

Expected: exactly the five files above staged, nothing else.

```powershell
git commit -m "feat(api): add saved-location CRUD, reorder, and set-default (endpoints #6-#11)

Complete the §0.2 contract over the Phase 2 saved_locations table:

- GET /api/users/:userId/locations -> LocationSuggestion[] ordered by
  sortOrder; POST/PUT/:id/DELETE/:id/PUT/:id/default/PUT/reorder all return
  204 No Content.
- Invariants: single default per user (set-default atomically clears the
  others in a \$transaction); contiguous sortOrder rewrite on reorder
  (atomic); no duplicate (userId, name, region) surfaced as 409 from the
  Phase 2 @@unique.
- Decimal -> number conversion for latitude/longitude at the response
  boundary so JSON matches LocationSuggestion (§4).
- SaveLocationRequest and ReorderSavedLocationsRequest DTO classes
  implement the @nimbus/shared-types interfaces with class-validator
  decorators (#8 reuses SaveLocationRequest).

camelCase JSON, empty 204 bodies. No schema edits. Invariant integration
tests are Phase 6. build/lint/test green."
```

No `Co-Authored-By` trailer.

**Final verify:**

```powershell
git log --oneline -3
git show --stat HEAD
```

Expected: the commit message above appears at HEAD; the stat shows exactly five files changed
(three new, two modified) — all within `apps/api/src/app/users/`.

---

## Summary of gates

| Step | Gate |
|------|------|
| 0-A | `git log` shows Task 3-4 commit; `git status` clean |
| 0-B | `npm run build` + `npm test` + `npm run lint` green at baseline |
| 0-C | All five precondition files exist and are readable |
| 1 | `save-location.dto.ts` created; `npm run build` exits 0 |
| 2 | `reorder-saved-locations.dto.ts` created; `npm run build` exits 0 |
| 3 | `saved-location.service.ts` created; `npm run build` exits 0 |
| 4 | `users.module.ts` updated with `SavedLocationService`; `npm run build` exits 0 |
| 5 | `users.controller.ts` updated (six routes, correct ordering); `npm run build` + `npm run lint` exit 0 |
| 6 | Smoke curl: `GET /locations` → `[]`; `POST` → 204; duplicate → 409; bad lat → 400; JSON has numeric lat/lon |
| 7 | `npm run build` + `npm run lint` + `npm test` green post-implementation |
| 8 | `git diff --stat` shows exactly 5 files in `apps/api/src/app/users/`; commit message matches Tasks doc |
