# Impl 0-2 — Generate `libs/shared-types` and establish the `@nimbus/shared-types` path alias

**Acceptance contract:** `docs/tasks/Tasks-0-2.md`
**Decision lock:** RoadMap.md §1 (alias spelling `@nimbus/shared-types` is load-bearing; locked in Phase 0 "Decisions needed"); no ADR file exists — roadmap is the sole locked source.
**Scope:** Generate the `libs/shared-types` Nx library, write a single placeholder export, confirm/reconcile the exact `@nimbus/shared-types` path alias in `tsconfig.base.json`, compile-check resolution from both apps, then remove the throwaway imports. No schema change. No new runtime dependency beyond what the Nx library generator pulls in.

---

## Step 0 — Pre-flight

**STOP if Task 0-1 has not landed.** This task has a hard precondition: the Nx workspace must already exist. Verify before touching anything.

Check all of the following are present at the repo root:

| File / directory | Confirms |
|---|---|
| `nx.json` | Nx workspace exists |
| `package.json` (with `name: "nimbus-weather"`) | npm workspace, correct name |
| `tsconfig.base.json` | base tsconfig for path alias registration |
| `apps/web/project.json` | Angular app from Task 0-1 |
| `apps/api/project.json` | NestJS app from Task 0-1 |

If any of these are absent: **STOP. Flag the missing Task 0-1 output and do not proceed.**

If all are present, confirm the working branch is clean (no uncommitted changes):

```
git status
```

Expected: `nothing to commit, working tree clean`. If not clean, stash or commit the outstanding changes before continuing.

Run the baseline verify commands and confirm both pass:

```
npm run build
npm test
```

Both must exit 0 before proceeding. `npm run lint` should also be green; note any pre-existing lint failures so you can distinguish them from anything this task introduces.

**Files to open before starting:**
- `tsconfig.base.json` — read `compilerOptions.paths` in full; note every existing entry and its exact key spelling.
- `nx.json` — note which plugins are registered (determines which generator to use: `@nx/js:lib` vs `@nx/angular:lib`).
- `package.json` `devDependencies` — confirm `@nx/js` and/or `@nx/angular` and/or `@nx/nest` are present (determines available generators).

**Verify:** git tree clean, `npm run build` and `npm test` both exit 0.

---

## Step 1 — Determine the correct library generator

Open `nx.json` and `package.json` `devDependencies` and check which Nx plugins are installed.

- If `@nx/js` is present → use `@nx/js:lib`.
- If `@nx/angular` is present but not `@nx/js` → use `@nx/angular:lib`.
- If both are present → prefer `@nx/js:lib` (the shared-types library has no Angular dependency).

Note the chosen generator; you will use it in Step 2.

**Verify:** You have identified exactly one generator to use. No files changed yet.

---

## Step 2 — Generate the `libs/shared-types` library

Run the Nx library generator from the repo root. Replace `<generator>` with the one identified in Step 1.

For `@nx/js:lib`:
```
npx nx g @nx/js:lib shared-types --directory=libs/shared-types --importPath=@nimbus/shared-types --no-interactive
```

For `@nx/angular:lib`:
```
npx nx g @nx/angular:lib shared-types --directory=libs/shared-types --importPath=@nimbus/shared-types --no-interactive
```

If the generator prompts for additional options (bundler, unit test runner, etc.), accept the defaults unless they conflict with the workspace's existing choices (match what `apps/web` and `apps/api` use, e.g. Jest for tests).

After the generator completes, confirm these outputs exist:
- `libs/shared-types/project.json` — with `build`, `lint`, and `test` targets (or the equivalent Nx-inferred targets for this plugin version).
- `libs/shared-types/src/index.ts` — the generated barrel entry point.
- `libs/shared-types/tsconfig.lib.json` — library tsconfig.
- `libs/shared-types/tsconfig.json` — project tsconfig.

**Verify:** All four files above exist. Run `npm run build` — it must exit 0 (the empty generated library must build cleanly before you modify anything).

---

## Step 3 — Inspect and reconcile the `@nimbus/shared-types` path alias

Open `tsconfig.base.json` and read `compilerOptions.paths` in full.

The generator normally writes an entry like:
```json
"@nimbus/shared-types": ["libs/shared-types/src/index.ts"]
```

Check for three conditions and act accordingly:

**Condition A — Entry is present with the exact key `@nimbus/shared-types` pointing at `libs/shared-types/src/index.ts`.**
No change needed. Proceed to Step 4.

**Condition B — Entry is present but the key spelling is wrong** (e.g. `@nimbus/shared`, `shared-types`, a different scope).
Edit `tsconfig.base.json`: rename the key to exactly `@nimbus/shared-types`. Do not add a second entry — replace the wrong one. The value array must contain `"libs/shared-types/src/index.ts"` (or `["libs/shared-types/src/index.ts"]`).

**Condition C — No entry was written at all.**
Add to `compilerOptions.paths` in `tsconfig.base.json`:
```json
"@nimbus/shared-types": ["libs/shared-types/src/index.ts"]
```

After any edit, count the entries for `shared-types` in `compilerOptions.paths`. There must be **exactly one** entry with the key `@nimbus/shared-types`. If a duplicate exists (e.g. both the old spelling and the new), remove the old one.

**Verify:** Open `tsconfig.base.json`. Confirm:
1. `compilerOptions.paths` contains exactly one entry whose key is the literal string `@nimbus/shared-types`.
2. Its value is `["libs/shared-types/src/index.ts"]` (the array pointing at the generated entry point).
3. There is no second entry that also maps to this library.

Run `npm run build` — must exit 0.

---

## Step 4 — Write the placeholder export

Open `libs/shared-types/src/index.ts`. The generator may have written some default content (e.g. an empty export, a `lib/shared-types.ts` re-export, or a sample function). Replace the entire file content with exactly this:

```ts
// Placeholder export — Phase 0 only. The real REST contract types land in Phase 1.
export const SHARED_TYPES_PLACEHOLDER = true;
```

If the generator created `libs/shared-types/src/lib/shared-types.ts` (or similar), also clear that file's content so the only symbol exported through the barrel is `SHARED_TYPES_PLACEHOLDER`. The simplest approach: leave the generator's `src/lib/` file deleted or empty, and put the placeholder directly in `src/index.ts` as shown above.

Do NOT add any of the nine §0.3 response interfaces (`WeatherDashboard`, `CurrentWeather`, etc.) or the four §0.2 request DTOs. Placeholder only.

**Verify:** `libs/shared-types/src/index.ts` contains the placeholder comment and `export const SHARED_TYPES_PLACEHOLDER = true;` and nothing else of substance. Run `npm run build` — must exit 0.

---

## Step 5 — Add throwaway resolution imports to both apps

This step compile-checks that `@nimbus/shared-types` resolves from both `apps/web` and `apps/api`. The imports are temporary and **must be removed in Step 6 before commit**.

**In `apps/api`:**
Open `apps/api/src/main.ts`. At the very top of the file (before any existing content), add one import line:
```ts
import { SHARED_TYPES_PLACEHOLDER } from '@nimbus/shared-types';
```
Also add a usage reference directly below it (to suppress "unused import" lint errors):
```ts
void SHARED_TYPES_PLACEHOLDER;
```

**In `apps/web`:**
Open `apps/web/src/main.ts`. At the very top of the file (before any existing content), add the same two lines:
```ts
import { SHARED_TYPES_PLACEHOLDER } from '@nimbus/shared-types';
void SHARED_TYPES_PLACEHOLDER;
```

If either `main.ts` is not a suitable file (e.g. it is a plain JS bootstrapper that does not go through the TypeScript compiler path), use the app's root component file instead (e.g. `apps/web/src/app/app.component.ts` or `apps/api/src/app.module.ts`). The goal is a file that the TypeScript compiler exercises during `npm run build`.

**Verify (resolution proof):** Run `npm run build`. It must exit 0 with no type errors. This is the compile-check that the alias resolves from both apps.

---

## Step 6 — Remove the throwaway imports (before commit)

Open each file edited in Step 5 and remove the two lines added (`import { SHARED_TYPES_PLACEHOLDER } from '@nimbus/shared-types';` and `void SHARED_TYPES_PLACEHOLDER;`). Restore each file to exactly its pre-Step-5 state.

Files to revert:
- `apps/api/src/main.ts` (or whichever api file was used)
- `apps/web/src/main.ts` (or whichever web file was used)

No app logic must remain in either file from this task.

**Verify:** Inspect both files to confirm no `shared-types` import or reference remains. Run `npm run build` — must still exit 0 (the library itself still builds; only the throwaway consumer imports are gone).

---

## Step 7 — Final verify: full suite

Run all three verify commands from the repo root:

```
npm run build
npm run lint
npm test
```

All three must exit 0.

Acceptance criteria checklist before committing:
1. `libs/shared-types/project.json` exists with build/lint/test targets. (`libs/shared-types` library exists.)
2. `libs/shared-types/src/index.ts` exports only `SHARED_TYPES_PLACEHOLDER = true` with the Phase 0 comment. (Placeholder only — no real contract types.)
3. `tsconfig.base.json` `compilerOptions.paths` has exactly one entry, key `@nimbus/shared-types`, value `["libs/shared-types/src/index.ts"]`. (Alias present and exactly spelled.)
4. `npm run build` passed in Step 5 with the throwaway imports in both apps. (Resolution proven from both apps.)
5. `npm run build` passes now with the throwaway imports removed. (Build stays green.)
6. `npm run lint` and `npm test` pass. (Lint and test stay green.)

Run a sanity diff to confirm only the expected files are changed:

```
git diff --stat
```

Expected changed/added files (approximately):
```
libs/shared-types/project.json
libs/shared-types/tsconfig.json
libs/shared-types/tsconfig.lib.json
libs/shared-types/tsconfig.spec.json   (if generated)
libs/shared-types/src/index.ts
libs/shared-types/src/lib/...          (any generator scaffolding files)
libs/shared-types/jest.config.ts       (if generated)
libs/shared-types/.eslintrc.json       (if generated)
tsconfig.base.json
```

`apps/web/` and `apps/api/` source files must appear in the diff **only** if you had to reconcile something unrelated — the throwaway imports must NOT appear (they were removed in Step 6). If any app source file shows a change, review it before committing.

**Verify:** All three commands green, diff shows only library and tsconfig files. No app source changes in the diff.

---

## Step 8 — Commit

Stage all changes and commit with the exact message from the Tasks doc:

```
git add .
git commit -m "chore(shared-types): scaffold libs/shared-types and @nimbus/shared-types alias

Generate the libs/shared-types Nx library with a single placeholder
export and confirm the @nimbus/shared-types path alias in
tsconfig.base.json. Compile-check that the alias resolves from both
apps/web and apps/api; build/lint/test stay green.

Alias spelling is load-bearing: Phase 1 imports the real REST contract
types from @nimbus/shared-types. No contract types here — placeholder only."
```

No `Co-Authored-By` trailer (config sets `ai_coauthor_trailer: false`).

**Verify:** `git log --oneline -1` shows the commit. `git status` is clean.
