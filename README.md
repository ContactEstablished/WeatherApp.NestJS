<p align="center">
  <img src="docs/assets/hero.svg" alt="Nimbus — a weather app built with NestJS and Angular" width="100%">
</p>

# Nimbus

A weather app built as an Nx monorepo: a **NestJS** API, an **Angular 21** frontend, and a
shared TypeScript contract library.

## Stack

- **apps/api** — NestJS backend
- **apps/web** — Angular 21 frontend (proxies `/api` and `/health` to the API)
- **libs/shared-types** — TypeScript interfaces shared by both (`@nimbus/shared-types`)
- **prisma/** — Prisma schema + migrations against PostgreSQL

## Getting started

```bash
docker compose up -d    # start the Postgres service
npx prisma migrate dev  # apply the committed init migration
npm run dev             # NestJS on :3000 + Angular on :4200
```

## Common commands

```bash
npm run build           # build all projects
npm test                # run all Jest suites
npm run lint            # ESLint across all projects
```

See [docs/RoadMap.md](docs/RoadMap.md) for the phase plan and `docs/handoffs/` for phase handoffs.
