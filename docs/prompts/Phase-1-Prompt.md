# Execution Prompt — Phase 1: Shared contract

Paste into a fresh session rooted at the repo root. Run only after Phase 0 is complete and the main branch is clean.

---

You are the lead full-stack engineer for the WeatherApp.NestJS project, working across an Angular front end, a NestJS/Node.js API, and a PostgreSQL database. You design, implement, test, and validate the work directly, following the repo's existing conventions and keeping type safety, clear contracts between the API and the client, and database integrity in mind.

---

## Required reading, in order, before any code

1. **Roadmap Phase 1 — Shared contract** (`docs/RoadMap.md`, "### Phase 1 — Shared contract"):
   - Read "Goal", "Scope (in scope)", "Decisions needed", "Out of scope", and "Success criteria" sections.
   - This phase stands up `libs/shared-types` as the single, compile-time source of truth for the REST contract: the nine §0.3 response interfaces plus the four §0.2-derived request DTOs. Both `apps/web` and `apps/api` will import these types from `@nimbus/shared-types`, ensuring the contract can never silently drift.

2. **Roadmap §0.3 — Data contract** (`docs/RoadMap.md`, lines ~74–156):
   - The nine response interface declarations: `UnitSystem`, `WeatherDashboard`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `WeatherPreview`, `WeatherMetric`, `LocationSuggestion`, `UserPreferences`.
   - This is a documented reference; the canonical byte-for-byte source is `docs/reference/weather.ts` (see next item).

3. **Roadmap §0.2 — REST contract** (`docs/RoadMap.md`, lines ~55–72):
   - The eleven endpoints, their method/path/params, and body shapes.
   - This task derives four request DTO types from endpoints #5, #7, #8, #11 (see Task 1-2 below).

4. **Reference file — canonical lift source** (`docs/reference/weather.ts`):
   - The byte-for-byte snapshot of the source app's `src/WeatherApp.Client/src/types/weather.ts`.
   - **This is the authoritative source** for the nine response interfaces — lift from it, not from the §0.3 code block in the roadmap.
   - The reference differs from §0.3 only in non-semantic ways: no inline comments, and `UnitSystem` declared near the end.

5. **Reference provenance** (`docs/reference/README.md`):
   - Documents where and when the canonical source was snapshots and the two deltas from the roadmap's §0.3.

6. **Phase 0 — Bootstrap Handoff** (`docs/handoffs/Phase-0-Handoff.md`):
   - Confirms Phase 0 is complete: the Nx integrated monorepo exists at repo root, `apps/web` and `apps/api` are scaffolded and serve on 4200 / 3000, `libs/shared-types` exists with the `@nimbus/shared-types` path alias established in `tsconfig.base.json`, Prisma is stubbed, local Postgres runs via docker-compose, and `.env.example` is committed.
   - Confirms all build/lint/test commands are green.
   - Documents deviations from the original Impl docs (Nx 23 workspace shape, lint targets, Prisma 6.x pinned, `api` global prefix).

---

## Session-start checklist

1. **Clean working tree.** Run `git status` — must show `nothing to commit, working tree clean`.
2. **Phase 0 is complete.** Verify all Phase 0 deliverables exist:
   - `nx.json` and `package.json` (Nx workspace at repo root).
   - `tsconfig.base.json` with `@nimbus/shared-types` path alias: `"@nimbus/shared-types": ["./libs/shared-types/src/index.ts"]`.
   - `libs/shared-types/src/index.ts` exists (currently exports `SHARED_TYPES_PLACEHOLDER` — Phase 1 replaces it).
   - `apps/web/` (Angular) and `apps/api/` (NestJS) exist and serve (compile-check: `npm run build` should pass).
   - `prisma/schema.prisma` exists (stub, no models).
   - `docker-compose.yml` with `postgres:16` service.
   - `.env.example` committed, `.env` gitignored.
3. **The four Phase 0 commits are present.** Check `git log --oneline` to confirm commits for Tasks 0-1 through 0-4.
4. **After each task, verify:**
   - `npm run build` exits 0 (no type errors across all three projects).
   - `npm run lint` exits 0 (no stray runtime code or disallowed imports).
   - `npm test` exits 0 (no test failures).
   - The commit is made with the conventional message from the Impl doc (no `Co-Authored-By` trailer).

---

## Important context

- **Phase 0 is complete and locked.** `libs/shared-types` and the `@nimbus/shared-types` alias already exist and resolve from both `apps/web` and `apps/api`. `libs/shared-types/src/index.ts` currently exports only `SHARED_TYPES_PLACEHOLDER` — Phase 1 REPLACES it (Step 1 of Task 1-1).
- **The alias value in `tsconfig.base.json` is locked.** Entry: `"@nimbus/shared-types": ["./libs/shared-types/src/index.ts"]`. The leading `./` is **required** (no `baseUrl` is set). Do not change this entry or its spelling.
- **Constraint — pure TypeScript types only (LOCKED).** This library carries **only** `type`/`interface` declarations and re-exports — no runtime code, no `enum`, no classes, no `class-validator`/`class-transformer` decorators, and no imports from `@angular/*`, `@nestjs/*`, `@prisma/client`, or any runtime package. Validation, runtime DTO classes, and consumer wiring belong to Phase 3 (Backend) and Phase 4 (Frontend).
- **Canonical source is `docs/reference/weather.ts` (LOCKED).** The nine response interfaces in Task 1-1 must be lifted byte-for-byte from this file, not from the §0.3 code block in the roadmap. The reference differs from §0.3 only in non-semantic ways (no comments, `UnitSystem` placement).
- **Request DTOs are locked to §0.2 endpoint bodies (LOCKED).** The four request DTO types in Task 1-2 are derived from and must exactly match the mutating endpoint bodies in §0.2 (#5, #7, #8, #11). Field names, types, and optionality are load-bearing.
- **Decision: `UpdateSavedLocationRequest` = plain alias (LOCKED).** `export type UpdateSavedLocationRequest = SaveLocationRequest;` — a plain alias (not `extends`) keeps the "same body as POST" invariant self-documenting and prevents drift.
- **Decision: Separate `requests.ts` file (LOCKED).** Task 1-1 writes `libs/shared-types/src/lib/weather.ts` with the nine response interfaces (clean §0.3 copy). Task 1-2 writes `libs/shared-types/src/lib/requests.ts` with the four request DTOs, both re-exported through a single barrel.
- **Verify commands after each task (LOCKED).** Run `npm run build`, `npm run lint`, `npm test` — all three must exit 0. The build is the most important gate; type errors break the contract for both apps.

---

## Mission

**Deliver Phase 1 — Shared contract end to end.** Stand up `libs/shared-types` as the single, compile-time source of truth for the REST contract — the nine §0.3 response interfaces plus the four §0.2-derived request DTOs — so `apps/web` and `apps/api` import identical types from `@nimbus/shared-types` and the contract can never silently drift.

### Step 0 — Lock decisions before coding

The roadmap's Phase 1 "Decisions needed" block lists three decisions. All are locked above in "Important context" — do not re-litigate them. Proceed directly to Step 1.

### Step 1 — Write the task specs (one commit)

The two Phase 1 tasks are:

1. **Task 1-1 — Lift the nine §0.3 response types into `libs/shared-types` + barrel** (`docs/tasks/Tasks-1-1.md` / `docs/tasks/Impl-1-1.md`)
   - **Acceptance:** `libs/shared-types/src/lib/weather.ts` exists and declares the nine response interfaces verbatim from `docs/reference/weather.ts` (no comments, same field names, types, and optionality). `UnitSystem` is a `type` alias (string-literal union), not an `enum`. `LocationSuggestion.id` is `id?: number | null` (optional AND nullable). Barrel (`libs/shared-types/src/index.ts`) re-exports all nine via `export * from './lib/weather';`. `npm run build` / `npm run lint` / `npm test` all pass. All thirteen symbols (nine response + four placeholders from Phase 1-2) eventually resolve from `@nimbus/shared-types`, but after this task only the nine are present.
   - **Depends on:** Phase 0 (hard precondition — `libs/shared-types` must exist with the `@nimbus/shared-types` alias).

2. **Task 1-2 — Add the four §0.2-derived request DTOs and export through the barrel** (`docs/tasks/Tasks-1-2.md` / `docs/tasks/Impl-1-2.md`)
   - **Acceptance:** `libs/shared-types/src/lib/requests.ts` declares exactly four request DTO types:
     - `UpdatePreferencesRequest` — interface with one field `unitSystem: UnitSystem` (reuses the shared `UnitSystem` union).
     - `SaveLocationRequest` — interface with six fields: `name`, `region`, `country` (all `string`), `latitude`, `longitude` (both `number`), `isDefault?` (optional `boolean`).
     - `UpdateSavedLocationRequest` — plain `type` alias = `SaveLocationRequest` (no new fields, keeps the "same body" invariant locked).
     - `ReorderSavedLocationsRequest` — interface with one field `locationIds: number[]` (plural, camelCase).
   - Barrel extends with `export * from './lib/requests';` so all thirteen names (nine response + four request) resolve from `@nimbus/shared-types`. `npm run build` / `npm run lint` / `npm test` all pass.
   - **Depends on:** Task 1-1 (hard precondition — the response types and `UnitSystem` union must already be in place to import and reuse).

### Step 2 — Implement, one task per commit

Execute each task in dependency order: **1-1 → 1-2**. For each task:

1. **Read the Impl doc** (`docs/tasks/Impl-{phase}-{n}.md`) — it contains the authoritative numbered build steps and verify gates. Follow it exactly.
2. **Read the Tasks doc** (`docs/tasks/Tasks-{phase}-{n}.md`) — it contains the acceptance contract. Cross-check your work against it before committing.
3. **Build + test + diff-read after each task:**
   ```
   npm run build
   npm run lint
   npm test
   git diff --stat
   ```
4. **Commit per task** with the conventional message from the Impl doc (provided at the end of each Impl file in a code block labeled "Suggested commit").

**Commit message rules (config: `ai_coauthor_trailer: false`):**
- Use the conventional commit style: `feat: / fix: / refactor: / docs: / chore:`.
- Messages must be plain, with no `Co-Authored-By:` or AI co-author trailer. Omitting the trailer keeps a single author and avoids skewing GitHub contributor counts.
- The Impl docs provide the exact commit message text — use it verbatim.

### Step 3 — Phase exit

1. **Verify every success criterion** from the roadmap's "Success criteria" section (Phase 1 → lines ~394–401):
   - `libs/shared-types/src` exports all nine §0.3 response types and the four request DTOs through `index.ts`; the response interfaces are textually identical to `docs/reference/weather.ts`.
   - `npm run build`, `npm run lint`, and `npm test` all pass.
   - A throwaway type-only import of `@nimbus/shared-types` resolves from both `apps/web` and `apps/api` (compile-checked, no runtime dependency — this was done in the Impl docs as Step 3 of Task 1-1, then removed in Step 4).

2. **Update the roadmap** (optional but recommended): If the repo uses a convention to mark phases complete, flip the ledger row from "in progress" to complete.

3. **Write a Phase 1 handoff** to `docs/handoffs/` (optional):
   - A brief document of the delivered contract types and barrel shape, so Phase 2 (Prisma models) can verify they align with the response interfaces, and Phase 3 (Backend) and Phase 4 (Frontend) can assume the types are stable and import from `@nimbus/shared-types`.
   - Example: "Phase 1 complete: `libs/shared-types` exports nine §0.3 response types (`WeatherDashboard`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `WeatherPreview`, `WeatherMetric`, `LocationSuggestion`, `UserPreferences`, `UnitSystem`) and four §0.2 request DTOs (`UpdatePreferencesRequest`, `SaveLocationRequest`, `UpdateSavedLocationRequest`, `ReorderSavedLocationsRequest`) via `@nimbus/shared-types` barrel. Pure type-only (no runtime code, no validation decorators)."

4. **Final commit** (after all two tasks are merged):
   - Commit message: `docs: close out Phase 1`
   - Content: any updated roadmap row, the Phase 1 handoff (if written), or just a marker.

5. **Confirm clean tree:**
   ```
   git status
   # Expected: nothing to commit, working tree clean
   ```

---

## Scope guardrails (do NOT)

**Out of scope — from the roadmap, Phase 1 "Out of scope":**
- Do NOT add runtime validation (`class-validator` / `class-transformer` DTO classes) — that is Phase 3 (Backend).
- Do NOT author Prisma models or schema changes — that is Phase 2 (Database + Prisma). **Schema migrations require approval before apply.**
- Do NOT add backend modules/providers or consumer wiring (actually importing these types into Nest controllers/services or Angular state) — that is Phase 3 (Backend) and Phase 4 (Frontend).
- Do NOT add Angular components or UI — that is Phase 4 (Frontend).
- Do NOT add CI (GitHub Actions) — that is Phase 7 (Build & deploy).

**Do NOT:**
- Alter the `@nimbus/shared-types` path alias spelling or value in `tsconfig.base.json`. The leading `./` and the exact path to `./libs/shared-types/src/index.ts` are locked.
- Re-scaffold the `libs/shared-types` project, generate new files outside `src/`, or modify `project.json` / `tsconfig.lib.json` / generated configuration. Phase 0 owns workspace structure; Phase 1 only adds TypeScript source.
- Add runtime values, `enum`s, classes, `class-validator` decorators, or any imports from `@angular/*`, `@nestjs/*`, `@prisma/client`. Pure types only.
- Touch `apps/web` or `apps/api` except for the throwaway compile-check imports in Task 1-1's Step 3 (which must be removed in Step 4 before commit).
- Modify `prisma/schema.prisma` or any database files.
- Add new npm dependencies. Phase 1 adds no runtime code and introduces no new package needs.
- Refactor or re-order the nine §0.3 response interfaces from Task 1-1 (no field changes, no reordering, no additions). Task 1-2 only **adds** request DTOs and the barrel line for them.
- Add fields beyond the §0.2 endpoint bodies (no `userId`/`id` in the request DTOs — those are path params, not body fields).

---

End of execution prompt. Proceed to Task 1-1 (Impl doc: `docs/tasks/Impl-1-1.md`).
