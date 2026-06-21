# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

**Phase 4 (Frontend — Angular) is complete.** The repository is a fully scaffolded Nx monorepo
with three projects: `apps/api` (NestJS backend), `apps/web` (Angular 21 frontend), and
`libs/shared-types` (TypeScript contract types). The active phase is **Phase 5 — Dev Workflow**.

See `docs/handoffs/Phase-4-Handoff.md` for what landed in Phase 4.
See `docs/RoadMap.md` for the full phase sequence and Phase 5 scope.

## Monorepo layout

```
apps/
  api/          NestJS backend (Phase 3, read-only in Phase 5+)
  web/          Angular 21 frontend (Phase 4, read-only in Phase 5+)
libs/
  shared-types/ TypeScript interfaces shared by api and web (Phase 1, read-only)
prisma/         Prisma schema + migrations (Phase 2, read-only)
docs/
  RoadMap.md
  handoffs/
  tasks/
  prompts/
```

## Commands

```bash
# Build all projects
npm run build           # or: npx nx run-many -t build

# Run tests
npm test                # runs all Jest suites
npm test -- <pattern>   # run a single test file

# Lint
npm run lint            # ESLint across all projects

# Dev servers (run in separate terminals)
npx nx serve api        # NestJS on http://localhost:3000
npx nx serve web        # Angular on http://localhost:4200 (proxies /api and /health to :3000)
```

## Configuration

Environment config lives in dotenv files (`.env`, `.env.development`, etc.) — never committed.
Required variables for the API:

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `OPENWEATHER_API_KEY` | OpenWeather API key | (optional — mock data if absent) |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:4200` |
| `PORT` | API listen port | `3000` |

## Key architecture notes

- **Angular signals state** — `apps/web/src/app/core/weather.store.ts` is the single source of
  truth for UI state. All components inject it via `inject(WeatherStore)`. Do not add RxJS
  observables to application state; use signals.
- **HTTP proxy** — `apps/web/proxy.conf.json` forwards `/api` and `/health` from the Angular dev
  server to `localhost:3000`. No CORS headers are needed on the frontend.
- **Shared types** — import from `@nimbus/shared-types` (path alias wired in `tsconfig.base.json`).
  Do not duplicate types; do not modify `libs/shared-types` without a Phase 1 decision.
- **DOM/class fidelity** — `apps/web/src/styles.scss` is a verbatim port of the source Vue
  `styles.css`. Class names are load-bearing. Do not rename classes or restructure DOM in
  `apps/web/src/app/`.
- **lucide-angular** — icon library installed at v1.0.0. Import named icon data objects and pass
  via `[img]` input to `<lucide-icon>`. Use `LucideAngularModule` in component `imports`.
- **`@for`/`@if` control flow** — the ESLint `prefer-control-flow` rule is enforced; use Angular
  17+ built-in control flow, not `*ngFor`/`*ngIf` directives.
