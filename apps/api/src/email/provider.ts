import nodemailer from 'nodemailer';

const emailConfig = {
  zeptomail: {
    host: process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.com',
    port: Number(process.env.ZEPTOMAIL_PORT) || 587,
    user: process.env.ZEPTOMAIL_USER || 'emailapikey',
    pass: process.env.ZEPTOMAIL_PASS || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  defaultFrom: {
    email: process.env.DEFAULT_FROM_EMAIL || 'noreply@gajantraders.com',
    name: process.env.DEFAULT_FROM_NAME || 'Gajan Traders',
  },
};

function isZeptoMailConfigured(): boolean {
  return !!emailConfig.zeptomail.pass;
}
function isSmtpConfigured(): boolean {
  return !!emailConfig.smtp.host;
}

export type Branding = {
  logoUrl?: string;
  primaryColor?: string;
  companyName?: string;
};

export type ShipmentData = {
  trackingNo: string;
  labelCode?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  estimatedDelivery?: string;
  customerName?: string;
  status: string;
};

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

function createTransport() {
  if (isZeptoMailConfigured()) {
    return nodemailer.createTransport({
      host: emailConfig.zeptomail.host,
      port: emailConfig.zeptomail.port,
      secure: false,
      auth: { user: emailConfig.zeptomail.user, pass: emailConfig.zeptomail.pass },
    });
  }
  if (isSmtpConfigured()) {
    const hasAuth = !!emailConfig.smtp.user && !!emailConfig.smtp.pass;
    return nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.port === 465,
      ...(hasAuth ? { auth: { user: emailConfig.smtp.user, pass: emailConfig.smtp.pass } } : {}),
    });
  }
  return null;
}

function createSendFn(): SendFn {
  const transport = createTransport();
  if (!transport) {
    const noop = async (_params: SendEmailParams) => {
      console.warn('[email] No email provider configured — email not sent. Set ZEPTOMAIL_PASS or SMTP_HOST.');
    };
    return noop;
  }
  return async (params) => {
    const from = params.from ?? emailConfig.defaultFrom;
    await transport.sendMail({
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
  if (!send) send = createSendFn();
  return send;
}

export function getEmailProviderStatus() {
  return {
    configured: isZeptoMailConfigured() ? 'zeptomail' : isSmtpConfigured() ? 'smtp' : null,
    zeptomail: !!emailConfig.zeptomail.pass,
    smtp: !!emailConfig.smtp.host,
    from: emailConfig.defaultFrom,
  };
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  await getSend()(params);
}

export function closeTransport(): void {
  send = null;
}
