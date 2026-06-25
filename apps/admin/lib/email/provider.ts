import nodemailer from 'nodemailer';

type SendParams = {
  to: string;
  subject: string;
  html: string;
};

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (transport) return transport;

  const host = process.env.ZEPTOMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.ZEPTOMAIL_PORT || process.env.SMTP_PORT) || 587;
  const user = process.env.ZEPTOMAIL_USER || process.env.SMTP_USER || '';
  const pass = process.env.ZEPTOMAIL_PASS || process.env.SMTP_PASS || '';

  if (host && pass) {
    transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  return transport;
}

export async function sendEmail(params: SendParams): Promise<void> {
  const t = getTransport();

  const fromName = process.env.DEFAULT_FROM_NAME || 'Gajan Traders';
  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@gajantraders.com';

  if (t) {
    await t.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } else {
    console.log('[email] no transport configured, logging instead:', { to: params.to, subject: params.subject });
  }
}
