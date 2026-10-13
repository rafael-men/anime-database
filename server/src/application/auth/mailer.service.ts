import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST')?.trim();

    this.transporter = host
      ? createTransport({
          host,
          port: Number(this.config.get('MAIL_PORT', 587)),
          secure: this.config.get('MAIL_SECURE') === 'true',
          auth: this.config.get<string>('MAIL_USER')
            ? {
                user: this.config.get<string>('MAIL_USER'),
                pass: this.config.get<string>('MAIL_PASS'),
              }
            : undefined,
        })
      : null;
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  async sendPasswordReset(email: string, link: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `MAIL_HOST nao configurado; e-mail nao enviado. Link para ${email}: ${link}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_FROM', 'nao-responda@anidb.local'),
        to: email,
        subject: 'Recuperacao de senha',
        text: [
          'Para redefinir sua senha, abra o link abaixo (valido por 60 minutos):',
          '',
          link,
          '',
          'Se voce nao pediu isso, ignore este e-mail: nada sera alterado.',
        ].join('\n'),
      });
    } catch (error) {
      // Falha de SMTP nao pode derrubar o endpoint: o token ja foi salvo e o
      // usuario so precisa receber o link. Logamos e caimos no fallback do log.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao enviar e-mail de recuperacao para ${email}: ${message}. ` +
          `Link para enviar manualmente: ${link}`,
      );
    }
  }
}
