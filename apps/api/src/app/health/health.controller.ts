import { Controller, Get } from '@nestjs/common';

/**
 * Endpoint #1 — liveness probe. Sits OUTSIDE the global `api` prefix
 * (excluded in main.ts), so it is served at `GET /health`, not `/api/health`.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; service: string; time: string } {
    return {
      status: 'ok',
      service: 'nimbus-api',
      time: new Date().toISOString(),
    };
  }
}
