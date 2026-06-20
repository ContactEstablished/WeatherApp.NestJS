# Task 1-2 — Add the four §0.2-derived request DTOs and export them through the barrel

## Surface
Shared library only — `libs/shared-types` (extends the contract started in Task 1-1 with the request
side). No app, controller, service, or DB code is touched.

## Why
Task 1-1 brought in the §0.3 **response** types; this task adds the **request** side — the four DTO
types derived from the bodies of the mutating §0.2 endpoints (#5 preferences update, #7 save location,
#8 update saved location, #11 reorder). With both halves in `@nimbus/shared-types`, every mutating
endpoint has a single compile-time-shared body type that the Angular `WeatherApiService` (Phase 4) and
the Nest `UsersController` DTO classes (Phase 3) are both held to, so request bodies cannot drift from
the contract. The DTO types are kept as **pure interfaces/aliases** here; runtime validation
(`class-validator`) is deliberately deferred to Phase 3.

## Depends on
- **Task 1-1** (`docs/tasks/Tasks-1-1.md`) — the `libs/shared-types` source layout and the
  `index.ts` barrel must already exist; this task reuses the exported `UnitSystem` type and extends
  the barrel.
- **Roadmap Phase 1 — Shared contract** (`docs/RoadMap.md`), the "Request DTO types — derived from
  the §0.2 endpoint bodies" scope item, the "Decisions needed" block, the "Constraint", and the
  "Out of scope" / "Success criteria" sub-sections.
- **Roadmap §0.2 REST contract** (`docs/RoadMap.md` lines ~55–72) — the authoritative endpoint body
  shapes (#5, #7, #8, #11) the four DTOs are derived from.
- **Phase 0 — Bootstrap** — same `libs/shared-types` + `@nimbus/shared-types` alias precondition as
  Task 1-1 (see "Precondition / blocker").
- No ADRs exist in `docs/decisions/` and no handoff exists in `docs/handoffs/` (both directories are
  absent); the roadmap's "Decisions needed" recommendations are the locked defaults — see below.

## Precondition / blocker — VERIFY BEFORE STARTING
> Same precondition as Task 1-1: Phase 0 must have produced the Nx workspace, the `libs/shared-types`
> project, and the `@nimbus/shared-types` path alias, **and** Task 1-1 must have landed the response
> types and the barrel. As of this planning pass none of that exists in the repo (only `README.md`,
> `CLAUDE.md`, `.gitignore`, `docs/`, `.claude/`). If Task 1-1 / Phase 0 have not landed, this task is
> **blocked** — flag and stop; do not hand-scaffold the workspace.
>
> The §0.2 endpoint bodies in `docs/RoadMap.md` are the canonical source for the DTO shapes (the
> original `weatherApi.ts` / controller code is not present in this repo).

## Locked decisions (from the roadmap's "Decisions needed" — recorded so the implementer does not re-litigate)
- **`UpdateSavedLocationRequest` typing → plain alias (LOCKED DEFAULT).**
  `export type UpdateSavedLocationRequest = SaveLocationRequest;`. §0.2 endpoint #8 is documented as
  "same body as POST", so a plain alias keeps that invariant self-documenting and impossible to drift.
  Only switch to `extends` if a field genuinely diverges later (it does not in this phase).
- **`@nimbus` scope → keep (LOCKED DEFAULT).** Matches §1 and the `nimbus-weather` workspace name.
  *Human sign-off only needed* if the eventually-published npm package scope differs from `@nimbus`;
  if you discover Phase 0 used a different scope in the path alias, STOP and confirm rather than
  renaming.
- **File placement → separate `requests.ts` (LOCKED DEFAULT).** Put the four request DTOs in their
  own `libs/shared-types/src/lib/requests.ts`, re-exported through the barrel. This keeps the §0.3
  response block (Task 1-1) a clean verbatim copy and the §0.2-derived request DTOs visibly distinct.

## Required reading
- `docs/RoadMap.md` — §0.2 REST contract table (endpoint bodies for #5, #7, #8, #11) and the Phase 1
  "Request DTO types" scope bullet. **Mirror:** the exact field names, types, and optionality given
  for each endpoint body.
- `docs/tasks/Tasks-1-1.md` — the response-types task. **Mirror:** the same pure-types discipline,
  the library source layout, and the barrel re-export pattern; reuse the `UnitSystem` export it adds.
- `libs/shared-types/src/lib/weather.ts` (created by Task 1-1) — source of the `UnitSystem` union to
  reuse. **Mirror:** the `export interface` / `export type` style used there.
- `libs/shared-types/src/index.ts` (the barrel from Task 1-1). **Mirror:** add the new
  `export * from './lib/requests';` alongside the existing response re-export.
- `CLAUDE.md` — conventions and the `npm run build` / `npm test` / `npm run lint` commands.

## Acceptance criteria
1. **`requests.ts` declares exactly four request DTO types**, in
   `libs/shared-types/src/lib/requests.ts`:
   - `UpdatePreferencesRequest` — endpoint #5 body `{ unitSystem }`. Must **reuse** the shared
     `UnitSystem` union, not re-declare it:
     ```ts
     import type { UnitSystem } from './weather';
     export interface UpdatePreferencesRequest {
       unitSystem: UnitSystem;
     }
     ```
   - `SaveLocationRequest` — endpoint #7 body `{ name, region, country, latitude, longitude, isDefault? }`:
     ```ts
     export interface SaveLocationRequest {
       name: string;
       region: string;
       country: string;
       latitude: number;
       longitude: number;
       isDefault?: boolean;   // optional — absent means false server-side
     }
     ```
     `isDefault` **must** be optional (`isDefault?: boolean`); the other five fields are required.
   - `UpdateSavedLocationRequest` — endpoint #8, "same body as POST":
     ```ts
     export type UpdateSavedLocationRequest = SaveLocationRequest;
     ```
     A plain alias, **no new fields** (locked decision above).
   - `ReorderSavedLocationsRequest` — endpoint #11 body `{ locationIds: number[] }`:
     ```ts
     export interface ReorderSavedLocationsRequest {
       locationIds: number[];
     }
     ```
     The property is `locationIds` (plural, camelCase) of type `number[]` — match §0.2 exactly; do not
     rename to `ids`/`locationIDs`.
2. **Barrel re-exports all four.** `libs/shared-types/src/index.ts` re-exports `requests.ts` (e.g.
   `export * from './lib/requests';`) so all four names — plus the nine from Task 1-1 — resolve from
   `@nimbus/shared-types`.
3. **Pure-types constraint holds.** `requests.ts` contains only `import type` / `export interface` /
   `export type` — **no** `enum`, classes, `class-validator`/`class-transformer` decorators, default
   values, or runtime code, and **no** imports from `@angular/*`, `@nestjs/*`, or `@prisma/client`.
   The `UnitSystem` import is a `import type` so it erases at compile time. Compiled JS output is empty.
4. **Build is green.** `npm run build` (e.g. `npx nx build shared-types`) completes with **no type
   errors**, including the `UnitSystem` reuse resolving correctly.
5. **Lint is green.** `npm run lint` passes for the library (no stray runtime code, no disallowed
   import).
6. **Resolution check (compile-time only).** A throwaway type-only statement
   `import type { UpdatePreferencesRequest, SaveLocationRequest, UpdateSavedLocationRequest, ReorderSavedLocationsRequest } from '@nimbus/shared-types';`
   type-checks, and `UpdateSavedLocationRequest` is assignable to/from `SaveLocationRequest` (the alias
   holds). Remove any scratch type-check before commit — do **not** add a Jest spec (testing is
   Phase 6); `npm test` is not expected to gain new specs.

## What NOT to modify
- Do **not** edit or reshape the nine §0.3 response interfaces from Task 1-1 (no field changes, no
  re-ordering). This task only **adds** the request side and the barrel line for it.
- Do **not** re-declare `UnitSystem` — import it from the Task 1-1 source.
- Do **not** add runtime validation, `class-validator` decorators, default values, or DTO **classes** —
  those belong to Phase 3 (Backend). Keep these as plain interfaces/aliases.
- Do **not** add fields beyond the §0.2 bodies (no `userId`/`id` in the request DTOs — those are path
  params, not body fields).
- Do **not** scaffold or reconfigure the Nx workspace or the `@nimbus/shared-types` alias (Phase 0),
  and do **not** touch `apps/web`, `apps/api`, Nest code, or Prisma.
- **No schema migration / no new dependency** unless the roadmap says so — Phase 1 adds none. If a
  task seems to need one, STOP and ask.

## Suggested commit
```
feat(shared-types): add §0.2 request DTOs and export via barrel

Add the four request DTO types derived from the mutating §0.2 endpoint
bodies — UpdatePreferencesRequest (#5), SaveLocationRequest (#7),
UpdateSavedLocationRequest = SaveLocationRequest (#8, alias keeps the
"same body" invariant), and ReorderSavedLocationsRequest (#11) — in
requests.ts, re-exported through the barrel.

Pure type-only declarations reusing the shared UnitSystem union: no
runtime code, no validation decorators (those land in Phase 3).
```
