import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../use-cases/user/user.service';
import { SessionsService } from '../sessions/sessions.service';
import { PASSWORD_RESET_STORE } from '../../data/password-reset-store';
import type { PasswordResetStore } from '../../data/password-reset-store';
import { MailerService } from './mailer.service';

export const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

const DUMMY_HASH =
  '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7DKQ7CxSbLuKQpFWTVtL0KqXwOaZ9lS';

@Injectable()
export class PasswordResetService {
  private readonly resetBaseUrl: string;

  constructor(
    private readonly userService: UserService,
    private readonly sessionsService: SessionsService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
    @Inject(PASSWORD_RESET_STORE)
    private readonly store: PasswordResetStore,
  ) {
    const configured =
      this.config.get<string>('PASSWORD_RESET_BASE_URL') ??
      this.config.get<string>('FRONTEND_URLS') ??
      'http://localhost:4000';
    this.resetBaseUrl = configured.split(',')[0].trim().replace(/\/$/, '');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

 
  async requestReset(email: string): Promise<void> {
    const token = randomBytes(32).toString('base64url');

    let userId: string | null = null;
    let username: string | null = null;

    try {
      const user = await this.userService.findByEmail(email);
      userId = user.id;
      username = user.username;
    } catch {
    }

    if (userId && username) {
      await this.store.save(
        this.hashToken(token),
        { userId, username },
        PASSWORD_RESET_TTL_SECONDS,
      );
    }

    const link = `${this.resetBaseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;

    if (userId && username) {
      await this.mailer.sendPasswordReset(email, link);
    } else {
      await bcrypt.compare(token, DUMMY_HASH);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const payload = await this.store.consume(this.hashToken(token));

    if (!payload) {
      throw new BadRequestException('Token invalido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userService.setPasswordHash(payload.userId, passwordHash);
    await this.sessionsService.revokeAllForUser(payload.userId);
  }
}
