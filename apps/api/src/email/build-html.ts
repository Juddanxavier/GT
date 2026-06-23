const brandGreen = '#22c55e';

export type HtmlEmailContent = {
  title?: string;
  bodyHtml: string;
  footerText?: string;
  previewText?: string;
  companyName?: string;
};

export function buildEmailHtml(content: HtmlEmailContent): string {
  const company = content.companyName ?? 'Gajan Traders';
  const footer = content.footerText ?? `${company} — Automated Notification`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${content.previewText ? `<meta name="description" content="${escapeHtml(content.previewText)}">` : ''}
  </head>
  <body style="margin:0;padding:32px 16px;background:#f0f0f0;font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-size:13px;line-height:1.6;color:#18181b">
    <table role="presentation" style="width:100%;max-width:520px;margin:0 auto;border-spacing:0">
      <tr>
        <td style="background:${brandGreen};padding:28px;border-radius:6px 6px 0 0">
          <table role="presentation" style="width:100%">
            <tr>
              <td style="vertical-align:middle;font-size:15px;font-weight:700;color:#fff;letter-spacing:-0.2px">
                ${escapeHtml(company)}
              </td>
              <td style="vertical-align:middle;text-align:right;font-size:10px;color:rgba(255,255,255,0.7);letter-spacing:0.5px;text-transform:uppercase">
                ${content.title ? escapeHtml(content.title) : 'Notification'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;padding:24px 28px">
          ${content.bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="background:#fff;border-radius:0 0 6px 6px;padding:16px 28px;border-top:1px solid #e4e4e7;font-size:10px;color:#a1a1aa;text-align:center;letter-spacing:0.2px">
          ${escapeHtml(footer)}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
