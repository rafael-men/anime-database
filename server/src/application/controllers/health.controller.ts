import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

export const HEALTH_ROUTE = '/health';

/**
 * Liveness/readiness probe used by the Render health check and by the
 * post-deploy smoke test in CI. Deliberately free of any dependency on MySQL
 * or Redis: a failing probe must mean "this process is not serving", not
 * "some dependency is degraded", otherwise a transient DB hiccup would roll
 * the whole service.
 */
@Controller(HEALTH_ROUTE)
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
