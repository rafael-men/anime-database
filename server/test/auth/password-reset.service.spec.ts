import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PasswordResetService } from '../../src/application/auth/password-reset.service';
import { MailerService } from '../../src/application/auth/mailer.service';
import { SessionsService } from '../../src/application/sessions/sessions.service';
import { UserService } from '../../src/use-cases/user/user.service';
import { InMemoryPasswordResetStore } from '../../src/data/password-reset-store';
import { ResourceNotFoundException } from '../../src/use-cases/exceptions/resource-not-found.exception';

describe('PasswordResetService', () => {
  let realHash: string;
  let store: InMemoryPasswordResetStore;
  let service: PasswordResetService;

  const userServiceMock = {
    findByEmail: jest.fn(),
    setPasswordHash: jest.fn(),
  };

  const sessionsServiceMock = {
    revokeAllForUser: jest.fn(),
  };

  const mailerMock = {
    sendPasswordReset: jest.fn(),
  };

  const configMock = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URLS')
        return 'http://localhost:4000,http://127.0.0.1:4000';
      if (key === 'PASSWORD_RESET_BASE_URL') return undefined;
      return undefined;
    }),
  };

  function buildService(): PasswordResetService {
    return new PasswordResetService(
      userServiceMock as unknown as UserService,
      sessionsServiceMock as unknown as SessionsService,
      mailerMock as unknown as MailerService,
      configMock as unknown as ConfigService,
      store,
    );
  }

  beforeEach(async () => {
    // Custo 4 para manter o teste rapido; a producao usa 12.
    realHash = await bcrypt.hash('senha-antiga', 4);
    store = new InMemoryPasswordResetStore();
    service = buildService();
    jest.clearAllMocks();
    sessionsServiceMock.revokeAllForUser.mockResolvedValue(undefined);
    mailerMock.sendPasswordReset.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await store.close();
  });

  /** Extrai o token do link enviado, como o cliente faria ao clicar. */
  function extractToken(link: string): string {
    const match = /token=([^&]+)/.exec(link);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function lastLink(): string {
    const calls = mailerMock.sendPasswordReset.mock.calls;
    return calls[calls.length - 1][1] as string;
  }

  describe('requestReset', () => {
    it('envia o link quando o e-mail existe', async () => {
      userServiceMock.findByEmail.mockResolvedValue({
        id: 'u1',
        username: 'rafael',
        passwordHash: realHash,
      });

      await service.requestReset('rafael@test.com');

      expect(mailerMock.sendPasswordReset).toHaveBeenCalledTimes(1);
      expect(mailerMock.sendPasswordReset.mock.calls[0][0]).toBe(
        'rafael@test.com',
      );
      expect(lastLink()).toContain('/redefinir-senha?token=');
      expect(lastLink()).toContain('http://localhost:4000');
    });

    it('nao revela que o e-mail nao existe e nao envia nada', async () => {
      userServiceMock.findByEmail.mockRejectedValue(
        new ResourceNotFoundException('nao encontrado', 'USER_NOT_FOUND'),
      );

      await expect(
        service.requestReset('ninguem@test.com'),
      ).resolves.toBeUndefined();

      expect(mailerMock.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('gera tokens diferentes a cada requisicao', async () => {
      userServiceMock.findByEmail.mockResolvedValue({
        id: 'u1',
        username: 'rafael',
        passwordHash: realHash,
      });

      await service.requestReset('rafael@test.com');
      const first = extractToken(lastLink());
      await service.requestReset('rafael@test.com');
      const second = extractToken(lastLink());

      expect(first).not.toEqual(second);
      expect(first.length).toBeGreaterThanOrEqual(43);
    });

    it('nunca envia o hash do token no link', async () => {
      userServiceMock.findByEmail.mockResolvedValue({
        id: 'u1',
        username: 'rafael',
        passwordHash: realHash,
      });

      await service.requestReset('rafael@test.com');

      expect(lastLink()).not.toMatch(/[a-f0-9]{64}/);
    });
  });

  describe('resetPassword', () => {
    async function requestValidToken(): Promise<string> {
      userServiceMock.findByEmail.mockResolvedValue({
        id: 'u1',
        username: 'rafael',
        passwordHash: realHash,
      });
      await service.requestReset('rafael@test.com');
      return extractToken(lastLink());
    }

    it('troca a senha e devolve um hash bcrypt valido', async () => {
      const token = await requestValidToken();

      await service.resetPassword(token, 'nova-senha-123');

      expect(userServiceMock.setPasswordHash).toHaveBeenCalledTimes(1);
      const [userId, hash] = userServiceMock.setPasswordHash.mock.calls[0];
      expect(userId).toBe('u1');
      expect(hash).not.toBe('nova-senha-123');
      const matches = await bcrypt.compare('nova-senha-123', hash as string);
      expect(matches).toBe(true);
    });

    it('revoga todas as sessoes do usuario', async () => {
      const token = await requestValidToken();

      await service.resetPassword(token, 'nova-senha-123');

      expect(sessionsServiceMock.revokeAllForUser).toHaveBeenCalledWith('u1');
    });

    it('rejeita token invalido sem alterar a senha', async () => {
      await expect(
        service.resetPassword('token-que-nao-existe', 'nova-senha-123'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(userServiceMock.setPasswordHash).not.toHaveBeenCalled();
      expect(sessionsServiceMock.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('token e de uso unico', async () => {
      const token = await requestValidToken();

      await service.resetPassword(token, 'primeira-senha-123');
      await expect(
        service.resetPassword(token, 'segunda-senha-123'),
      ).rejects.toBeInstanceOf(BadRequestException);

      // A segunda tentativa nao pode sobrescrever a senha.
      expect(userServiceMock.setPasswordHash).toHaveBeenCalledTimes(1);
    });

    it('nao consome o token quando a troca falha', async () => {
      const token = await requestValidToken();
      userServiceMock.setPasswordHash.mockRejectedValueOnce(
        new Error('db down'),
      );

      await expect(
        service.resetPassword(token, 'nova-senha-123'),
      ).rejects.toThrow('db down');

      userServiceMock.setPasswordHash.mockResolvedValue(undefined);
      await expect(
        service.resetPassword(token, 'nova-senha-123'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
