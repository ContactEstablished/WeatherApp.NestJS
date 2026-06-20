# Impl 1-2 — Add the four §0.2-derived request DTOs and export them through the barrel

**Acceptance contract:** `docs/tasks/Tasks-1-2.md`
**Decision lock:** RoadMap.md §Phase 1 "Decisions needed" — all three recommendations are locked defaults: plain alias for `UpdateSavedLocationRequest`, `@nimbus` scope kept, separate `requests.ts` file. No ADR file exists; the roadmap is the sole locked source.
**Scope:** Add `libs/shared-types/src/lib/requests.ts` with four pure-type request DTO declarations; extend `libs/shared-types/src/index.ts` with one barrel re-export line. No schema change. No new dependency.

---

## Step 0 — Pre-flight

**STOP if Task 1-1 has not landed.** This task has a hard precondition: Task 1-1 must have written the nine §0.3 response interfaces and the `UnitSystem` union into the library, and the barrel must already re-export them. Verify before touching anything.

Check all of the following are present:

| File / symbol | Confirms |
|---|---|
| `libs/shared-types/src/lib/weather.ts` | Task 1-1 created the response-types source file |
| `libs/shared-types/src/index.ts` contains `export * from './lib/weather'` (or equivalent) | Task 1-1 wired the barrel |
| `UnitSystem` exported from `@nimbus/shared-types` (i.e. declared in `weather.ts`) | The type this task reuses exists |
| `libs/shared-types/src/lib/weather.ts` does **not** export any of the four request DTOs | No overlap with this task's scope |

If `libs/shared-types/src/lib/weather.ts` is absent, or if `libs/shared-types/src/index.ts` still contains only the Phase 0 placeholder (`SHARED_TYPES_PLACEHOLDER`), then Task 1-1 has not landed. **STOP. Flag it and do not proceed.**

If all are present, confirm the working branch is clean:

```
git status
```

Expected: `nothing to commit, working tree clean`. If not, stash or commit outstanding changes first.

Run the baseline verify commands and confirm all three pass:

```
npm run build
npm run lint
npm test
```

All three must exit 0 before proceeding. Note any pre-existing lint warnings so you can distinguish them from anything this task introduces.

**Files to open before starting:**
- `libs/shared-types/src/lib/weather.ts` — read the `UnitSystem` declaration in full; confirm its exact spelling and position in the file.
- `libs/shared-types/src/index.ts` — read the current barrel; note the exact re-export path pattern used (e.g. `'./lib/weather'`) so the new line for `requests.ts` mirrors it.
- `docs/RoadMap.md` lines 55–71 — the §0.2 REST contract table; confirm endpoint #5, #7, #8, #11 body shapes before typing anything.

**Verify:** git tree clean; `npm run build`, `npm run lint`, and `npm test` all exit 0; Task 1-1 output confirmed present.

---

## Step 1 — Create `libs/shared-types/src/lib/requests.ts`

Create a new file at exactly this path:

```
libs/shared-types/src/lib/requests.ts
```

Write the following content verbatim. The declarations must appear in this order (import first, then the four DTOs), using `import type` so the import erases at compile time:

```ts
import type { UnitSystem } from './weather';

export interface UpdatePreferencesRequest {
  unitSystem: UnitSystem;
}

export interface SaveLocationRequest {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export type UpdateSavedLocationRequest = SaveLocationRequest;

export interface ReorderSavedLocationsRequest {
  locationIds: number[];
}
```

Constraints to verify as you write:
- The `UnitSystem` import path must be `'./weather'` (relative, no extension) — matching the `import type` pattern the surrounding code uses.
- `isDefault` on `SaveLocationRequest` must carry `?` (optional); the other five fields (`name`, `region`, `country`, `latitude`, `longitude`) are required (no `?`).
- `UpdateSavedLocationRequest` is a `type` alias (`export type UpdateSavedLocationRequest = SaveLocationRequest;`), not an `interface` with `extends`. No additional fields are added.
- `locationIds` is plural, camelCase, type `number[]`. Do not rename to `ids` or `locationIDs`.
- No `enum`, no `class`, no `class-validator` or `class-transformer` decorators, no default values, no runtime code. No imports from `@angular/*`, `@nestjs/*`, or `@prisma/client`.
- Do not add `userId` or `id` fields — those are path parameters in §0.2, not body fields.

**Verify:** The file exists at `libs/shared-types/src/lib/requests.ts`. Run `npm run build` — must exit 0 (the new file must compile cleanly in isolation before wiring it into the barrel).

---

## Step 2 — Add the barrel re-export line to `libs/shared-types/src/index.ts`

Open `libs/shared-types/src/index.ts`. It currently contains (at minimum) the Task 1-1 barrel line re-exporting the response types. Add **one new line** beneath the existing re-export(s):

```ts
export * from './lib/requests';
```

The exact path must be `'./lib/requests'` — no extension, relative, matching the pattern used for the existing Task 1-1 re-export. Do not remove or reorder any existing lines. Do not add any other content.

After the edit the barrel should contain exactly the Task 1-1 re-export line(s) plus this new line. Example final shape (adjust if Task 1-1 used a different path):

```ts
export * from './lib/weather';
export * from './lib/requests';
```

**Verify:** Open `libs/shared-types/src/index.ts` and confirm both re-export lines are present and the file contains nothing else of substance. Run `npm run build` — must exit 0.

---

## Step 3 — Compile-time resolution check (throwaway — remove before commit)

Add a temporary type-only import to a file that goes through the TypeScript compiler, to confirm all four request DTO names resolve through `@nimbus/shared-types` and that the alias assignment compiles. Use the library's own barrel or a scratch file.

The simplest approach: open `libs/shared-types/src/index.ts` and temporarily append (at the bottom, clearly marked):

```ts
// TEMP — remove before commit
import type {
  UpdatePreferencesRequest,
  SaveLocationRequest,
  UpdateSavedLocationRequest,
  ReorderSavedLocationsRequest,
} from '@nimbus/shared-types';
type _AssignabilityCheck = UpdateSavedLocationRequest extends SaveLocationRequest
  ? SaveLocationRequest extends UpdateSavedLocationRequest
    ? true
    : never
  : never;
```

Run `npm run build`. It must exit 0 with no type errors. Specifically confirm:
- All four names resolve (no `TS2305: Module … has no exported member` errors).
- `_AssignabilityCheck` is `true` (the alias holds — `UpdateSavedLocationRequest` is mutually assignable with `SaveLocationRequest`).

If any error occurs, return to Step 1 and fix the declaration before proceeding.

**After the check passes, revert `libs/shared-types/src/index.ts` to its Step 2 state** — remove the temporary block entirely. Do not commit scratch type-check code.

**Verify:** Temporary import block removed. `npm run build` still exits 0 with the temporary code gone.

---

## Step 4 — Final verify: full suite

Run all three verify commands from the repo root:

```
npm run build
npm run lint
npm test
```

All three must exit 0.

Acceptance criteria checklist before committing:

1. `libs/shared-types/src/lib/requests.ts` exists and declares exactly four types: `UpdatePreferencesRequest` (interface, one field `unitSystem: UnitSystem`), `SaveLocationRequest` (interface, six fields, `isDefault` optional), `UpdateSavedLocationRequest` (plain type alias = `SaveLocationRequest`, no new fields), `ReorderSavedLocationsRequest` (interface, one field `locationIds: number[]`).
2. `UnitSystem` is imported via `import type { UnitSystem } from './weather';` — not re-declared.
3. `libs/shared-types/src/index.ts` contains `export * from './lib/requests';` alongside the Task 1-1 response re-export. All thirteen names (nine from Task 1-1 plus four from this task) resolve from `@nimbus/shared-types`.
4. `requests.ts` contains zero runtime code: no `enum`, no `class`, no decorators, no default values, no `@angular/*` / `@nestjs/*` / `@prisma/client` imports. The `UnitSystem` import is `import type` (erases at compile time).
5. The nine §0.3 response interfaces from Task 1-1 are unchanged (no field edits, no reordering, no additions).
6. The throwaway resolution-check code from Step 3 is not present in any committed file.
7. `npm run build` exits 0 (no type errors).
8. `npm run lint` exits 0 (no stray runtime code, no disallowed import).
9. `npm test` exits 0 (no new specs introduced; existing tests still pass).

Run a sanity diff to confirm only the expected files are changed:

```
git diff --stat
```

Expected changed/added files:

```
libs/shared-types/src/lib/requests.ts   (new file)
libs/shared-types/src/index.ts          (one line added)
```

No files under `apps/web/`, `apps/api/`, `prisma/`, or any config file (`tsconfig.base.json`, `nx.json`, `package.json`) should appear in the diff. If any do, review before committing.

**Verify:** All three commands green; diff shows exactly the two files above; no app source changes.

---

## Step 5 — Commit

Stage all changes and commit with the exact message from the Tasks doc:

```
git add libs/shared-types/src/lib/requests.ts libs/shared-types/src/index.ts
git commit -m "feat(shared-types): add §0.2 request DTOs and export via barrel

Add the four request DTO types derived from the mutating §0.2 endpoint
bodies — UpdatePreferencesRequest (#5), SaveLocationRequest (#7),
UpdateSavedLocationRequest = SaveLocationRequest (#8, alias keeps the
\"same body\" invariant), and ReorderSavedLocationsRequest (#11) — in
requests.ts, re-exported through the barrel.

Pure type-only declarations reusing the shared UnitSystem union: no
runtime code, no validation decorators (those land in Phase 3)."
```

No `Co-Authored-By` trailer (config sets `ai_coauthor_trailer: false`).

**Verify:** `git log --oneline -1` shows the commit. `git status` is clean.
