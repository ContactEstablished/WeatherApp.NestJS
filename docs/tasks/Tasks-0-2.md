# Task 0-2 — Generate `libs/shared-types` and establish the `@nimbus/shared-types` path alias

## Surface
Shared library + workspace tsconfig. Generates the `libs/shared-types` Nx library with a single
placeholder export and confirms/establishes the `@nimbus/shared-types` path alias in
`tsconfig.base.json`. No app logic, no real contract types, no schema, no UI. This task only proves the
**alias resolves** from both apps; the real contract types are Phase 1.

## Why
`libs/shared-types` is what makes the REST contract a **compile-time shared dependency** (RoadMap §1):
`apps/web` and `apps/api` import identical types from `@nimbus/shared-types`, so the contract can never
silently drift. **Phase 1 imports directly from `@nimbus/shared-types`** — so the alias spelling is
load-bearing and must be locked now, with a placeholder export that lets us compile-check resolution
from both apps before any real types exist. Getting the alias right here means Phase 1 is a pure
"add types" task with nothing to re-wire.

## Depends on
- **Task 0-1** (`docs/tasks/Tasks-0-1.md`) — the Nx workspace, `tsconfig.base.json`, `apps/web`, and
  `apps/api` must already exist. **Hard precondition.**
- **Roadmap Phase 0 — Bootstrap** (`docs/RoadMap.md`, "### Phase 0 — Bootstrap"): the "Generate the
  shared library and lock the path alias" scope bullet (note: "**The alias spelling is load-bearing**")
  and the `libs/shared-types` success criterion.
- **Roadmap §1 — Target architecture** (`docs/RoadMap.md` lines ~228–248): the `libs/shared-types/`
  location and the `@nimbus/shared-types` alias spelling.
- **Roadmap Phase 1 — Shared contract** (`docs/RoadMap.md`, "### Phase 1") — the *consumer* of this
  alias; read its "Success criteria" to understand what must resolve. Do **not** implement Phase 1 here.
- **Enumerated task split** (`docs/RoadMap.md`, Phase 0 "Enumerated task split" item 2).
- No ADRs in `docs/decisions/` and no handoff in `docs/handoffs/` (both absent) — the roadmap is the
  only locked source.
- **Blocks specifically:** Phase 1 (Shared contract) — Phase 1 cannot start until this alias resolves.

## Locked decisions (from the roadmap's "Decisions needed" — recorded so the implementer does not re-litigate)
- **Alias / scope → `@nimbus/shared-types` (LOCKED, load-bearing).** Keep `@nimbus` — it matches §1 and
  the `nimbus-weather` workspace name. The exact string `@nimbus/shared-types` must be what the alias
  resolves under; Phase 1 hard-codes this import path. If the Task 0-1 generator produced a different
  default scope/name, **STOP and reconcile to `@nimbus/shared-types`** rather than letting a different
  spelling stand.

## Precondition / blocker — VERIFY BEFORE STARTING
> **STOP and flag if Task 0-1 has not landed.** As of this planning pass the repo has no `nx.json`,
> `package.json`, `tsconfig.base.json`, `apps/`, or `libs/` — those are Task 0-1's output. This task
> assumes the integrated Nx workspace and both apps already exist. Do not hand-scaffold the workspace
> here (that is Task 0-1's scope). If the workspace is absent, stop and flag the missing dependency.

## Required reading
- `docs/RoadMap.md` — Phase 0 "Generate the shared library and lock the path alias" bullet and the
  matching success criterion; Phase 1 "Success criteria" (so you know what the alias must satisfy).
  **Mirror:** generate `libs/shared-types`, placeholder export only, alias spelling `@nimbus/shared-types`.
- `docs/RoadMap.md` — §1 "Target architecture" tree. **Mirror:** the `libs/shared-types/` location.
- `tsconfig.base.json` (created by Task 0-1) — the workspace `compilerOptions.paths` map. **Mirror:**
  add/confirm the `@nimbus/shared-types` entry here; the `@nx/js`/`@nx/angular` library generator
  normally writes it for you — verify the **exact** key, do not duplicate it.
- `libs/shared-types/` once generated — the generated `src/index.ts` entry point and
  `project.json`/`tsconfig.lib.json`. **Mirror:** put the placeholder export in the generated entry
  point; do not relocate it.
- `apps/web/` and `apps/api/` (from Task 0-1) — where the throwaway resolution imports go.
- `CLAUDE.md` — conventions and the `npm run build` / `npm test` / `npm run lint` commands.

## Acceptance criteria
1. **`libs/shared-types` library exists.** Generated as an Nx library under `libs/shared-types` (e.g.
   `npx nx g @nx/js:lib shared-types --directory=libs/shared-types --importPath=@nimbus/shared-types`
   or the `@nx/angular:lib` equivalent — use whatever matches the Task 0-1 plugins). `project.json`
   with `build`/`lint`/`test` targets and `libs/shared-types/src/index.ts` are present.
2. **Placeholder export only — no real contract types.** `libs/shared-types/src` exports a single,
   clearly-placeholder symbol so the alias can be compile-checked, e.g. in `src/index.ts` (directly or
   re-exported from `src/lib/`):
   ```ts
   // Placeholder export — Phase 0 only. The real REST contract types land in Phase 1.
   export const SHARED_TYPES_PLACEHOLDER = true;
   ```
   Do **not** add any of the nine §0.3 response interfaces or the four §0.2 request DTOs — those are
   Phase 1. A delete of this placeholder in Phase 1 must not break anything structural.
3. **The `@nimbus/shared-types` path alias is present and exactly spelled.** `tsconfig.base.json`
   `compilerOptions.paths` contains the key **`@nimbus/shared-types`** (exact string — not `@nimbus/shared`,
   not `shared-types`, not a different scope) pointing at the library entry (`libs/shared-types/src/index.ts`).
   There is exactly one such entry (no duplicate/conflicting alias).
4. **Alias resolves from BOTH apps (compile-checked).** A throwaway statement
   `import { SHARED_TYPES_PLACEHOLDER } from '@nimbus/shared-types';` type-checks/compiles from **both**
   an `apps/web` source file and an `apps/api` source file. Demonstrate the resolution however the build
   exercises it; **remove the throwaway imports before commit** (no app logic is introduced in Phase 0).
   If a temporary reference is the cleanest proof, it must be deleted before the commit.
5. **Build stays green.** `npm run build` succeeds across all projects (including `shared-types`), with
   no type errors and no broken alias resolution.
6. **Lint and test stay green.** `npm run lint` and `npm test` pass — including the library's generated
   default spec if the generator created one. Do not add new specs (testing is Phase 6).

## What NOT to modify
- Do **not** add real contract types, DTOs, enums, or any business shape — placeholder export only.
  The nine §0.3 interfaces and four §0.2 DTOs are **Phase 1**.
- Do **not** rename the `@nimbus` scope or use a different alias spelling — `@nimbus/shared-types` is
  locked and Phase 1 depends on it. If Task 0-1 produced a different default, reconcile to this exact
  string (criterion 3), do not introduce a second alias.
- Do **not** scaffold the workspace or apps (that is Task 0-1), install Prisma (Task 0-3), or add
  Docker/`.env` files (Task 0-4).
- Do **not** wire these types into any Angular service or Nest controller — consumer wiring is
  Phases 3/4. The resolution imports are throwaway and must be removed before commit.
- **No schema migration / no new dependency** beyond what the Nx library generator pulls in. If a step
  seems to need another dependency, STOP and ask.

## Suggested commit
```
chore(shared-types): scaffold libs/shared-types and @nimbus/shared-types alias

Generate the libs/shared-types Nx library with a single placeholder
export and confirm the @nimbus/shared-types path alias in
tsconfig.base.json. Compile-check that the alias resolves from both
apps/web and apps/api; build/lint/test stay green.

Alias spelling is load-bearing: Phase 1 imports the real REST contract
types from @nimbus/shared-types. No contract types here — placeholder only.
```
