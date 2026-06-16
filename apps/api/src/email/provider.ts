import nodemailer from 'nodemailer';
import { emailConfig, isZeptoMailConfigured, isSmtpConfigured } from './config';

export type Attachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  from?: { email: string; name: string };
  attachments?: Attachment[];
};

function createTransport() {
  if (isZeptoMailConfigured()) {
    return nodemailer.createTransport({
      host: emailConfig.zeptomail.host,
      port: emailConfig.zeptomail.port,
      secure: false,
      auth: {
        user: emailConfig.zeptomail.user,
        pass: emailConfig.zeptomail.pass,
      },
    });
  }
  if (isSmtpConfigured()) {
    const hasAuth = !!emailConfig.smtp.user && !!emailConfig.smtp.pass;
    return nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.port === 465,
      ...(hasAuth ? {
        auth: {
          user: emailConfig.smtp.user,
          pass: emailConfig.smtp.pass,
        },
      } : {}),
    });
  }
  throw new Error('No email provider configured — set ZeptoMail (ZEPTOMAIL_PASS) or SMTP (SMTP_HOST)');
}

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    transport = createTransport();
  }
  return transport;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const from = params.from ?? emailConfig.defaultFrom;
  const mail: Record<string, unknown> = {
    from: `"${from.name}" <${from.email}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  };
  if (params.attachments?.length) {
    mail.attachments = params.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    }));
  }
  await getTransport().sendMail(mail);
}

export function resetTransport(): void {
  if (transport) {
    transport.close();
    transport = null;
  }
}
