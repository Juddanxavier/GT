import nodemailer from 'nodemailer';
import type { Logger } from '../logger';

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  from?: { email: string; name: string };
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

type SendFn = (params: SendEmailParams, log: Logger) => Promise<void>;

// ZEPTOMAIL_API_KEY is for the HTTP API. If only ZEPTOMAIL_PASS is set, try it as the API key too.
const ZEPTOMAIL_API_KEY = process.env.ZEPTOMAIL_API_KEY || process.env.ZEPTOMAIL_PASS || '';
const ZEPTOMAIL_PASS = process.env.ZEPTOMAIL_PASS || '';
const ZEPTOMAIL_API_HOST = process.env.ZEPTOMAIL_API_HOST || 'api.zeptomail.com';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || 'noreply@gajantraders.com';
const DEFAULT_FROM_NAME = process.env.DEFAULT_FROM_NAME || 'Gajan Traders';

function createSendFn(log: Logger): SendFn {
  // 1. ZeptoMail HTTP API (no SMTP needed)
  if (ZEPTOMAIL_API_KEY) {
    log.info('email provider: ZeptoMail HTTP API');
    return async (params, log) => {
      const from = params.from ?? { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME };
      const body: Record<string, unknown> = {
        from: { address: from.email, name: from.name },
        to: [{ email_address: { address: params.to } }],
        subject: params.subject,
        htmlbody: params.html,
      };
      if (params.attachments?.length) {
        body.attachments = await Promise.all(params.attachments.map(async (a) => ({
          name: a.filename,
          content: a.content.toString('base64'),
        })));
      }
      const res = await fetch(`https://${ZEPTOMAIL_API_HOST}/v1.1/email`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Zoho-enczapikey ${ZEPTOMAIL_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        const errMsg = `ZeptoMail API ${res.status} from ${ZEPTOMAIL_API_HOST}: ${text || '(empty body)'}`;
        log.error({ status: res.status, body: text || '(empty body)' }, 'zeptomail http api error');
        throw new Error(errMsg);
      }
      log.info({ to: params.to, subject: params.subject }, 'email sent via http api');
    };
  }

  // 2. SMTP via Nodemailer (works with ZeptoMail SMTP, Gmail, SendGrid, etc.)
  let transport: nodemailer.Transporter | null = null;

  if (ZEPTOMAIL_PASS) {
    log.info('email provider: ZeptoMail SMTP transport');
    transport = nodemailer.createTransport({
      host: 'smtp.zeptomail.com',
      port: 587,
      secure: false,
      auth: { user: 'emailapikey', pass: ZEPTOMAIL_PASS },
      authMethod: 'LOGIN',
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
    });
  } else if (SMTP_HOST) {
    log.info('email provider: generic SMTP transport');
    const hasAuth = !!SMTP_USER && !!SMTP_PASS;
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      ...(hasAuth ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
      connectionTimeout: 10000,
    });
  }

  if (transport) {
    transport.verify((err) => {
      if (err) log.error({ err }, 'smtp verify failed');
      else log.info('smtp transport verified');
    });
    return async (params, log) => {
      const from = params.from ?? { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME };
      try {
        await transport!.sendMail({
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
        log.info({ to: params.to, subject: params.subject }, 'email sent via smtp');
      } catch (err) {
        log.error({ err, to: params.to }, 'smtp send failed');
        throw err;
      }
    };
  }

  const noop = async (_params: SendEmailParams, log: Logger) => {
    log.warn('no email provider configured, set ZEPTOMAIL_API_KEY, ZEPTOMAIL_PASS, or SMTP_HOST');
  };
  return noop;
}

let send: SendFn | null = null;

function getSend(log: Logger): SendFn {
  if (!send) send = createSendFn(log);
  return send;
}

export function getEmailProviderStatus() {
  return {
    configured: ZEPTOMAIL_API_KEY ? 'zeptomail-http' : ZEPTOMAIL_PASS ? 'zeptomail-smtp' : SMTP_HOST ? 'smtp' : null,
    zeptomailHttpApi: !!ZEPTOMAIL_API_KEY,
    zeptomailSmtp: !!ZEPTOMAIL_PASS,
    smtp: !!SMTP_HOST,
    from: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
  };
}

export async function sendEmail(params: SendEmailParams, log: Logger): Promise<void> {
  await getSend(log)(params, log);
}

export function closeTransport(): void {
  send = null;
}
