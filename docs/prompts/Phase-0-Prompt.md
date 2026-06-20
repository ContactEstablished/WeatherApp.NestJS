# Execution Prompt — Phase 0: Bootstrap

Paste into a fresh session rooted at the repo root. Run only after `main` is clean and `git status` shows no uncommitted changes.

---

You are the lead full-stack engineer for the WeatherApp.NestJS project, working across an Angular front end, a NestJS/Node.js API, and a PostgreSQL database. You design, implement, test, and validate the work directly, following the repo's existing conventions and keeping type safety, clear contracts between the API and the client, and database integrity in mind.

---

## Required reading, in order, before any code

1. **Roadmap Phase 0 — Bootstrap** (`docs/RoadMap.md`, "### Phase 0 — Bootstrap"):
   - Read "Goal", "Scope (in scope)", "Decisions needed", "Out of scope", and "Success criteria" sections.
   - This phase stands up an Nx integrated monorepo with empty-but-wired scaffolding: `apps/web` (Angular), `apps/api` (NestJS), `libs/shared-types` with the `@nimbus/shared-types` path alias, Prisma initialized (stub only), local Postgres via `docker-compose`, and env config.
   - **Structure and configuration only** — no contract types, no business logic, no schema models.

2. **Roadmap §1 — Target architecture** (`docs/RoadMap.md`, lines ~228–248):
   - Confirms the workspace layout and the `nimbus-weather` workspace name.

3. **Roadmap §4 — Risks / gotchas** (`docs/RoadMap.md`, lines ~495–501):
   - Confirms the mock fallback when `OPENWEATHER_API_KEY` is missing.

4. **Roadmap §6 — New repository creation** (`docs/RoadMap.md`, lines ~514–518):
   - Confirms `.env.example` commit policy and `.env` gitignore.

5. **CLAUDE.md** (`CLAUDE.md`):
   - The "Scaffolding the project" section has a stale "package manager undecided" note that Task 0-1's Impl doc will instruct you to remove.
   - The "Expected commands" section lists `npm run start:dev`, `npm run build`, `npm run lint`, `npm test` — these are NestJS defaults; the config overrides them to `npm run build` / `npm run lint` / `npm test` via Nx targets.

---

## Session-start checklist

1. **Clean working tree.** Run `git status` — must show `nothing to commit, working tree clean`.
2. **No Nx workspace yet.** Confirm `nx.json` and `package.json` do **not** exist. Phase 0 creates them.
3. **Existing files preserved.** Confirm `README.md`, `CLAUDE.md`, `docs/`, and `.claude/` all exist at the repo root.
4. **After each task, verify:**
   - `npm run build` exits 0.
   - `npm run lint` exits 0.
   - `npm test` exits 0.
   - The commit is made with the conventional message from the Impl doc (no `Co-Authored-By` trailer).

---

## Important context

- **Package manager → npm (LOCKED).** The config's build/verify commands are already `npm run build` / `npm run lint` / `npm test`. Use npm when prompted by `create-nx-workspace` — do not select pnpm or yarn.
- **Nx workspace style → integrated (LOCKED).** Use `--preset=apps` so Nx owns build/test/serve targets for both apps, matching the roadmap's stated "Nx integrated monorepo".
- **Workspace name → `nimbus-weather` (LOCKED).** Matches the roadmap and the `@nimbus` scope used in the `@nimbus/shared-types` alias.
- **Workspace location → repo root (LOCKED).** The Nx workspace ends up at the existing repo root (preserving `docs/`, `.claude/`, `CLAUDE.md`, `README.md`, `.gitignore`), not nested under a `nimbus-weather/` subfolder.
- **Scope → `@nimbus` (LOCKED).** The path alias is exactly `@nimbus/shared-types` (load-bearing for Phase 1).
- **`.env` policy → commit `.env.example` only; gitignore `.env` (LOCKED). APPROVAL REQUIRED BEFORE COMMIT (Task 0-4).**
  - The roadmap flags this as a repo-policy edit requiring explicit approval.
  - Surface it for human sign-off in Task 0-4, Step 2, before committing `.env.example`.

---

## Mission

**Deliver Phase 0 — Bootstrap end to end.** Stand up the Nx integrated monorepo and all empty-but-wired scaffolding. The deliverable is a workspace where every later phase already has a place to put its code.

### Step 0 — Lock decisions before coding

The roadmap's Phase 0 "Decisions needed" block lists four decisions. All are locked above in "Important context" — do not re-litigate them. Proceed directly to Step 1.

### Step 1 — Write the task specs (one commit)

The four Phase 0 tasks are:

1. **Task 0-1 — Create the Nx workspace and generate both apps** (`docs/tasks/Tasks-0-1.md` / `docs/tasks/Impl-0-1.md`)
   - **Acceptance:** Integrated Nx workspace (npm, `--preset=apps`, `nimbus-weather` name) at repo root. `@nx/angular` + `@nx/nest` installed. `apps/web` (Angular standalone, SCSS) and `apps/api` (NestJS) generated. `npm run build` / `npm run lint` / `npm test` resolve to Nx targets and pass. Both apps serve (web 4200, api 3000). Stale package-manager note removed from `CLAUDE.md`. Existing repo files preserved.
   - **Hardest prerequisite for the rest** — Tasks 0-2, 0-3, 0-4 and all later phases depend on this.

2. **Task 0-2 — Generate `libs/shared-types` and establish the `@nimbus/shared-types` path alias** (`docs/tasks/Tasks-0-2.md` / `docs/tasks/Impl-0-2.md`)
   - **Acceptance:** `libs/shared-types` Nx library exists. Single placeholder export only (no real contract types). `@nimbus/shared-types` path alias present and exactly spelled in `tsconfig.base.json`. Alias resolves from both `apps/web` and `apps/api` (compile-checked, throwaway imports then removed). Build/lint/test green.
   - **Depends on Task 0-1.** Alias spelling is load-bearing for Phase 1.

3. **Task 0-3 — Initialize Prisma (stub schema, no models)** (`docs/tasks/Tasks-0-3.md` / `docs/tasks/Impl-0-3.md`)
   - **Acceptance:** `prisma` (devDependency) + `@prisma/client` (dependency) installed. `npx prisma init --datasource-provider postgresql` creates `prisma/schema.prisma` (stub: generator + datasource blocks only, zero models). `npx prisma validate` passes. No `prisma/migrations/` directory. No `.env` committed. Build/lint/test green.
   - **Depends on Task 0-1.** No schema models (Phase 2).

4. **Task 0-4 — Add local Postgres (docker-compose) and environment config** (`docs/tasks/Tasks-0-4.md` / `docs/tasks/Impl-0-4.md`)
   - **Acceptance:** `docker-compose.yml` at repo root with `postgres:16` service (credentials matching the connection string). `.env.example` committed (placeholder values only: `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`, blank `OPENWEATHER_API_KEY`, `PORT=3000`). `.env` gitignored, never committed. `docker compose up -d` brings up Postgres. `DATABASE_URL` consistent across compose, `.env`, and `.env.example`. `npx prisma validate` passes. Build/lint/test green.
   - **Approval gate:** `.env` policy is a repo-policy edit requiring human sign-off before commit (Step 2 in the Impl doc).
   - **Depends on Task 0-1 and Task 0-3** (reconciles `DATABASE_URL`).

### Step 2 — Implement, one task per commit

Execute each task in dependency order: **0-1 → 0-2 → 0-3 → 0-4**. For each task:

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

1. **Verify every success criterion** from the roadmap's "Success criteria" section (Phase 0 → lines ~320–330):
   - The workspace builds clean: `npm run build`, `npm run lint`, `npm test` all pass.
   - `apps/web` and `apps/api` exist and serve (Angular dev server on 4200, Nest on 3000).
   - `libs/shared-types` resolves via `@nimbus/shared-types` from both apps.
   - `npx prisma` is runnable and `prisma/schema.prisma` exists (stub, no models).
   - `docker compose up -d` brings up the `postgres:16` service.
   - `.env.example` documents `DATABASE_URL`, `OPENWEATHER_API_KEY`, and `PORT`.

2. **Update the roadmap** (optional but recommended): If the repo uses a convention to mark phases complete, flip the ledger row from "in progress" to complete.

3. **Write a Phase 0 handoff** to `docs/handoffs/` (optional):
   - A brief document of the shape of the delivered workspace, so Phase 1 can assume it exists.
   - Example: "Nx workspace `nimbus-weather` at repo root; `apps/web` + `apps/api` serve on 4200 + 3000; `@nimbus/shared-types` path alias confirmed; Prisma stub + local Postgres via docker-compose running."

4. **Final commit** (after all four tasks are merged):
   - Commit message: `docs: close out Phase 0`
   - Content: any updated roadmap row, the Phase 0 handoff (if written), or just a marker.

5. **Confirm clean tree:**
   ```
   git status
   # Expected: nothing to commit, working tree clean
   ```

---

## Scope guardrails (do NOT)

**Out of scope — from the roadmap, Phase 0 "Out of scope":**
- Do NOT add §0.3 response contract types or §0.2-derived request DTOs — those are Phase 1.
- Do NOT author Prisma schema models (`UserPreference`, `SavedLocation`) or run `prisma migrate dev` — that is Phase 2. **Schema migrations require approval before apply.**
- Do NOT add backend modules/providers (Prisma, Config, Health, Weather, Users) or service logic — that is Phase 3.
- Do NOT add Angular UI, components, or state — that is Phase 4.
- Do NOT add CI (GitHub Actions) — that is Phase 7.

**Do NOT:**
- Weaken or remove `.env*` entries from `.gitignore` (they must remain).
- Commit a real `.env` or any real secret (`OPENWEATHER_API_KEY`, DB password). `.env.example` carries placeholders only.
- Add `api` or `web` services to `docker-compose.yml` — Phase 0 only needs the local `postgres:16` service. Full compose is Phase 7.
- Add new npm dependencies unless the roadmap or a task explicitly names them. If a build step seems to need another package, **STOP and ask.**
- Refactor files or add code outside the scaffolding. Phase 0 is structure and config only.
- Modify files outside the four task scopes (e.g., do not rewrite all of `CLAUDE.md` — Task 0-1 only removes one paragraph).
- Introduce any validation decorators, runtime code, or app logic. Empty scaffolding only.

---

End of execution prompt. Proceed to Task 0-1 (Impl doc: `docs/tasks/Impl-0-1.md`).
