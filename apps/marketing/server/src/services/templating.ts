/** Lightweight Mustache-like template engine. Supports {{var}} and {{var|default}}. */
export function renderTemplate(tpl: string, vars: Record<string, any>): string {
  return tpl.replace(/\{\{\s*([\w.]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_m, key, defaultVal) => {
    const value = key.split('.').reduce((acc: any, k: string) => acc?.[k], vars);
    if (value === undefined || value === null || value === '') {
      return defaultVal !== undefined ? String(defaultVal).trim() : '';
    }
    return String(value);
  });
}

/** Render the standard RTL Hebrew email wrapper around content HTML. */
export function rtlEmailWrap(subject: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 32px 16px;direction:rtl;text-align:right;color:#1a202c;line-height:1.6;font-size:16px;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;direction:rtl;text-align:right;">
              נשלח על-ידי מערכת השיווק.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
