# Impl 3-2 — App shell: health endpoint, global prefix, CORS, global ValidationPipe

**Acceptance contract:** `docs/tasks/Tasks-3-2.md`
**Decision lock:** No ADR. Locked by `docs/RoadMap.md` §0.2 (endpoint #1 `/health` outside `api`
prefix), §4 (health-route placement, camelCase JSON, CORS/ports), and Phase 3 "Cross-cutting
wiring" / "Validation strictness" decisions (whitelist + forbidNonWhitelisted + transform;
CORS `http://localhost:4200`; no key-renaming transformer). Phase 0 Handoff deviation #4 explicitly
defers the authoritative prefix to this task.
**Scope:** `apps/api` only — create `HealthController`, modify `main.ts` (excluded prefix, CORS,
global `ValidationPipe`), and register `HealthController` in `app.module.ts`. No schema change,
no new dependency, no shared-types edits.

---

## Step 0 — Pre-flight

**Branch check**

```powershell
git status
```

Expected: `nothing to commit, working tree clean` on `main`.

**Baseline build / test / lint green**

```powershell
npm run build
npm test
npm run lint
```

All three must exit 0 before any edits are made. If any fail, stop and resolve the pre-existing
breakage — do not attribute it to this task.

**Files to open before starting**

| File | What to confirm |
|---|---|
| `apps/api/src/main.ts` | Contains the Phase 0 default: `app.setGlobalPrefix('api')` (bare, no options object), no `enableCors`, no `useGlobalPipes`. |
| `apps/api/src/app/app.module.ts` | After Task 3-1: imports `ConfigModule.forRoot({ isGlobal: true })` and `PrismaModule`; still lists `AppController` and `AppService` in controllers/providers. |
| `apps/api/src/app/app.controller.ts` | The Phase 0 placeholder: `@Controller()` with `@Get()` returning `this.appService.getData()`. Mirror its decorator shape for `HealthController`. |
| `apps/api/src/app/app.controller.spec.ts` | The existing spec that tests `AppController.getData()` returns `{ message: 'Hello API' }`. Must stay green (or be removed together with `AppController`). |
| `apps/api/src/app/app.service.spec.ts` | The existing spec that tests `AppService.getData()`. Same rule. |

**STOP if any of the following are true:**
- Task 3-1 is not complete (`ConfigModule` or `PrismaModule` absent from `app.module.ts` — these are
  hard preconditions for the global pipe and CORS-origin config injection).
- `apps/api/src/app/health/` already exists (would indicate a partial prior attempt).
- `main.ts` already contains `enableCors` or `useGlobalPipes` (same concern).
- `npm run build`, `npm test`, or `npm run lint` fails at baseline.

---

## Step 1 — Create `HealthController`

**File to create:** `apps/api/src/app/health/health.controller.ts`

Create the `apps/api/src/app/health/` directory and the controller file. The controller uses
`@Controller('health')` so its single `@Get()` method resolves to `GET /health` (before the
global prefix is applied, the route path is just `health`; the exclusion in Step 2 prevents
the `api` prefix from being prepended).

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: string; service: string; time: string } {
    return {
      status: 'ok',
      service: 'nimbus-api',
      time: new Date().toISOString(),
    };
  }
}
```

**Checklist before saving:**
- `status` is the string literal `'ok'` (not a variable).
- `service` is the string literal `'nimbus-api'` (not a variable).
- `time` is `new Date().toISOString()` — a fresh timestamp per call, not a module-load constant.
- Keys are camelCase as written: `status`, `service`, `time`.
- No imports from `@nimbus/shared-types` — the health body is not a shared contract type (Tasks doc
  §Required reading, §Acceptance criteria 1 note).
- No class-validator decorators, no `ClassSerializerInterceptor`, no injected service.
- Return type annotation is inline; no additional export is needed.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. The new file must compile cleanly inside the `apps/api` TypeScript project.
If the build cites an import error or "cannot find module", confirm the file is inside `apps/api/src/`
and that no absolute import path typo was introduced.

---

## Step 2 — Register `HealthController` in `AppModule`

**File:** `apps/api/src/app/app.module.ts`

Add `HealthController` to the `controllers` array. The Task 3-2 scope explicitly allows removing
the placeholder `AppController` / `AppService` **only if** the associated specs are also removed
(keeping `npm test` green either way). The safest approach — requiring no spec changes — is to
keep `AppController` and `AppService` alongside `HealthController`. Choose one path and apply it
consistently.

**Option A (recommended) — keep the placeholders:**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

**Option B — drop placeholders (only if you also delete their spec files):**
Remove `AppController`, `AppService`, `app.controller.spec.ts`, and `app.service.spec.ts` and
list only `HealthController` in `controllers`. If you take this path you must delete the two
spec files in the same step, otherwise `npm test` will fail on a missing controller/service.

Pick Option A unless you have a strong reason for B. This Impl doc proceeds assuming Option A.

**Verify:**

```powershell
npm run build
npm test
```

Both must exit 0. Specifically, `npm test` must not report `AppController` or `AppService`
resolution errors — if `HealthController` is listed correctly in the module but the spec for
`AppController` breaks, it usually means the module no longer exports `AppService`; confirm the
`providers` array still includes `AppService` when Option A is taken.

---

## Step 3 — Update `main.ts`: excluded global prefix, CORS, and global `ValidationPipe`

**File:** `apps/api/src/main.ts`

This is the core of Task 3-2. Replace the current `main.ts` with the version below. Three changes
are made relative to the Phase 0 default; keep everything else (the `Logger`, the `NestFactory.create`
call, the `port` constant, the `app.listen(port)` call, and the startup log) intact.

1. Import `RequestMethod` and `ValidationPipe` from `@nestjs/common`.
2. Import `ConfigService` from `@nestjs/config`.
3. Replace the bare `app.setGlobalPrefix(globalPrefix)` with the excluded form.
4. Add `app.enableCors(...)` reading the CORS origin from `ConfigService` (with
   `'http://localhost:4200'` as the hardcoded default).
5. Add `app.useGlobalPipes(new ValidationPipe(...))` with the three required options.

```ts
/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:4200');

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.enableCors({ origin: corsOrigin });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
```

**Checklist before saving:**
- `RequestMethod.GET` (not a string `'GET'`) is used in the exclude entry — it requires the
  `RequestMethod` import from `@nestjs/common`.
- The excluded path is `'health'` (no leading slash; Nest matches it against the route path
  before prefix prepending).
- `enableCors` is called with `{ origin: corsOrigin }` — a single string origin, not an array.
  The `ConfigService.get` call provides `'http://localhost:4200'` as the default so the origin
  is never `undefined` even if `.env` does not define `CORS_ORIGIN`.
- `ValidationPipe` is instantiated with exactly `{ whitelist: true, forbidNonWhitelisted: true,
  transform: true }`. Do not add any other option (no `transformOptions`, no `exceptionFactory`,
  no `disableErrorMessages`).
- The startup `Logger.log` string is updated to drop the rocket emoji (per the Tasks doc
  "camelCase / no transformer" spirit — cosmetic; keep whatever style the existing log uses if
  you prefer, as long as the port and prefix are reflected). The example above removes the emoji
  character that was in the Phase 0 default.
- **No** `ClassSerializerInterceptor` or `app.useGlobalInterceptors(...)` call is added. JSON
  stays camelCase by default — do not introduce a key-renaming transformer.
- The existing `const port = process.env.PORT || 3000` and `app.listen(port)` lines are
  **unchanged**.

**Verify:**

```powershell
npm run build
```

Expected: exits 0. If `ConfigService` or `RequestMethod` are not found, check that `@nestjs/config`
is in the installed dependencies (Task 3-1 precondition) and that the import path is exactly
`@nestjs/config` (not a relative path).

---

## Step 4 — Smoke-test the running server (manual)

Start the API in non-watch mode to confirm the bootstrap sequence resolves and `GET /health`
returns the correct body:

```powershell
npx nx serve api
```

In a second terminal:

```powershell
# Should return 200 with { status: 'ok', service: 'nimbus-api', time: <ISO> }
curl http://localhost:3000/health

# Should return 404 — the health route must NOT be double-prefixed
curl -o /dev/null -s -w "%{http_code}" http://localhost:3000/api/health

# Preflight CORS check — should receive Access-Control-Allow-Origin: http://localhost:4200
curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: http://localhost:4200" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3000/health
```

On Windows PowerShell without `curl`, use:

```powershell
Invoke-RestMethod http://localhost:3000/health

# Expect 404
try { Invoke-RestMethod http://localhost:3000/api/health } catch { $_.Exception.Response.StatusCode }

# CORS header
$r = Invoke-WebRequest -Uri http://localhost:3000/health `
  -Headers @{ 'Origin' = 'http://localhost:4200' } -Method GET
$r.Headers['Access-Control-Allow-Origin']
```

**Acceptance checks:**
- `GET /health` → HTTP 200, body `{ "status": "ok", "service": "nimbus-api", "time": "<ISO>" }`.
  The `time` value is a valid ISO-8601 string ending in `Z` (e.g. `"2026-06-20T14:30:00.000Z"`).
- `GET /api/health` → HTTP 404 (the health route is excluded from the prefix; it does not exist
  under `/api`).
- CORS response for `Origin: http://localhost:4200` includes
  `Access-Control-Allow-Origin: http://localhost:4200`.
- The startup log (stdout) reflects `http://localhost:3000/api` and exits cleanly (no unhandled
  exception, no "Nest can't resolve dependencies" DI error).

Stop the server (`Ctrl+C`) after the checks pass.

**Verify:** All three `curl`/`Invoke` checks above pass. If `GET /health` returns 404, the most
common causes are: (a) `HealthController` not registered in `AppModule`, (b) the `@Controller('health')`
path does not match the exclusion string `'health'`, or (c) the `setGlobalPrefix` exclude block has a
leading slash (`'/health'` — Nest's exclude path must match the bare route string without a slash).

---

## Step 5 — Full build / lint / test gate

```powershell
npm run build
```

Expected: exits 0 across all workspace projects (`web`, `api`, `shared-types`).

```powershell
npm run lint
```

Expected: exits 0. If `@typescript-eslint` flags the inline return-type annotation on `getHealth()`,
either annotate with `: object` or suppress the specific rule — do not remove the return body values.
The no-new-spec constraint means you must not add an ESLint disable for a rule that currently passes.

```powershell
npm test
```

Expected: exits 0. The existing `app.controller.spec.ts` and `app.service.spec.ts` must still pass
(if Option A was taken). No new spec files are introduced. The `passWithNoTests: true` flag in
`apps/api/project.json` means a zero-spec run exits 0, but the existing two specs must still resolve.

**Verify:** All three commands exit 0.

---

## Step 6 — Diff sanity check and commit

### Sanity check

```powershell
git diff --stat HEAD
git status
```

**Expected changed/new files (Option A — placeholders kept):**

```
 apps/api/src/app/app.module.ts              |  ... (modified)
 apps/api/src/app/health/health.controller.ts | ... (new)
 apps/api/src/main.ts                        |  ... (modified)
 3 files changed, ...
```

If Option B (placeholders removed) was taken, add `app.controller.ts`, `app.service.ts`,
`app.controller.spec.ts`, `app.service.spec.ts` to the expected deletions.

**Must NOT appear in the diff:**
- `libs/shared-types/` (Phase 1, read-only here).
- `prisma/` (no schema change).
- Any file outside `apps/api/src/`.
- Any new `*.spec.ts` file.

If unexpected files appear, revert them before committing.

### Stage and commit

```powershell
git add apps/api/src/app/health/health.controller.ts
git add apps/api/src/app/app.module.ts
git add apps/api/src/main.ts
```

If Option B was taken, also stage the four deleted files:
```powershell
git rm apps/api/src/app/app.controller.ts
git rm apps/api/src/app/app.service.ts
git rm apps/api/src/app/app.controller.spec.ts
git rm apps/api/src/app/app.service.spec.ts
```

Confirm the staged set:

```powershell
git status
```

Then commit:

```powershell
git commit -m "feat(api): add /health endpoint and wire prefix, CORS, and ValidationPipe

Author HealthController serving GET /health -> { status: 'ok', service:
'nimbus-api', time: <ISO> } and set the authoritative bootstrap config in
main.ts:

- global prefix 'api' with /health excluded, so #1 sits outside /api and
  #2-#11 resolve under /api (RoadMap §0.2 / §4 health-route gotcha);
- CORS allowing http://localhost:4200 (origin from ConfigService);
- global ValidationPipe { whitelist, forbidNonWhitelisted, transform } for
  the Task 3-4/3-5 request DTOs.

camelCase JSON preserved (no key-renaming transformer added). App boots on
PORT||3000; GET /health returns the contract body. Feature modules are
Tasks 3-3..3-5. build/lint/test green."
```

No `Co-Authored-By` trailer.

**Final verify:**

```powershell
git show --stat HEAD
```

Expected: the commit message above appears at HEAD; the stat shows exactly the three modified/new
files (or three + four deletions if Option B was taken). Author is the git user only.

---

## Summary of gates

| Step | Gate |
|------|------|
| 0 | `git status` clean; `npm run build` + `npm test` + `npm run lint` green at baseline; Task 3-1 confirmed complete (`ConfigModule`/`PrismaModule` in `app.module.ts`) |
| 1 | `npm run build` exits 0 after `health.controller.ts` created |
| 2 | `npm run build` + `npm test` exit 0 after `HealthController` registered in `AppModule` |
| 3 | `npm run build` exits 0 after `main.ts` updated (excluded prefix, CORS, `ValidationPipe`) |
| 4 | `GET /health` → 200 with `{ status, service, time }`; `GET /api/health` → 404; CORS header present for `http://localhost:4200` origin |
| 5 | `npm run build` + `npm run lint` + `npm test` all exit 0 |
| 6 | `git diff --stat HEAD` shows exactly the 3 expected files (no schema, no shared-types, no new specs); commit message matches Tasks doc; no Co-Authored-By trailer |
