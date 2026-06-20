# Task 0-1 — Create the Nx workspace and generate both apps

## Surface
Workspace root + build tooling. Creates the integrated Nx monorepo (`nx.json`, `package.json`,
`tsconfig.base.json`) and generates the two application projects: `apps/web` (Angular standalone
components, SCSS) and `apps/api` (NestJS). This is the hard prerequisite for every other Phase 0 task
(0-2, 0-3, 0-4) and for all later phases — it produces the shell every other piece of code lands into.
No business logic, no contract types, no schema, no UI.

## Why
The whole plan is an Nx integrated monorepo (RoadMap §1) so one workspace runs, builds, tests, and
serves both the Angular client and the Nest server, with a shared library wiring them at compile time
(Task 0-2). This task stands up that workspace and the two empty-but-wired apps. Choosing **npm** and
the **integrated** (`--preset=apps`) style here is load-bearing: the config's verify commands are all
`npm run …`, and integrated lets Nx own the build/test/serve targets for both projects. Nothing else
in Phase 0 (or later) can proceed until this scaffolding exists.

## Depends on
- **Roadmap Phase 0 — Bootstrap** (`docs/RoadMap.md`, "### Phase 0 — Bootstrap"): the "Goal", the
  "Create the Nx workspace" and "Add the framework plugins and generate the two apps" scope bullets,
  the "Confirm the verify commands resolve" bullet, and the "Decisions needed" block (package manager,
  Nx style).
- **Roadmap §1 — Target architecture** (`docs/RoadMap.md` lines ~228–248): the `apps/web`, `apps/api`,
  `libs/`, `nx.json`/`package.json`/`tsconfig.base.json` layout and the `nimbus-weather` workspace name.
- **Enumerated task split** (`docs/RoadMap.md`, Phase 0 "Enumerated task split" item 1).
- No prior tasks (this is the first task of the first phase). No ADRs exist in `docs/decisions/` and no
  handoff exists in `docs/handoffs/` (both directories are absent) — the roadmap is the only locked
  source.
- **Blocks:** Tasks 0-2, 0-3, 0-4 and all of Phases 1–7.

## Locked decisions (from the roadmap's "Decisions needed" — recorded so the implementer does not re-litigate)
- **Package manager → npm (LOCKED).** The config's build/verify commands are already
  `npm run build` / `npm test` / `npm run lint`, and the §0.x bullets use `npm i`. Choose npm when
  prompted by `create-nx-workspace`. Do not select pnpm or yarn.
- **Nx workspace style → integrated (LOCKED).** Use `--preset=apps` (the integrated default) so Nx owns
  build/test/serve targets for both apps, matching §1's "Nx integrated monorepo".
- **Workspace name → `nimbus-weather` (LOCKED).** Matches §1 and the `@nimbus` scope used in Task 0-2.
- **Scope → `@nimbus` (LOCKED).** Keep `@nimbus` for the eventual path alias (consumed in Task 0-2);
  do not let the generator pick a different npm scope.
- **Workspace location → repo root (LOCKED).** The Nx workspace must end up at the existing repo root
  so `docs/`, `.claude/`, `CLAUDE.md`, `README.md`, and `.gitignore` stay in place — **not** nested
  under a `nimbus-weather/` subfolder. `create-nx-workspace` generates into its own `nimbus-weather/`
  directory, so generate into a temp/sibling location and move the generated files to the repo root
  (or use the appropriate Nx flag), preserving the existing files and reconciling the generated
  `.gitignore` with the existing one. This matches §1's tree (everything at root) and keeps one repo /
  one git history / the existing `pipeline.config.md` paths valid.

## Greenfield note — VERIFY BEFORE STARTING
> Unlike Phase 1, **this task is NOT blocked** — it is the one doing the bootstrapping. As of this
> planning pass the repo contains only `README.md`, `CLAUDE.md`, `.gitignore`, `docs/`, and `.claude/`.
> There is **no** `nx.json`, `package.json`, `tsconfig.base.json`, `apps/`, or `libs/`. This task
> CREATES them.
>
> **`create-nx-workspace` creates a new subdirectory — layout is LOCKED to the repo root.**
> `npx create-nx-workspace@latest nimbus-weather` generates into a `nimbus-weather/` folder, but this
> repo already exists at the root with `README.md`, `CLAUDE.md`, `.gitignore`, `docs/`, and `.claude/`.
> **Decision (locked, see "Locked decisions"): the workspace ends up at the repo root**, not nested.
> Generate into a temp/sibling location and move the generated files to the root (or use the
> appropriate Nx flag), but do **not** clobber or orphan the existing `docs/`, `.claude/`, `.gitignore`,
> `README.md`, or `CLAUDE.md`. Reconcile the generated `.gitignore` with the existing one (keep the
> existing `.env*` entries — Task 0-4 relies on them). If the move cannot be done cleanly (e.g. a name
> collision that would overwrite an existing file), STOP and surface it rather than overwriting.

## Required reading
- `docs/RoadMap.md` — Phase 0 "Scope", "Decisions needed", "Out of scope", "Success criteria", and the
  "Enumerated task split" item 1. **Mirror:** run exactly the commands named (`create-nx-workspace …
  --preset=apps`, add `@nx/angular` + `@nx/nest`, generate `apps/web` standalone+SCSS and `apps/api`).
- `docs/RoadMap.md` — §1 "Target architecture" tree. **Mirror:** the `apps/web`, `apps/api`, `libs/`
  layout and the `nimbus-weather` name.
- `CLAUDE.md` — project conventions, the "Scaffolding the project" section (carries the **stale**
  "package manager undecided" note to remove — see acceptance criterion 7), and the expected commands
  (`npm run build`, `npm test`, `npm run lint`). **Mirror:** the "document only what exists" discipline.
- `.gitignore` (existing, repo root) — already covers `/dist`, `/node_modules`, `/build`, and the
  `.env*` family. **Mirror:** preserve these entries when reconciling with the Nx-generated `.gitignore`.

## Acceptance criteria
1. **Integrated Nx workspace exists at the repo root.** `nx.json`, `package.json`, and
   `tsconfig.base.json` are present at the repo root. The workspace was created with
   `npx create-nx-workspace@latest nimbus-weather --preset=apps` (integrated), with **npm** as the
   package manager (a `package-lock.json` exists; no `pnpm-lock.yaml` / `yarn.lock`). `package.json`
   `name` reflects `nimbus-weather` (or the Nx default for that name).
2. **`@nx/angular` and `@nx/nest` are installed and registered.** Both appear in `package.json`
   `devDependencies`, and `nx.json` lists them as plugins (or the projects below reference their
   executors).
3. **`apps/web` is an Angular app, standalone + SCSS.** `apps/web/project.json` exists with Nx
   `build`/`serve`/`lint`/`test` targets. The app uses **standalone components** (no root
   `NgModule`/`AppModule`; the bootstrap is `bootstrapApplication` in `apps/web/src/main.ts`) and
   **SCSS** styling (`apps/web/src/styles.scss` exists; the schematic style was set to `scss`).
4. **`apps/api` is a NestJS app.** `apps/api/project.json` exists with Nx `build`/`serve`/`lint`/`test`
   targets, generated via `@nx/nest`. `apps/api/src/main.ts` bootstraps a Nest application.
5. **Verify commands resolve to Nx targets and pass against empty scaffolding.** All three succeed
   from the repo root with a clean exit code:
   - `npm run build` — builds the generated projects (resolves to `nx run-many -t build` or equivalent).
   - `npm run lint` — resolves to Nx lint targets and passes.
   - `npm test` — resolves to Nx test targets and passes against the generated default specs (the Nx
     defaults: `apps/web` has the bootstrap component spec, `apps/api` has the default app/controller
     spec). If a generated default spec fails out of the box, fix the generation, not the test.
   - The `package.json` `scripts` block defines `build`, `lint`, and `test` mapping to these Nx
     invocations (so `npm run build` / `npm run lint` / `npm test` work as the config promises). If Nx
     does not add `lint`/`test` scripts by default, add thin wrapper scripts (e.g.
     `"lint": "nx run-many -t lint"`, `"test": "nx run-many -t test"`).
6. **Both apps serve on the expected ports.** `nx serve api` starts the Nest server on **port 3000**
   and `nx serve web` starts the Angular dev server on **port 4200** (the Nx/Angular/Nest defaults —
   confirm `apps/web`'s serve target port is 4200 and `apps/api` listens on 3000; if `apps/api`'s
   `main.ts` reads `PORT`, it must default to `3000`). Document the actual serve commands if they
   differ from `nx serve <app>`.
7. **Remove the stale package-manager note from `CLAUDE.md`.** Now that npm is chosen, delete the
   "The package manager is not yet decided … Pick one when scaffolding and remove this note." paragraph
   (`CLAUDE.md` lines ~28–29) from the "Scaffolding the project" section. Do **not** rewrite the rest of
   `CLAUDE.md` in this task (a fuller "now scaffolded" rewrite is out of scope here — only remove the
   now-false note).
8. **Existing repo files preserved.** `docs/`, `.claude/`, `README.md`, and `CLAUDE.md` remain at the
   repo root and are not relocated or deleted. `.gitignore` still ignores `/dist`, `/node_modules`,
   `/build`, and the `.env*` family.

## What NOT to modify
- Do **not** generate `libs/shared-types` or define the `@nimbus/shared-types` path alias — that is
  **Task 0-2**.
- Do **not** install Prisma or run `prisma init` — that is **Task 0-3**.
- Do **not** add `docker-compose.yml`, `.env`, or `.env.example` — that is **Task 0-4**.
- Do **not** add any contract types, DTOs, Nest modules/providers/controllers, Angular components, or
  the `WeatherStore` — those are Phases 1, 3, and 4. Leave the generated default app code as-is.
- Do **not** add CI (GitHub Actions) — that is Phase 7.
- Do **not** add CORS config, a global `api` prefix, a `ValidationPipe`, or a proxy — those are
  Phases 3/4.
- Do **not** rewrite `CLAUDE.md` beyond deleting the stale package-manager note (criterion 7).
- **No schema migration / no new dependency** beyond what this task's scope names (`@nx/angular`,
  `@nx/nest`, and whatever `create-nx-workspace`/the generators pull in). If a step seems to need
  another dependency, STOP and ask.

## Suggested commit
```
chore(workspace): scaffold integrated Nx monorepo with web + api apps

Create the nimbus-weather Nx workspace (create-nx-workspace --preset=apps,
integrated, npm), add @nx/angular + @nx/nest, and generate apps/web
(Angular standalone components, SCSS) and apps/api (NestJS). Wire npm
run build/lint/test to Nx targets; both apps serve (web 4200, api 3000).

Empty scaffolding only — no contract types, schema, modules, or UI.
Remove the now-resolved package-manager note from CLAUDE.md (npm chosen).
```
