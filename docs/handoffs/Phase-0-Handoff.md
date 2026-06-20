# Phase 0 — Bootstrap — Handoff

**Status:** ✅ Complete. All four tasks committed on `main`:

| Task | Commit | Summary |
|------|--------|---------|
| 0-1 | `a0b81a6` | Nx integrated monorepo + `apps/web` (Angular) + `apps/api` (Nest) |
| 0-2 | `c472cec` | `libs/shared-types` + `@nimbus/shared-types` path alias |
| 0-3 | `175cf78` | Prisma stub schema (no models) |
| 0-4 | `729933c` | `docker-compose.yml` (Postgres 16) + `.env.example` |

`npm run build` / `npm run lint` / `npm test` are green across all 3 projects (`web`, `api`, `shared-types`).

## Delivered workspace shape (Phase 1 can assume this exists)

```
nx.json, package.json, tsconfig.base.json, eslint.config.mjs, jest.config.ts, jest.preset.js
apps/web/    Angular 21, standalone (bootstrapApplication), SCSS, Jest, esbuild — serve :4200
apps/api/    NestJS 11, webpack build, Jest — listens on process.env.PORT || 3000
libs/shared-types/   @nx/js library, tsc build, Jest — exports SHARED_TYPES_PLACEHOLDER (placeholder only)
prisma/schema.prisma  generator (prisma-client-js) + datasource (postgresql) only — zero models
docker-compose.yml    service `db` = postgres:16, creds nimbus/nimbus/nimbus, 5432, named volume, healthcheck
.env.example          DATABASE_URL, OPENWEATHER_API_KEY (blank=mock), PORT=3000   (.env is gitignored)
```

- **Path alias (load-bearing):** `tsconfig.base.json` → `"@nimbus/shared-types": ["./libs/shared-types/src/index.ts"]`. The leading `./` is **required** (no `baseUrl` is set; non-relative path values fail with `TS5090`). Resolution from both apps was compile-verified.
- **Docker smoke test passed:** `docker compose up -d` → container healthy in ~15s, `pg_isready` accepting connections, `docker compose down` clean (named volume persists).
- Tooling: Node 22.14, Nx 23.0.0, Angular 21.2, Nest 11, Prisma 6.19.3.

## Deviations from the Impl docs (important for later phases)

These were forced by tool-version changes since the docs were written; the locked decisions (integrated monorepo, npm, `nimbus-weather`, `@nimbus`, repo-root) were all preserved.

1. **Nx 23 workspace creation.** `--preset=apps` now maps to a TS-solution "empty" template, which **`@nx/angular` rejects** (Angular doesn't support TS project references). Created instead with `--preset=apps --workspaceType=integrated --no-workspaces --useProjectJson` → a **classic, project.json-based integrated** workspace. Also had to disable Nx "AI agent mode" (`CLAUDECODE`/`CLAUDE_CODE` unset) to get the generator path instead of a template clone. **Implication:** this is a classic (non-TS-solution) workspace; generate future libs/apps accordingly.
2. **Lint targets.** The Nest app and the shared-types lib did not get a `lint` target from their generators (lint was inferred as `eslint:lint` via `@nx/eslint/plugin`). Explicit `lint` targets (`@nx/eslint:lint`) were added to `apps/api/project.json` and `libs/shared-types/project.json` so `npm run lint` (`nx run-many -t lint`) covers all three projects.
3. **Prisma pinned to 6.x + classic generator.** Prisma 7 (and even 6.19's `init`) default to the new `prisma-client` generator (`output = "../generated/prisma"` + a `prisma.config.ts`, and omit `url` from the datasource). Pinned to **`prisma@^6` / `@prisma/client@^6`** and edited the stub to the classic form (`generator client { provider = "prisma-client-js" }` + `datasource db { provider = "postgresql"  url = env("DATABASE_URL") }`); removed the generated `prisma.config.ts`. **Implication for Phase 2/3:** the client is the classic `prisma-client-js` (generates into `node_modules/.prisma/client`), so `import { PrismaClient } from '@prisma/client'` works as the roadmap assumes.
4. **Generated `apps/api/src/main.ts`** ships the Nx default `app.setGlobalPrefix('api')`. Left as-is (generated default). Phase 3 owns the authoritative global-prefix + `/health` exclusion.

## What Phase 1 lands into
- Replace `libs/shared-types/src/index.ts` (currently just `SHARED_TYPES_PLACEHOLDER`) with the nine §0.3 response interfaces + four §0.2 request DTOs, lifted **verbatim** from `docs/reference/weather.ts`, re-exported through the barrel. Alias already resolves from both apps.
