# Impl 0-1 — Create the Nx workspace and generate both apps

**Acceptance contract:** `docs/tasks/Tasks-0-1.md`
**Decision lock:** Roadmap §1 "Target architecture" + Phase 0 "Decisions needed" (all locked — npm, integrated, nimbus-weather, @nimbus, repo-root placement).
**Scope:** Nx workspace scaffold + two app generators + npm script wiring + CLAUDE.md note removal. No schema change, no new runtime dependency beyond what `create-nx-workspace`, `@nx/angular`, and `@nx/nest` pull in.

---

## Step 0 — Pre-flight

Confirm starting conditions before touching anything.

**Branch check.** Ensure you are on `main` with a clean working tree:

```
git status
```

Expected: `nothing to commit, working tree clean`. If there are uncommitted changes, stash or commit them before proceeding.

**Greenfield check.** Confirm the workspace files do NOT yet exist (this task creates them):

```
# None of these should be present:
nx.json
package.json
tsconfig.base.json
apps/
node_modules/
```

The only files that must be present at the repo root are: `README.md`, `CLAUDE.md`, `.gitignore`, `docs/`, `.claude/`. If `nx.json` or `package.json` already exist, STOP — this task has already been (partially) run.

**Existing file inventory — note these paths; they must survive the merge:**

- `C:\Projects\ContactEstablished\WeatherApp.NestJS\.gitignore` — contains `/dist`, `/node_modules`, `/build`, `/tmp`, `.env` family entries.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\CLAUDE.md` — contains the stale "package manager is not yet decided" paragraph at lines 28–29.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\README.md`
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\docs\` (entire directory)
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\.claude\` (entire directory)

**Files to open before starting:**

- `docs/tasks/Tasks-0-1.md` — the acceptance contract (re-read Acceptance criteria 1–8 and What NOT to modify).
- `.gitignore` — the `.env*` entries you must preserve in the merged result.
- `CLAUDE.md` lines 28–29 — the paragraph to delete in Step 6.

**Verify (pre-flight gate):** `git status` is clean; `nx.json` does not exist; the five existing items above are present.

---

## Step 1 — Generate the Nx workspace into a sibling directory

`create-nx-workspace` always generates into a new subdirectory named after the workspace. Use a sibling directory **outside** the repo root to avoid clobbering existing files, then move the generated files in the next step.

Navigate to the **parent** of the repo root (one level up from `WeatherApp.NestJS`):

```powershell
cd C:\Projects\ContactEstablished
```

Run the generator (answer every interactive prompt as shown — do NOT let it pick pnpm or yarn):

```powershell
npx create-nx-workspace@latest nimbus-weather --preset=apps --pm=npm --nxCloud=skip
```

Flag explanations:
- `--preset=apps` — integrated monorepo style (Nx owns build/test/serve targets).
- `--pm=npm` — selects npm as the package manager; produces `package-lock.json`, no `pnpm-lock.yaml` / `yarn.lock`.
- `--nxCloud=skip` — skips the Nx Cloud prompt; keep the workspace local.

If the CLI asks interactively for application name or bundler, accept the defaults (no apps are generated at this stage with `--preset=apps`; apps are added in Steps 3–4).

After the command completes, confirm the generated directory exists:

```powershell
ls C:\Projects\ContactEstablished\nimbus-weather
# Should show: nx.json, package.json, package-lock.json, tsconfig.base.json, apps/, .gitignore, etc.
```

**Verify:** `C:\Projects\ContactEstablished\nimbus-weather\nx.json` exists. `C:\Projects\ContactEstablished\nimbus-weather\package-lock.json` exists. No `pnpm-lock.yaml` or `yarn.lock` is present. The original repo root (`C:\Projects\ContactEstablished\WeatherApp.NestJS`) is unchanged.

---

## Step 2 — Move generated files to the repo root (collision-safe merge)

Copy all generated files from the sibling `nimbus-weather/` directory into the repo root, **without overwriting** the existing `docs/`, `.claude/`, `CLAUDE.md`, `README.md`, or `.gitignore`.

**2a. Identify collision candidates before moving.**

List both directories and confirm there is no clash on files other than `.gitignore` (the one file that needs a manual merge):

```powershell
ls C:\Projects\ContactEstablished\nimbus-weather
ls C:\Projects\ContactEstablished\WeatherApp.NestJS
```

The expected collisions are:
- `.gitignore` — must be merged (Step 2b), not overwritten.

If any generated file would overwrite an existing file that is NOT `.gitignore` (e.g. a name clash on `README.md`), STOP and surface it before proceeding.

**2b. Merge the two `.gitignore` files.**

Open `C:\Projects\ContactEstablished\nimbus-weather\.gitignore` and compare it with `C:\Projects\ContactEstablished\WeatherApp.NestJS\.gitignore`.

Rules for the merged result (written to `WeatherApp.NestJS/.gitignore`):
1. Keep every entry from the generated Nx `.gitignore` (it covers `node_modules/`, `.nx/cache`, `dist/`, etc.).
2. Keep these entries from the existing `.gitignore` that the Nx template may not include:
   - `/tmp`
   - `.env`
   - `.env.development`
   - `.env.test`
   - `.env.production`
   - `.temp`
   - `.tmp`
   - `*.log` family (npm-debug, pnpm-debug, yarn-debug, yarn-error, lerna-debug)
3. Deduplicate — if an entry already appears in the generated file, do not add it twice.
4. Do NOT remove the `.env*` entries — Task 0-4 depends on them.

Write the merged `.gitignore` to `C:\Projects\ContactEstablished\WeatherApp.NestJS\.gitignore` before moving any other files.

**2c. Move all generated files (except `.gitignore`) to the repo root.**

In PowerShell, copy everything from the sibling directory to the repo root, skipping `.gitignore` (already handled):

```powershell
$src  = "C:\Projects\ContactEstablished\nimbus-weather"
$dest = "C:\Projects\ContactEstablished\WeatherApp.NestJS"

Get-ChildItem -Path $src -Force | Where-Object { $_.Name -ne ".gitignore" } | ForEach-Object {
    $target = Join-Path $dest $_.Name
    if (Test-Path $target) {
        Write-Warning "COLLISION: $target already exists — skipping. Resolve manually."
    } else {
        Copy-Item -Path $_.FullName -Destination $target -Recurse -Force
    }
}
```

After the copy, remove the sibling directory:

```powershell
Remove-Item -Path "C:\Projects\ContactEstablished\nimbus-weather" -Recurse -Force
```

**Verify:** All of the following exist at the repo root AND the original files survived:

```
C:\Projects\ContactEstablished\WeatherApp.NestJS\nx.json              ← new
C:\Projects\ContactEstablished\WeatherApp.NestJS\package.json         ← new
C:\Projects\ContactEstablished\WeatherApp.NestJS\package-lock.json    ← new
C:\Projects\ContactEstablished\WeatherApp.NestJS\tsconfig.base.json   ← new
C:\Projects\ContactEstablished\WeatherApp.NestJS\apps\                ← new (empty or stub)
C:\Projects\ContactEstablished\WeatherApp.NestJS\README.md            ← PRESERVED
C:\Projects\ContactEstablished\WeatherApp.NestJS\CLAUDE.md            ← PRESERVED
C:\Projects\ContactEstablished\WeatherApp.NestJS\docs\                ← PRESERVED
C:\Projects\ContactEstablished\WeatherApp.NestJS\.claude\             ← PRESERVED
```

Also confirm `.gitignore` contains both `/dist` and `.env` entries. The sibling `nimbus-weather/` directory is gone.

---

## Step 3 — Install dependencies and add the framework plugins

From the repo root, install the generated `package.json` dependencies, then add `@nx/angular` and `@nx/nest`:

```powershell
cd C:\Projects\ContactEstablished\WeatherApp.NestJS
npm install
npx nx add @nx/angular
npx nx add @nx/nest
```

`npx nx add` is the correct way to add Nx plugins: it installs the package into `devDependencies` and registers it in `nx.json` (adds to the `plugins` array or sets up the executor references).

After running these commands, confirm:
- `@nx/angular` appears in `package.json` `devDependencies`.
- `@nx/nest` appears in `package.json` `devDependencies`.
- `nx.json` references both plugins (either in `plugins` array or via `@nx/angular:*` / `@nx/nest:*` executor references).

**Verify:** `npm ls @nx/angular @nx/nest` exits with code 0 and shows both packages. `nx.json` contains references to both.

---

## Step 4 — Generate `apps/web` (Angular, standalone components, SCSS)

Generate the Angular application using the `@nx/angular` generator:

```powershell
npx nx g @nx/angular:app apps/web --style=scss --standalone --routing=false --e2eTestRunner=none
```

Flag explanations:
- `--style=scss` — sets SCSS as the styling format; produces `apps/web/src/styles.scss`.
- `--standalone` — generates standalone components; the bootstrap is `bootstrapApplication` in `main.ts`, **no** `AppModule` or `NgModule`.
- `--routing=false` — skip router setup (no routing in this task's scope).
- `--e2eTestRunner=none` — no Cypress/Playwright project generated (E2E is out of scope for Phase 0).

If the generator prompts for a name separately from the path, enter `web`. If it prompts for a bundler, select `esbuild` (the Angular default with Nx).

After generation, confirm:

- `apps/web/project.json` exists with `build`, `serve`, `lint`, `test` targets.
- `apps/web/src/main.ts` contains `bootstrapApplication` (NOT `platformBrowserDynamic().bootstrapModule`).
- `apps/web/src/styles.scss` exists.
- No `AppModule` file exists in `apps/web/src/app/`.

**Verify:** `apps/web/project.json` is present. `apps/web/src/main.ts` contains the text `bootstrapApplication`. `apps/web/src/styles.scss` exists. Build is still parseable (no errors on a dry `npx tsc --noEmit` within the web project, or check by proceeding to Step 6).

---

## Step 5 — Generate `apps/api` (NestJS)

Generate the NestJS application using the `@nx/nest` generator:

```powershell
npx nx g @nx/nest:app apps/api
```

If the generator prompts for a name separately, enter `api`. Accept defaults for all other prompts.

After generation, confirm:

- `apps/api/project.json` exists with `build`, `serve`, `lint`, `test` targets.
- `apps/api/src/main.ts` exists and bootstraps a Nest application (contains `NestFactory.create`).

**Port check — ensure `apps/api` listens on port 3000.** Open `apps/api/src/main.ts` and verify the `app.listen(...)` call uses `3000` (the Nest default). If it reads from `process.env.PORT`, confirm the fallback is `3000`:

```typescript
// Acceptable forms:
await app.listen(3000);
await app.listen(process.env.PORT ?? 3000);
```

If the generated `main.ts` uses a different port, update it to `process.env.PORT ?? 3000`.

**Verify:** `apps/api/project.json` is present. `apps/api/src/main.ts` contains `NestFactory.create`. The listen call defaults to port `3000`.

---

## Step 6 — Wire `npm run build / lint / test` to Nx targets

Open `package.json` at the repo root. Inspect the `scripts` block that `create-nx-workspace` generated.

**Required scripts and their Nx mappings:**

| npm script | Must resolve to |
|---|---|
| `build` | `nx run-many -t build` |
| `lint` | `nx run-many -t lint` |
| `test` | `nx run-many -t test` |

Nx may already have generated a `build` script. Check each of the three required scripts. For any that are missing or do not invoke the correct Nx target, add or update them.

A minimal correct `scripts` block (other scripts generated by Nx may remain):

```json
"scripts": {
  "build": "nx run-many -t build",
  "lint":  "nx run-many -t lint",
  "test":  "nx run-many -t test"
}
```

Do not remove any other scripts Nx added (e.g. `start`, `e2e`). Only add or correct `build`, `lint`, and `test`.

**Verify:** `package.json` `scripts.build`, `scripts.lint`, and `scripts.test` all contain `nx run-many -t`. Confirmed by reading the file — no build run required for this mechanical check.

---

## Step 7 — Remove the stale package-manager note from `CLAUDE.md`

Open `C:\Projects\ContactEstablished\WeatherApp.NestJS\CLAUDE.md`.

Locate and **delete only** the following paragraph (currently at lines 28–29) from the "Scaffolding the project" section:

```
The package manager is not yet decided — the `.gitignore` carries the default Nest template's
references to npm, pnpm, and yarn. Pick one when scaffolding and remove this note.
```

Do NOT rewrite any other section of `CLAUDE.md`. The rest of the file (Current state, Scaffolding section, Expected commands, Configuration) remains as-is — a full "now scaffolded" rewrite is out of scope for this task (criterion 7 is narrow: remove only that paragraph).

Save the file.

**Verify:** Open `CLAUDE.md` and confirm the phrase "The package manager is not yet decided" no longer appears anywhere in the file. All other content is intact.

---

## Step 8 — Full build, lint, and test green

Run all three verify commands from the repo root. Each must exit with code 0:

```powershell
cd C:\Projects\ContactEstablished\WeatherApp.NestJS

npm run build
npm run lint
npm test
```

**Expected outcomes against empty scaffolding:**

- `npm run build` — compiles `apps/web` (Angular) and `apps/api` (NestJS); no TypeScript errors.
- `npm run lint` — ESLint passes for both projects; no rule violations in generated default code.
- `npm test` — Jest runs the generated default specs:
  - `apps/web`: the bootstrap component spec (e.g. `app.component.spec.ts` with a `should create the app` test).
  - `apps/api`: the generated `app.controller.spec.ts` and/or `app.service.spec.ts` tests.
  - All default specs must pass. If any generated default spec fails (e.g. a missing `TestBed` import in the Angular spec), investigate the generation flags — do NOT skip or delete the test. Fix the generation (re-run `nx g` with corrected flags) rather than patching the test output.

**If a generated spec fails:** The most common cause with `@nx/angular` + standalone is the spec referencing `AppModule`. Confirm `--standalone` was passed and regenerate if needed. Do not modify tests to paper over a generation misconfiguration.

**Verify:** All three commands exit 0. No errors, no failing tests.

---

## Step 9 — Confirm serve ports (manual / documented check)

This step verifies acceptance criterion 6. The serve targets are not started as part of the automated build, but the configuration must be confirmed before committing.

**Web — port 4200:**

Check `apps/web/project.json`: the `serve` target's `options` should include `"port": 4200` (the Angular CLI default). If the generator produced a different port, update it.

Expected entry in `apps/web/project.json`:
```json
"serve": {
  "executor": "@angular-devkit/build-angular:dev-server",
  "options": {
    "port": 4200
  }
}
```

**API — port 3000:**

Confirm `apps/api/src/main.ts` uses port 3000 (already checked in Step 5). No `project.json` override is needed for the default port — Nest reads its own `main.ts`.

**Serve commands (document for the next phase; do NOT leave either running before committing):**

```
nx serve web   →  http://localhost:4200
nx serve api   →  http://localhost:3000
```

**Verify:** `apps/web/project.json` `serve.options.port` is `4200` (or absent, which defaults to 4200). `apps/api/src/main.ts` defaults to port `3000`.

---

## Step 10 — Final sanity: diff check and commit

**Diff check** — confirm only the expected files changed:

```powershell
git diff --stat
git status
```

Expected new/modified paths (all added, none deleted except the stale content in `CLAUDE.md`):

```
CLAUDE.md                        (modified — stale paragraph removed)
.gitignore                       (modified — merged with Nx-generated entries)
nx.json                          (new)
package.json                     (new)
package-lock.json                (new)
tsconfig.base.json               (new)
tsconfig.json                    (new, if generated)
.eslintrc.json / eslint.config.*  (new, if generated)
.prettierrc / .prettierignore    (new, if generated)
apps/web/**                      (new — Angular app)
apps/api/**                      (new — NestJS app)
```

Files that must NOT appear in `git diff` as deleted or modified (other than content changes above):

- `docs/` — no files under `docs/` should be touched.
- `.claude/` — no files under `.claude/` should be touched.
- `README.md` — unchanged.

If `git status` shows unexpected modifications to `docs/` or `.claude/`, STOP and investigate before committing.

**Stage and commit** (all generated files + `CLAUDE.md` change):

```powershell
git add -A
git commit -m "chore(workspace): scaffold integrated Nx monorepo with web + api apps

Create the nimbus-weather Nx workspace (create-nx-workspace --preset=apps,
integrated, npm), add @nx/angular + @nx/nest, and generate apps/web
(Angular standalone components, SCSS) and apps/api (NestJS). Wire npm
run build/lint/test to Nx targets; both apps serve (web 4200, api 3000).

Empty scaffolding only — no contract types, schema, modules, or UI.
Remove the now-resolved package-manager note from CLAUDE.md (npm chosen)."
```

No `Co-Authored-By` trailer (config `ai_coauthor_trailer: false`).

**Final verify:** `git log --oneline -1` shows the commit message starting `chore(workspace): scaffold integrated Nx monorepo with web + api apps`. `npm run build && npm run lint && npm test` all exit 0 on the committed tree.

---

## Acceptance criteria traceability

| Criterion | Covered by step |
|---|---|
| 1. Integrated Nx workspace at repo root; npm; `package-lock.json` | Steps 1, 2 |
| 2. `@nx/angular` + `@nx/nest` installed and registered | Step 3 |
| 3. `apps/web` Angular standalone + SCSS | Step 4 |
| 4. `apps/api` NestJS | Step 5 |
| 5. `npm run build/lint/test` resolve to Nx targets and pass | Steps 6, 8 |
| 6. Serve ports: web 4200 / api 3000 | Steps 5, 9 |
| 7. Stale package-manager note removed from `CLAUDE.md` | Step 7 |
| 8. `docs/`, `.claude/`, `README.md`, `CLAUDE.md` preserved; `.gitignore` retains `.env*` | Steps 2, 10 |
