import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_TTL_MS,
  createConsentDecision,
  parseConsent,
  serializeConsent,
  toConsentStatus,
} from '../../data/consent';
import type { ConsentStatus } from '../../data/consent';
import { ConsentDecisionDto } from '../controllers/dto/consent.dto';
import {
  buildCookieOptions,
  resolveCookieSecurity,
} from '../../utils/cookie-security';
import type { CookieSecuritySettings } from '../../utils/cookie-security';

interface ConsentRequest {
  cookies?: Record<string, string>;
}

@Controller('consent')
export class ConsentController {
  private readonly cookieSecurity: CookieSecuritySettings;

  constructor(config: ConfigService) {
    this.cookieSecurity = resolveCookieSecurity(config);
  }

  @Get()
  getConsent(@Req() req: ConsentRequest): ConsentStatus {
    return toConsentStatus(parseConsent(req.cookies?.[CONSENT_COOKIE_NAME]));
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  saveConsent(
    @Body() body: ConsentDecisionDto,
    @Res({ passthrough: true }) res: Response,
  ): ConsentStatus {
    const decision = createConsentDecision({
      analytics: body.analytics ?? false,
      marketing: body.marketing ?? false,
    });

    res.cookie(
      CONSENT_COOKIE_NAME,
      serializeConsent(decision),
      buildCookieOptions(this.cookieSecurity, CONSENT_TTL_MS, {
        httpOnly: true,
      }),
    );

    return toConsentStatus(decision);
  }
}
