import { ConfigService } from '@nestjs/config';
import { MailerService } from '../../src/application/auth/mailer.service';

type Env = { [key: string]: string | undefined };

function build(env: Env): MailerService {
  const config = {
    get: (key: string, fallback?: unknown) =>
      env[key] !== undefined ? env[key] : fallback,
  } as unknown as ConfigService;

  return new MailerService(config);
}

function loggerOf(service: MailerService): {
  warn: jest.SpyInstance;
  error: jest.SpyInstance;
} {
  const logger = (
    service as unknown as {
      logger: {
        warn: (...a: unknown[]) => void;
        error: (...a: unknown[]) => void;
      };
    }
  ).logger;
  return {
    warn: jest.spyOn(logger, 'warn').mockImplementation(() => undefined),
    error: jest.spyOn(logger, 'error').mockImplementation(() => undefined),
  };
}

function setTransporter(service: MailerService, sendMail: () => Promise<void>) {
  (
    service as unknown as { transporter: { sendMail: () => Promise<void> } }
  ).transporter = {
    sendMail,
  };
}

describe('MailerService', () => {
  it('nao envia e registra o link quando MAIL_HOST nao esta definido', async () => {
    const service = build({ MAIL_HOST: undefined, MAIL_FROM: 'x@y.com' });
    const logger = loggerOf(service);
    logger.warn.mockImplementation(() => undefined);

    expect(service.enabled).toBe(false);
    await expect(
      service.sendPasswordReset('rafa@gmail.com', 'http://localhost:4000/link'),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:4000/link'),
    );
  });

  /**
   * Regressao real: com o SMTP inacessivel, o erro de conexao escapava do
   * service e o endpoint respondia 500. O token ja foi salvo nesse ponto, entao
   * falha de envio nao pode virar erro do request.
   */
  it('nao propaga erro de SMTP quando o envio falha', async () => {
    const service = build({
      MAIL_HOST: 'smtp.invalido.local',
      MAIL_PORT: '587',
      MAIL_USER: 'user',
      MAIL_PASS: 'pass',
      MAIL_FROM: 'x@y.com',
    });
    const logger = loggerOf(service);
    logger.error.mockImplementation(() => undefined);

    setTransporter(service, () =>
      Promise.reject(new Error('connect ETIMEDOUT 10.0.0.1:587')),
    );

    await expect(
      service.sendPasswordReset('rafa@gmail.com', 'http://localhost:4000/link'),
    ).resolves.toBeUndefined();

    // O link precisa ficar registrado para envio manual.
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:4000/link'),
    );
  });

  it('nao propaga erro mesmo com SMTP sem resposta', async () => {
    const service = build({
      MAIL_HOST: 'smtp.invalido.local',
      MAIL_PORT: '587',
      MAIL_FROM: 'x@y.com',
    });
    const logger = loggerOf(service);
    logger.error.mockImplementation(() => undefined);

    setTransporter(service, () =>
      Promise.reject(new Error('SMTP sem resposta')),
    );

    await expect(
      service.sendPasswordReset('rafa@gmail.com', 'http://localhost:4000/link'),
    ).resolves.toBeUndefined();
  });
});
