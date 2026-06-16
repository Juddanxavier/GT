export const emailConfig = {
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

export function isZeptoMailConfigured(): boolean {
  return !!emailConfig.zeptomail.pass;
}

export function isSmtpConfigured(): boolean {
  return !!emailConfig.smtp.host;
}
