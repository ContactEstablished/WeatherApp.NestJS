# Task 5-2 — Local DB bring-up, migration apply, seed decision, and end-to-end proxy check

**Phase / Task:** Phase 5 — Dev Workflow · Task 2 of 2

## Surface
Local runtime only: the Phase 0 docker-compose `db` service, the committed Phase 2 migration, the
Phase 2 seed hook, and the Phase 4 dev proxy. This task runs and verifies the stack; it produces no
application, schema, or migration code. Any artifact it writes is documentation (the seed decision
and verification notes), not code.

## Goal
Prove the local-dev loop works end-to-end for the first time. Bring up the Phase 0 Postgres `db`
service, apply the committed Phase 2 `init` migration against it and confirm `migrate status` reports
exactly one applied migration with no drift, execute the seed decision (run the no-op `db seed` stub
and confirm the `prisma.seed` hook is wired, or document a deliberate deferral), and — with
`npm run dev` running — confirm the Phase 4 proxy forwards `/api/weather/dashboard` and `/health`
from the Angular dev server on 4200 to the API on 3000, returning their correct §0.2 shapes (mock
data, no API key required).

## Why
The committed migration, seed stub, and dev proxy have never been exercised at runtime together.
Running them once and pinning the expected outputs converts "should work" into a verified, repeatable
local boot and surfaces any drift between the committed schema and a fresh database before later
phases depend on it.

## Depends on
- Task 5-1 (the `dev` script and reconciled `.env.example` this task exercises).
- Phase 0: `docker-compose.yml` `db` service.
- Phase 2: `prisma/migrations/20260620144720_init/migration.sql` (committed) and `prisma/seed.ts` (stub) + `package.json` `prisma.seed` hook.
- Phase 4: `apps/web/proxy.conf.json` (the proxy under test).

## Required reading
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\docker-compose.yml` — `db` service to bring up with `docker compose up -d`; `pg_isready` healthcheck defines "healthy".
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\.env.example` — copy to `.env`; `DATABASE_URL` is what `prisma migrate dev` connects with (must match compose, reconciled in Task 5-1).
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\prisma\seed.ts` — the no-op stub `main()`; run as-is, do not author data.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\package.json` — `prisma.seed = "ts-node prisma/seed.ts"`; `npx prisma db seed` invokes this hook.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\apps\web\proxy.conf.json` — forwards `/api` and `/health` to `http://localhost:3000`; the contract this task verifies at runtime.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\apps\api\src\app\weather\weather.controller.ts` — `GET /api/weather/dashboard` returns `Promise<WeatherDashboard>`; query params (`location`/`unitSystem`/`userId`) default internally, so a bare request returns a full dashboard.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\apps\api\src\app\health\health.controller.ts` — `GET /health` (outside the `api` prefix) returns `{ status: 'ok', service: 'nimbus-api', time: <ISO string> }`.
- `C:\Projects\ContactEstablished\WeatherApp.NestJS\libs\shared-types\src\lib\weather.ts` — `WeatherDashboard` shape: keys `current`, `hourly`, `daily`, `previews`, `metrics`, `locations`, `unitSystem`, `temperatureUnit`, `windUnit`.

## Acceptance criteria
1. `docker compose up -d` brings the `db` service to a healthy state (its `pg_isready` healthcheck passes); the running container is confirmed (e.g. via `docker compose ps`).
2. A local `.env` exists (copied from `.env.example`) with `DATABASE_URL` pointing at the compose `db` (`postgresql://nimbus:nimbus@localhost:5432/nimbus?schema=public`).
3. `npx prisma migrate dev` applies the committed `20260620144720_init` migration against the live `db` without error.
4. `npx prisma migrate status` reports exactly one migration applied and no drift / no pending migrations / no schema-vs-database difference.
5. No new migration directory is created under `prisma/migrations/` by this task (the committed `init` migration is the only one).
6. The seed decision is executed: `npx prisma db seed` is run (the no-op stub completes successfully via the `prisma.seed` hook) OR a deliberate deferral is documented with a stated reason. Whichever is chosen is recorded as the resolved decision.
7. The `prisma.seed` hook is confirmed wired: `package.json` `prisma.seed` is `ts-node prisma/seed.ts` and `npx prisma db seed` resolves to it (no error about a missing/misconfigured seed command).
8. `prisma/seed.ts` remains the unchanged Phase 2 stub (no seed data authored).
9. With `npm run dev` running, `http://localhost:4200/api/weather/dashboard` returns HTTP 200 with a JSON body matching the `WeatherDashboard` shape — all of `current`, `hourly`, `daily`, `previews`, `metrics`, `locations`, `unitSystem`, `temperatureUnit`, `windUnit` present — served as mock data with no `OPENWEATHER_API_KEY` set.
10. With `npm run dev` running, `http://localhost:4200/health` returns HTTP 200 with body `{ status: "ok", service: "nimbus-api", time: <ISO 8601 string> }`, proving the proxy forwards `/health` (outside the `api` prefix) to the API on 3000.
11. Both responses in criteria 9–10 are confirmed to arrive via the 4200 dev-server proxy (request made to `localhost:4200`, not directly to `localhost:3000`).
12. `npm run build`, `npm run lint`, and `npm test` all stay green.

## What NOT to modify
- `prisma/schema.prisma`, any file under `prisma/migrations/`, and `prisma/seed.ts` (run the stub; do not edit it).
- `docker-compose.yml` (use the existing `db` service as-is).
- `apps/web/proxy.conf.json` and any code under `apps/` or `libs/` (verify at runtime only).
- `package.json` scripts and the `prisma.seed` hook (confirm wiring; do not change).
- No schema migration / no new dependency unless the roadmap says so — the roadmap explicitly forbids both. If a step seems to need one (e.g. `migrate dev` wants to create a new migration), STOP and ask.

## Decisions locked
- Migrate command for the local loop: `npx prisma migrate dev` (not `migrate deploy`, which is Phase 7).
- Seed: run `npx prisma db seed` against the no-op stub (safe) and document the hook; do not author seed data. A deliberate documented deferral is the only acceptable alternative.
- Compose: use the existing Phase 0 `db` service; no compose edits.
- Dashboard verification uses mock data (no `OPENWEATHER_API_KEY`); a bare `/api/weather/dashboard` request is valid because the controller defaults its query params.

## Approval gates
- If `npx prisma migrate dev` reports drift or wants to create a new migration (rather than applying the committed `init` cleanly), STOP and request approval — authoring a new migration is out of scope for Phase 5.
- If verifying the loop appears to require any app, schema, migration, or dependency change, STOP and ask before proceeding.

## Suggested commit
```
docs(dev): verify local boot loop and record seed decision

Bring up the compose db, apply the committed init migration (status: 1
applied, no drift), run the no-op seed via the prisma.seed hook, and confirm
the Phase 4 proxy forwards /api/weather/dashboard and /health from 4200 to
the API on 3000. Documentation only; no app, schema, or migration changes.
```
