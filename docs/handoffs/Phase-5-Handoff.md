# Phase 5 — Dev Workflow — Handoff

**Status:** Complete. Two tasks committed on `main`:

| Task | Commit | Summary |
|------|--------|---------|
| 5-1 | `989d920` | `dev` npm script + `.env.example` reconcile + `CLAUDE.md` local-dev docs |
| 5-2 | `a89925d` | Seed hook fix, migration apply, end-to-end proxy verification |

`npm run build` / `npm run lint` / `npm test` are **green across the workspace** (web, api, shared-types).

---

## What was delivered

### Task 5-1 — `dev` script + docs (`989d920`)

- **`package.json` `dev` script** — `"dev": "nx run-many -t serve"` added alongside the existing
  `build`/`lint`/`test` scripts. No new dependency (`concurrently` was explicitly not added — Nx
  already provides parallel, labelled output for multi-target runs).
- **`.env.example` reconciled** — already correct at task start; confirmed all five vars
  (`DATABASE_URL`, `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `CORS_ORIGIN`, `PORT`) with
  `DATABASE_URL=postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public` matching the
  compose `db` credentials, and the mock-fallback note present. No drift found — file unchanged.
- **`CLAUDE.md` Commands section rewritten** — now documents the three-step local-dev loop:
  `docker compose up -d` → `npx prisma migrate dev` → `npm run dev`, including a note that
  `migrate deploy` is the Phase 7 production path and that `npm run dev` brings up the API on
  `:3001` and the Angular dev server on `:4200`.
- **`CLAUDE.md` Configuration table** — added the missing `OPENWEATHER_BASE_URL` row (the var
  was present in `.env.example` but absent from the table).

### Task 5-2 — Runtime verification (`a89925d`)

- **Local Postgres confirmed** — `docker compose up -d` brings the `db` service
  (`postgres:16`, `nimbus`/`nimbus`/`nimbus`, port `5432`) to a healthy state (`pg_isready`
  healthcheck passes).
- **Migration applied cleanly** — `npx prisma migrate dev` applied the committed
  `20260620144720_init` migration with no drift; `npx prisma migrate status` reports
  **1 migration applied, no pending migrations, no schema-vs-database difference**.
  No new migration was created.
- **Seed hook fixed and confirmed** — The Phase 2 `prisma/seed.ts` stub ran cleanly after
  updating `prisma.seed` from `ts-node prisma/seed.ts` to
  `ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts`. The bare `ts-node` call
  failed in Node 22 because the monorepo's base tsconfig (`module: esnext`) was picked up by
  Node's ESM loader. The `--compiler-options` flag overrides to CommonJS for the seed execution
  only — no tsconfig or application code was changed.
- **Port note** — Docker Desktop for Windows occupies port 3000 with its own web UI on this
  machine. The API `PORT` was changed to `3001` in `.env` (local, not committed) and
  `apps/web/proxy.conf.json` updated to target `http://localhost:3001`. `.env.example` retains
  `PORT=3000` as the documented default for machines that don't have this conflict.
- **Proxy verified end-to-end** — with `npm run dev` running:
  - `GET http://localhost:4200/health` → `{"status":"ok","service":"nimbus-api","time":"..."}` ✓
  - `GET http://localhost:4200/api/weather/dashboard?location=San%20Francisco%2C%20CA&unitSystem=imperial&userId=anonymous`
    → full `WeatherDashboard` (all 9 keys: `current`, `hourly` ×7, `daily` ×5, `previews` ×3,
    `metrics` ×4, `locations`, `unitSystem`, `temperatureUnit`, `windUnit`) with mock data
    (no `OPENWEATHER_API_KEY` set) ✓

---

## Decisions recorded

| Decision | Resolution |
|----------|------------|
| `dev` script mechanism | `nx run-many -t serve` — no `concurrently`, matches existing scripts |
| Migrate command | `npx prisma migrate dev` for local loop; `migrate deploy` is Phase 7 |
| Seed execution | Run confirmed (no-op stub); hook needed `--compiler-options {"module":"CommonJS"}` fix |
| API port | `PORT=3001` in `.env` (machine-specific; `.env.example` keeps `PORT=3000` as default) |
| Docs home | `CLAUDE.md` Commands section — single canonical place |

---

## Notes for Phase 6 (Testing)

- The `docker compose up -d` `db` service is the **manual local-dev database** — it is not the
  test database. Phase 6 should provision a separate disposable Postgres (e.g., Testcontainers)
  for `PreferenceService` integration tests so test runs don't depend on the dev DB being up.
- The `prisma/seed.ts` stub (`package.json` `prisma.seed` hook) is wired and runnable. If Phase 6
  needs a known starting state (e.g., a seeded `anonymous` user preference row), running
  `npx prisma db seed` is the entrypoint — add data to `prisma/seed.ts` at that point.
- `npm run build` / `npm run lint` / `npm test` are green. Two pre-existing lint warnings in
  `apps/web/src/app/core/weather.store.ts` (non-null assertions) carry forward from Phase 4.
