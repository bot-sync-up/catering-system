import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) sgMail.setApiKey(apiKey);

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailOpts {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

/**
 * Send an email via SendGrid. Attachments are base64-encoded before sending.
 */
export async function sendEmail(opts: EmailOpts): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey) {
    console.warn('[email] SENDGRID_API_KEY not set, skipping send', opts.subject);
    return { ok: false, error: 'no_api_key' };
  }
  const from = process.env.SENDGRID_FROM || 'reports@example.com';
  try {
    await sgMail.send({
      to: opts.to,
      from,
      subject: opts.subject,
      text: opts.text ?? opts.subject,
      html: opts.html,
      attachments: (opts.attachments ?? []).map(a => ({
        filename: a.filename,
        content: a.content.toString('base64'),
        type: a.contentType,
        disposition: 'attachment',
      })),
    });
    return { ok: true };
  } catch (err: any) {
    console.error('[email] send failed', err);
    return { ok: false, error: err.message ?? String(err) };
  }
}
