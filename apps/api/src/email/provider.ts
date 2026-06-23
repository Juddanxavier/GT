import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { emailConfig, isResendConfigured, isSmtpConfigured, isZeptoMailConfigured } from './config';

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

type SendFn = (params: SendEmailParams) => Promise<void>;

function createNodemailerTransport() {
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
  return null;
}

function createSendFn(): SendFn {
  // 1. ZeptoMail via Nodemailer (primary)
  if (isZeptoMailConfigured()) {
    const transport = createNodemailerTransport()!;
    let transportRef: nodemailer.Transporter | null = transport;
    return async (params) => {
      const from = params.from ?? emailConfig.defaultFrom;
      await transportRef!.sendMail({
        from: `"${from.name}" <${from.email}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
    };
  }

  // 2. Resend (fallback)
  if (isResendConfigured()) {
    const resend = new Resend(emailConfig.resend.apiKey);
    return async (params) => {
      const from = params.from ?? emailConfig.defaultFrom;
      await resend.emails.send({
        from: `${from.name} <${from.email}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
      });
    };
  }

  // 3. SMTP via Nodemailer (dev fallback)
  const transport = createNodemailerTransport()!;
  let transportRef: nodemailer.Transporter | null = transport;
  return async (params) => {
    const from = params.from ?? emailConfig.defaultFrom;
    await transportRef!.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  };
}

let send: SendFn | null = null;

function getSend(): SendFn {
  if (!send) {
    send = createSendFn();
  }
  return send;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  await getSend()(params);
}

export function closeTransport(): void {
  send = null;
}

export function resetTransport(): void {
  closeTransport();
}
