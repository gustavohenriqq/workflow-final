import { Injectable, Logger } from '@nestjs/common';

/**
 * EmailService — envia notificações por e-mail via SMTP.
 * Configure SMTP_* no .env para ativar. Sem config, apenas loga.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any = null;

  async onModuleInit() {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn('SMTP não configurado — notificações por e-mail desativadas.');
      return;
    }
    try {
      const nodemailer = await import('nodemailer');
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await this.transporter.verify();
      this.logger.log(`E-mail SMTP conectado: ${host}`);
    } catch (e) {
      this.logger.warn(`SMTP falhou: ${e.message} — e-mails desativados.`);
      this.transporter = null;
    }
  }

  async sendApprovalRequest(to: string, data: {
    instanceTitle: string;
    workflowName: string;
    stepName: string;
    requesterName: string;
    inboxUrl: string;
    slaHours?: number;
  }) {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'workflow@empresa.com',
        to,
        subject: `[Workflow] Aprovação necessária: ${data.instanceTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #111;">Aprovação necessária</h2>
            <p>Olá,</p>
            <p>Você tem uma aprovação pendente no workflow <strong>${data.workflowName}</strong>.</p>
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <tr><td style="padding:8px; color:#666;">Processo:</td><td style="padding:8px;"><strong>${data.instanceTitle}</strong></td></tr>
              <tr><td style="padding:8px; color:#666;">Etapa:</td><td style="padding:8px;">${data.stepName}</td></tr>
              <tr><td style="padding:8px; color:#666;">Solicitado por:</td><td style="padding:8px;">${data.requesterName}</td></tr>
              ${data.slaHours ? `<tr><td style="padding:8px; color:#666;">SLA:</td><td style="padding:8px; color:#d97706;">${data.slaHours}h</td></tr>` : ''}
            </table>
            <a href="${data.inboxUrl}" style="display:inline-block; background:#111; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none;">
              Ver e decidir
            </a>
          </div>
        `,
      });
      this.logger.debug(`E-mail enviado para ${to}`);
    } catch (e) {
      this.logger.error(`Falha ao enviar e-mail: ${e.message}`);
    }
  }

  async sendDecisionNotification(to: string, data: {
    instanceTitle: string;
    action: string;
    actorName: string;
    comment?: string;
  }) {
    if (!this.transporter) return;
    const actionLabel = data.action === 'APPROVE' ? 'aprovado' : 'rejeitado';
    const color = data.action === 'APPROVE' ? '#16a34a' : '#dc2626';
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'workflow@empresa.com',
        to,
        subject: `[Workflow] ${data.instanceTitle} foi ${actionLabel}`,
        html: `
          <div style="font-family:sans-serif; max-width:600px; margin:0 auto;">
            <h2 style="color:${color};">Processo ${actionLabel}</h2>
            <p><strong>${data.instanceTitle}</strong> foi <strong style="color:${color};">${actionLabel}</strong> por ${data.actorName}.</p>
            ${data.comment ? `<p style="color:#666;font-style:italic;">"${data.comment}"</p>` : ''}
          </div>
        `,
      });
    } catch (e) {
      this.logger.error(`Falha ao enviar e-mail: ${e.message}`);
    }
  }
}
