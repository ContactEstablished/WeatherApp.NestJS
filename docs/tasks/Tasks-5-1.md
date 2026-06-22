# Task 5-1 — `dev` script + `.env.example` reconcile + local-dev docs

**Phase / Task:** Phase 5 — Dev Workflow · Task 1 of 2

## Surface
Repo root tooling and docs: `package.json` scripts, `.env.example`, `CLAUDE.md` Commands section.
No `apps/`, `libs/`, `prisma/`, or migration code is touched.

## Goal
Make the full local stack startable from one command and make `.env.example` the single, accurate,
documented source of every environment variable. This task adds an npm `dev` script that serves the
NestJS API (port 3000) and the Angular app (port 4200) together via `nx run-many -t serve`, confirms
`.env.example` matches the `docker-compose.yml` `db` credentials and documents all five vars with the
mock-fallback note intact, and documents the canonical `docker compose up -d` → `migrate dev` →
`npm run dev` local-dev loop in `CLAUDE.md`. The deliverable is ergonomics and documentation only —
no application code, schema, or migration changes, and no new dependency.

## Why
Today `package.json` exposes only `build`/`lint`/`test` and contributors must start each server in a
separate terminal. A single `dev` script plus a documented boot loop turns the scattered Phase 1–4
runtime knowledge into a repeatable one-command local-dev experience, and a reconciled `.env.example`
prevents credential drift against the Phase 0 compose database.

## Depends on
- Roadmap Phase 5 entry (this phase) — pre-resolved decisions below.
- Phase 0: `docker-compose.yml` `db` service (`postgres:16`, user/password/db all `nimbus`, `5432:5432`).
- Phase 4: `apps/web/proxy.conf.json` (the proxy this loop relies on at runtime — verified in Task 5-2).

## Required reading
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\package.json` — existing `scripts` block (`build`/`lint`/`test`, each `nx run-many -t <target>`); mirror that exact form for `dev` (`nx run-many -t serve`). Also note `prisma.seed` is already wired.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\docker-compose.yml` — `db` service env block (`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` = `nimbus`, port `5432`) is the credential source of truth for `.env.example`.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\.env.example` — all five vars already present (`DATABASE_URL`, `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, `PORT`); confirm-and-reconcile only.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\CLAUDE.md` — `## Commands` section (currently shows `npx nx serve api` / `npx nx serve web` in separate terminals); this is where the local-dev loop is documented. `## Configuration` table lists four vars (note `OPENWEATHER_BASE_URL` is absent there but present in `.env.example`).

## Acceptance criteria
1. `package.json` `scripts` contains a `"dev"` entry whose value is exactly `nx run-many -t serve`, matching the form of the existing `build`/`lint`/`test` scripts (`nx run-many -t <target>`).
2. No new entry is added to `dependencies` or `devDependencies` in `package.json` (no `concurrently`, no other package) — the `dev` script introduces zero new dependencies.
3. `package.json` `prisma.seed` remains `ts-node prisma/seed.ts`, unchanged.
4. `npm run dev` starts both the API serve target and the web serve target (one command launches both via Nx). Verified by observing both serve targets initialize when the command is run.
5. `.env.example` documents exactly the five variables `DATABASE_URL`, `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, `PORT` — no additions, no removals.
6. `.env.example` `DATABASE_URL` equals `postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`, and its user/password/database/port match the `docker-compose.yml` `db` service (`nimbus`/`nimbus`/`nimbus`/`5432`) exactly.
7. `.env.example` retains the OpenWeather mock-fallback note (the app runs with mock weather data when `OPENWEATHER_API_KEY` is blank/omitted).
8. `.env.example` keeps `CORS_ORIGIN=http://localhost:4200` and `PORT=3000`.
9. Edits to `.env.example` are limited to genuine drift fixes against `docker-compose.yml`; if no drift exists, the file is confirmed unchanged (criteria 5–8 still verified as already satisfied).
10. `CLAUDE.md` `## Commands` section documents the canonical local-dev loop in one place: `docker compose up -d` (start the `db`), `npx prisma migrate dev` (apply the committed migration; note `migrate deploy` is the Phase 7 production path), and `npm run dev` (serve both apps). The separate-terminal `nx serve` note may remain as the manual alternative but the one-command loop is the documented primary path.
11. `CLAUDE.md` documentation states that `npm run dev` serves the API on `http://localhost:3000` and the Angular app on `http://localhost:4200`.
12. After the changes, `npm run build`, `npm run lint`, and `npm test` all stay green.

## What NOT to modify
- Any code under `apps/`, `libs/`, or `prisma/` (including `prisma/schema.prisma`, `prisma/seed.ts`, and migration SQL).
- `docker-compose.yml` (no compose authoring — Phase 0 owns it).
- `apps/web/proxy.conf.json` (Phase 4; runtime-verified in Task 5-2, not edited).
- The `build`/`lint`/`test` scripts or the `prisma.seed` hook in `package.json`.
- No schema migration / no new dependency unless the roadmap says so — the roadmap explicitly forbids both here. If a step seems to need one, STOP and ask.

## Decisions locked
- `dev` script value: `nx run-many -t serve` (no `concurrently`, no new dependency).
- Migrate command documented for the local loop: `npx prisma migrate dev`; `migrate deploy` is Phase 7 — document both but only `migrate dev` is the local path.
- Docs home: `CLAUDE.md` `## Commands` section (single canonical place).
- `.env.example` work is confirm-and-reconcile against compose, not authoring — fix only genuine drift.

## Approval gates
- Editing `CLAUDE.md` requires confirming the proposed `## Commands` edit with the human before applying it.
- If reconciliation reveals the need for any schema, migration, or new-dependency change, STOP and request approval — these are out of scope for Phase 5.

## Suggested commit
```
chore(dev): add npm dev script and document local-dev loop

Add a `dev` npm script (`nx run-many -t serve`) that boots the NestJS API
and Angular app together, reconcile `.env.example` against the compose `db`
credentials, and document the `docker compose up -d` -> `prisma migrate dev`
-> `npm run dev` loop in CLAUDE.md. No app, schema, or dependency changes.
```
